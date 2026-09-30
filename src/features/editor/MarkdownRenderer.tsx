import { useEffect, useMemo } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { NoteAssets } from '@/domain/notes/note'
import { isImageDataUrl } from './clipboardImages'
import { assetIdFromUrl, createAssetObjectUrls, isAssetUrl, revokeAssetObjectUrls } from './imageAssets'

type MarkdownRendererProps = {
  markdown: string
  assets?: NoteAssets
}

const remarkPlugins = [remarkGfm]
const noAssets: NoteAssets = {}

export default function MarkdownRenderer({ markdown, assets = noAssets }: MarkdownRendererProps) {
  // The browser keeps the bytes; the DOM only gets a short blob: URL.
  const assetUrls = useMemo(() => createAssetObjectUrls(assets), [assets])

  useEffect(() => () => revokeAssetObjectUrls(assetUrls), [assetUrls])

  const urlTransform = useMemo(() => (url: string, key: string) => {
    if (key !== 'src') return defaultUrlTransform(url)
    if (isAssetUrl(url)) return assetUrls.get(assetIdFromUrl(url)) ?? ''
    // Notes written before assets existed still carry inline data URLs.
    if (isImageDataUrl(url)) return url

    return defaultUrlTransform(url)
  }, [assetUrls])

  return <ReactMarkdown remarkPlugins={remarkPlugins} urlTransform={urlTransform}>{markdown || ' '}</ReactMarkdown>
}
