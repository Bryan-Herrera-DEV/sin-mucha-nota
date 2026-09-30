import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { COMPRESS_OVER_BYTES } from '@/features/editor/imageCompression'

type Encoded = { width: number; height: number; type: string; quality: number }

const encoded: Encoded[] = []
// Encoded size shrinks with pixels and quality, like a real lossy encoder.
const encodedSize = (width: number, height: number, quality: number) => Math.round(width * height * quality * 0.9)
// The 1x1 probe that detects WebP support is not part of the compression loop.
const attempts = () => encoded.filter((entry) => entry.width > 1)

function stubCanvas(supportsWebp = true) {
  encoded.length = 0
  vi.stubGlobal('OffscreenCanvas', class {
    constructor(public width: number, public height: number) {}
    getContext() { return { drawImage: () => {} } }
    convertToBlob({ type, quality }: { type: string; quality: number }) {
      const mimeType = type === 'image/webp' && !supportsWebp ? 'image/png' : type
      encoded.push({ width: this.width, height: this.height, type: mimeType, quality })
      return Promise.resolve(new Blob([new Uint8Array(encodedSize(this.width, this.height, quality))], { type: mimeType }))
    }
  })
  vi.stubGlobal('createImageBitmap', () => Promise.resolve({ width: 6000, height: 4000, close: () => {} }))
}

// The WebP probe is cached per module load, so each test starts from a clean one.
async function loadPrepareImage() {
  vi.resetModules()
  return (await import('@/features/editor/imageCompression')).prepareImage
}

function oversizedFile(type = 'image/png') {
  const file = new File(['x'], 'grande.png', { type })
  Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 })
  return file
}

beforeEach(() => stubCanvas())
afterEach(() => vi.unstubAllGlobals())

it('leaves images under the threshold untouched', async () => {
  const prepareImage = await loadPrepareImage()
  const file = new File(['small'], 'small.png', { type: 'image/png' })
  expect(await prepareImage(file)).toEqual({ blob: file, mimeType: 'image/png', compressed: false })
  expect(encoded).toHaveLength(0)
})

it('compresses an image over 8 MB by capping its size and then lowering quality', async () => {
  const prepareImage = await loadPrepareImage()
  const file = oversizedFile()
  expect(file.size).toBeGreaterThan(COMPRESS_OVER_BYTES)
  const prepared = await prepareImage(file)
  expect(prepared.compressed).toBe(true)
  expect(prepared.blob.size).toBeLessThan(file.size)
  expect(prepared.mimeType).toBe('image/webp')
  expect(attempts()[0]).toMatchObject({ width: 4096, height: 2731, type: 'image/webp' })
  expect(attempts().at(-1)!.quality).toBeLessThan(attempts()[0].quality)
})

it('falls back to JPEG when the browser cannot encode WebP', async () => {
  stubCanvas(false)
  const prepareImage = await loadPrepareImage()
  expect((await prepareImage(oversizedFile())).mimeType).toBe('image/jpeg')
})

it('never re-encodes animated or vector images', async () => {
  const prepareImage = await loadPrepareImage()
  const gif = oversizedFile('image/gif')
  expect(await prepareImage(gif)).toEqual({ blob: gif, mimeType: 'image/gif', compressed: false })
  expect(encoded).toHaveLength(0)
})

it('keeps the original when the browser cannot decode the image', async () => {
  vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('unsupported')))
  vi.stubGlobal('Image', class { onerror = () => {}; set src(_value: string) { queueMicrotask(() => this.onerror()) } })
  const prepareImage = await loadPrepareImage()
  const file = oversizedFile()
  expect((await prepareImage(file)).blob).toBe(file)
})

it('re-encodes any size on request, for formats Markdown cannot display', async () => {
  const prepareImage = await loadPrepareImage()
  const prepared = await prepareImage(new File(['x'], 'foto.heic', { type: 'image/heic' }), 0)
  expect(prepared.compressed).toBe(true)
  expect(prepared.mimeType).toBe('image/webp')
})
