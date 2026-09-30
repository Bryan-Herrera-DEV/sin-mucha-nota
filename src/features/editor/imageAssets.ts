import type { NoteAssets, NoteImageAsset } from '@/domain/notes/note'
import { nowIso } from '@/domain/shared/valueObjects'

// The Markdown only carries `asset:<id>`; the bytes live in the browser file
// storage next to the note, so the editor never holds a multi-megabyte string.
export const ASSET_SCHEME = 'asset:'
const ASSET_ID = /^[a-z\d]{8,64}$/i
const ASSET_REFERENCE = /!\[[^\]]*\]\(\s*asset:([a-z\d]{8,64})[^)]*\)/gi

export function createAssetId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function isAssetUrl(url: string): boolean {
  return url.toLowerCase().startsWith(ASSET_SCHEME) && ASSET_ID.test(url.slice(ASSET_SCHEME.length))
}

export function assetUrl(id: string): string {
  return `${ASSET_SCHEME}${id}`
}

export function assetIdFromUrl(url: string): string {
  return url.slice(ASSET_SCHEME.length)
}

export function imageMarkdown(name: string, url: string): string {
  const alt = name.replace(/\.[^.]+$/, '').replace(/[\\[\]\r\n]/g, ' ').trim() || 'Imagen'

  return `![${alt}](${url})`
}

export function collectReferencedAssetIds(markdown: string): Set<string> {
  const ids = new Set<string>()

  for (const match of markdown.matchAll(ASSET_REFERENCE)) {
    ids.add(match[1])
  }

  return ids
}

export function removeAssetReferences(markdown: string, assetId: string): string {
  // An image on a line of its own takes the whole line; an inline one leaves the text.
  const wholeLine = new RegExp(String.raw`^[ \t]*!\[[^\]]*\]\(\s*asset:${assetId}[^)]*\)[ \t]*$\n?`, 'gim')
  const inline = new RegExp(String.raw`!\[[^\]]*\]\(\s*asset:${assetId}[^)]*\)`, 'gi')

  return markdown.replace(wholeLine, '').replace(inline, '').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '')
}

// Images removed from the text must not keep filling the browser storage quota.
export function pruneUnreferencedAssets(markdown: string, assets: NoteAssets): NoteAssets {
  const referenced = collectReferencedAssetIds(markdown)
  const entries = Object.entries(assets).filter(([id]) => referenced.has(id))

  return entries.length === Object.keys(assets).length ? assets : Object.fromEntries(entries)
}

export function normalizeNoteAssets(value: unknown): NoteAssets {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const assets: NoteAssets = {}

  for (const [id, asset] of Object.entries(value as Record<string, unknown>)) {
    if (!ASSET_ID.test(id) || asset === null || typeof asset !== 'object') continue
    const candidate = asset as Partial<NoteImageAsset>
    if (typeof candidate.dataUrl !== 'string' || !candidate.dataUrl.startsWith('data:image/')) continue

    assets[id] = {
      id,
      name: typeof candidate.name === 'string' ? candidate.name : 'imagen',
      mimeType: typeof candidate.mimeType === 'string' ? candidate.mimeType : 'image/png',
      byteSize: typeof candidate.byteSize === 'number' ? candidate.byteSize : 0,
      createdAt: candidate.createdAt ?? nowIso(),
      dataUrl: candidate.dataUrl,
    }
  }

  return assets
}

export function createNoteAsset(input: { name: string; mimeType: string; byteSize: number; dataUrl: string }): NoteImageAsset {
  return {
    id: createAssetId(),
    name: input.name,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    createdAt: nowIso(),
    dataUrl: input.dataUrl,
  }
}

const INLINE_IMAGE = /!\[([^\]]*)\]\(\s*(data:image\/[a-z+]+;base64,[a-z\d+/=]+)\s*\)/gi

// Notes written before this change carry the bytes inline. Moving them into the
// asset file keeps the text readable without touching what the note shows.
export function extractInlineImages(markdown: string, assets: NoteAssets): { markdown: string; assets: NoteAssets } | null {
  if (!INLINE_IMAGE.test(markdown)) return null

  INLINE_IMAGE.lastIndex = 0
  const extracted: NoteAssets = { ...assets }
  const nextMarkdown = markdown.replace(INLINE_IMAGE, (_match, alt: string, dataUrl: string) => {
    const asset = createNoteAsset({
      name: alt.trim() || 'imagen',
      mimeType: /^data:([^;]+)/.exec(dataUrl)?.[1] ?? 'image/png',
      byteSize: Math.floor((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75),
      dataUrl,
    })

    extracted[asset.id] = asset

    return `![${alt}](${assetUrl(asset.id)})`
  })

  return { markdown: nextMarkdown, assets: extracted }
}

export function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(blob)
  })
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload = ''] = dataUrl.split(',', 2)
  const mimeType = /^data:([^;,]+)/.exec(header)?.[1] ?? 'image/png'

  if (!/;base64$/i.test(header)) {
    return new Blob([decodeURIComponent(payload)], { type: mimeType })
  }

  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

// Object URLs render straight from the browser's blob store: no megabyte-long
// `src` attributes in the DOM and no base64 decoding on every render.
export function createAssetObjectUrls(assets: NoteAssets): Map<string, string> {
  const urls = new Map<string, string>()

  if (typeof URL.createObjectURL !== 'function') {
    for (const asset of Object.values(assets)) urls.set(asset.id, asset.dataUrl)

    return urls
  }

  for (const asset of Object.values(assets)) {
    try {
      urls.set(asset.id, URL.createObjectURL(dataUrlToBlob(asset.dataUrl)))
    } catch {
      urls.set(asset.id, asset.dataUrl)
    }
  }

  return urls
}

export function revokeAssetObjectUrls(urls: Map<string, string>): void {
  if (typeof URL.revokeObjectURL !== 'function') return

  for (const url of urls.values()) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
