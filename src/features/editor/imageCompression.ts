// Client-side downscale + re-encode loop, the same approach published by
// browser-image-compression: decode once, then shrink quality and finally the
// canvas until the encoded blob fits the target. No server, no dependencies.

export const COMPRESS_OVER_BYTES = 8 * 1024 * 1024
export const COMPRESSION_TARGET_BYTES = 4 * 1024 * 1024
export const MAX_STORED_BYTES = 16 * 1024 * 1024
const MAX_EDGE = 4096
const MAX_ATTEMPTS = 8
const MIN_QUALITY = 0.4
const MIN_EDGE = 640

// Animation and vector data do not survive a canvas round trip.
const LOSSLESS_MIME = /^image\/(gif|svg\+xml|apng)$/i

export type PreparedImage = {
  blob: Blob
  mimeType: string
  compressed: boolean
}

// `compressOverBytes` of 0 forces a re-encode whatever the size, which is how
// formats Markdown cannot display are converted into something renderable.
export async function prepareImage(file: File, compressOverBytes = COMPRESS_OVER_BYTES): Promise<PreparedImage> {
  const mimeType = file.type || 'image/png'
  const original = { blob: file, mimeType, compressed: false }
  const forced = compressOverBytes <= 0

  if (LOSSLESS_MIME.test(mimeType) || (!forced && file.size <= compressOverBytes)) {
    return original
  }

  const compressed = await compressImage(file, COMPRESSION_TARGET_BYTES)

  if (!compressed || (!forced && compressed.blob.size >= file.size)) {
    return original
  }

  return compressed
}

async function compressImage(file: File, targetBytes: number): Promise<PreparedImage | null> {
  const source = await decodeImage(file)

  if (!source) {
    return null
  }

  const outputMimeType = await pickOutputMimeType()
  let best: Blob | null = null

  try {
    let edge = Math.min(MAX_EDGE, Math.max(source.width, source.height))
    let quality = 0.82

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const scale = edge / Math.max(source.width, source.height)
      const blob = await encode(source, Math.max(1, Math.round(source.width * scale)), Math.max(1, Math.round(source.height * scale)), outputMimeType, quality)

      if (!blob) {
        return null
      }

      if (!best || blob.size < best.size) {
        best = blob
      }

      if (blob.size <= targetBytes) {
        break
      }

      if (quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality - 0.14)
      } else if (edge > MIN_EDGE) {
        edge = Math.max(MIN_EDGE, Math.round(edge * 0.75))
      } else {
        break
      }
    }
  } finally {
    if ('close' in source && typeof source.close === 'function') {
      source.close()
    }
  }

  return best ? { blob: best, mimeType: outputMimeType, compressed: true } : null
}

type DecodedImage = { width: number; height: number; close?: () => void } & CanvasImageSource

async function decodeImage(file: File): Promise<DecodedImage | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      return (await createImageBitmap(file)) as DecodedImage
    }
  } catch {
    // Some browsers refuse odd color profiles; the <img> path still handles them.
  }

  if (typeof Image !== 'function' || typeof URL.createObjectURL !== 'function') {
    return null
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => resolve(null)
      element.src = objectUrl
    })

    if (!image?.naturalWidth) {
      return null
    }

    return Object.assign(image, { width: image.naturalWidth, height: image.naturalHeight }) as unknown as DecodedImage
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function encode(source: CanvasImageSource, width: number, height: number, mimeType: string, quality: number): Promise<Blob | null> {
  if (typeof OffscreenCanvas === 'function') {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')

    if (!context) {
      return null
    }

    context.drawImage(source, 0, 0, width, height)

    return canvas.convertToBlob({ type: mimeType, quality })
  }

  if (typeof document === 'undefined') {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context || typeof canvas.toBlob !== 'function') {
    return null
  }

  context.drawImage(source, 0, 0, width, height)

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), mimeType, quality))
}

let outputMimeType: Promise<string> | null = null

function pickOutputMimeType(): Promise<string> {
  // WebP keeps transparency and is far smaller than JPEG at the same quality.
  outputMimeType ??= (async () => {
    try {
      const probe = await encode(createProbeCanvas(), 1, 1, 'image/webp', 0.8)

      return probe?.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
    } catch {
      return 'image/jpeg'
    }
  })()

  return outputMimeType
}

function createProbeCanvas(): CanvasImageSource {
  if (typeof OffscreenCanvas === 'function') {
    return new OffscreenCanvas(1, 1)
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1

  return canvas
}
