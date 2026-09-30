const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|avif|bmp|svg|heic|heif|tiff?|ico)$/i
const RENDERABLE_MIME = /^image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)$/i
const REMOTE_IMAGE_URL = /^https?:\/\/\S+$/i

// Chrome, Firefox and Safari disagree on where a pasted image shows up, and some
// sources hand over a File with an empty `type`. Accepting only a fixed MIME list
// silently dropped those pastes, which is why pasting looked broken.
export function getClipboardImages(data: DataTransfer | null): File[] {
  if (!data) return []

  // `files` and `items` describe the SAME clipboard payload, so they must never be
  // combined: `getAsFile()` mints a fresh File on every call, with its own
  // `lastModified`, so the duplicate is impossible to detect and gets pasted twice.
  const files = safeList(() => Array.from(data.files)).filter(isImageFile)

  if (files.length) return files

  return safeList(() => Array.from(data.items))
    // getAsFile() must run synchronously, while the clipboard data is still alive.
    .map((item) => (item.kind === 'file' ? item.getAsFile() : null))
    .filter((file): file is File => file !== null && isImageFile(file))
}

export function isImageFile(file: File): boolean {
  if (file.type) return file.type.toLowerCase().startsWith('image/')

  return IMAGE_EXTENSION.test(file.name)
}

// Not every image the browser can decode is safe to inline; SVG aside, anything
// exotic (HEIC, TIFF) is re-encoded before it reaches the note.
export function isRenderableImageMime(mimeType: string): boolean {
  return RENDERABLE_MIME.test(mimeType)
}

// Copying an image inside a page often yields only HTML. A remote URL can be linked
// as-is instead of failing the paste.
export function getClipboardImageUrl(data: DataTransfer | null): string | null {
  if (!data) return null

  const html = safeRead(() => data.getData('text/html'))

  if (html) {
    const source = /<img\b[^>]*?\ssrc\s*=\s*(?:"([^"]+)"|'([^']+)')/i.exec(html)
    const url = source?.[1] ?? source?.[2]

    if (url && REMOTE_IMAGE_URL.test(url)) return decodeHtmlEntities(url)
  }

  const text = safeRead(() => data.getData('text/plain'))?.trim()

  if (text && REMOTE_IMAGE_URL.test(text) && IMAGE_EXTENSION.test(safeRead(() => new URL(text).pathname) ?? '')) return text

  return null
}

// Data images are allowed only as image sources, never as links.
export function isImageDataUrl(url: string): boolean {
  return /^data:image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml);base64,[a-z\d+/=\s]+$/i.test(url)
}

function safeList<T>(read: () => T[]): T[] {
  try {
    return read()
  } catch {
    return []
  }
}

function safeRead(read: () => string): string | null {
  try {
    return read() || null
  } catch {
    return null
  }
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}
