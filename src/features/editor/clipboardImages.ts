const IMAGE_MIME = /^image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)$/i

export function getClipboardImages(data: DataTransfer): File[] {
  const files = Array.from(data.files).filter((file) => IMAGE_MIME.test(file.type))
  if (files.length) return files
  return Array.from(data.items)
    .filter((item) => item.kind === 'file' && IMAGE_MIME.test(item.type))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)
}

export function readImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

// Data images are allowed only as image sources, never as links.
export function isImageDataUrl(url: string): boolean {
  return /^data:image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml);base64,[a-z\d+/=\s]+$/i.test(url)
}

export function imageMarkdown(name: string, dataUrl: string): string {
  const alt = name.replace(/\.[^.]+$/, '').replace(/[\\[\]\r\n]/g, ' ').trim() || 'Imagen'
  return `![${alt}](${dataUrl})`
}
