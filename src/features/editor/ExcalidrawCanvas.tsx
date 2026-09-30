import { useEffect, useRef, type ClipboardEvent, type ComponentProps } from 'react'
import { CaptureUpdateAction, convertToExcalidrawElements, Excalidraw } from '@excalidraw/excalidraw'
import type { BinaryFileData, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { toast } from 'sonner'
import { useI18n } from '@/app/i18n/useI18n'
import { getClipboardImages, readImageDataUrl } from './clipboardImages'
import { trackEditorTask } from './pendingEditorTasks'
import '@excalidraw/excalidraw/index.css'

export default function ExcalidrawCanvas(props: ComponentProps<typeof Excalidraw>) {
  const { t } = useI18n()
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const pasteImages = async (event: ClipboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('textarea, [contenteditable="true"], input:not([type="radio"]):not([type="checkbox"])')) return
    const images = getClipboardImages(event.clipboardData)
    const api = apiRef.current
    if (!images.length || !api || api.getAppState().viewModeEnabled) return
    // The built-in document listener requires the mouse to hover over the canvas.
    event.preventDefault()
    event.stopPropagation()
    try {
      const state = api.getAppState()
      const centerX = state.width / (2 * state.zoom.value) - state.scrollX
      const centerY = state.height / (2 * state.zoom.value) - state.scrollY
      const prepared = await Promise.all(images.map(async (file, index) => {
        const dataURL = await readImageDataUrl(file)
        const dimensions = await getImageDimensions(dataURL)
        const scale = Math.min(1, 800 / Math.max(dimensions.width, dimensions.height))
        const width = dimensions.width * scale
        const height = dimensions.height * scale
        const id = crypto.randomUUID() as BinaryFileData['id']
        return {
          file: { id, dataURL, mimeType: file.type, created: Date.now() } as BinaryFileData,
          element: { type: 'image' as const, fileId: id, status: 'saved' as const,
            x: centerX - width / 2 + index * 24, y: centerY - height / 2 + index * 24, width, height },
        }
      }))
      if (!mounted.current || apiRef.current !== api) return
      const elements = convertToExcalidrawElements(prepared.map(({ element }) => element))
      api.addFiles(prepared.map(({ file }) => file))
      api.updateScene({
        elements: [...api.getSceneElementsIncludingDeleted(), ...elements],
        appState: { selectedElementIds: Object.fromEntries(elements.map((element) => [element.id, true])) },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      })
    } catch {
      toast.error(t('imagePasteFailed'))
    }
  }

  return <div className="h-full min-h-[28rem]" onPasteCapture={(event) => trackEditorTask(pasteImages(event))}>
    <Excalidraw {...props} excalidrawAPI={(api) => { apiRef.current = api }} />
  </div>
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth || 300, height: image.naturalHeight || 200 })
    image.onerror = () => reject(new Error('Invalid image'))
    image.src = src
  })
}
