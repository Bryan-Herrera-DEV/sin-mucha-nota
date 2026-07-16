import { lazy, Suspense, useEffect, useRef } from 'react'
import '@excalidraw/excalidraw/index.css'
import type { DrawingDocument } from '@/domain/notes/note'

type ExcalidrawPanelProps = {
  noteId: string
  drawing: DrawingDocument
  onChange(drawing: DrawingDocument): void
}

const ExcalidrawCanvas = lazy(async () => {
  const module = await import('@excalidraw/excalidraw')

  return { default: module.Excalidraw }
})

export function ExcalidrawPanel({ noteId, drawing, onChange }: ExcalidrawPanelProps) {
  const initialSignatureRef = useRef(createDrawingSignature(drawing))
  const lastSignatureRef = useRef(initialSignatureRef.current)

  useEffect(() => {
    const signature = createDrawingSignature(drawing)

    initialSignatureRef.current = signature
    lastSignatureRef.current = signature
  }, [drawing, noteId])

  return (
    <div className="excalidraw-wrapper h-full min-h-[28rem] overflow-hidden rounded-[1.5rem] border border-line bg-paper shadow-inner">
      <Suspense fallback={<div className="grid h-full min-h-[28rem] place-items-center text-sm font-bold text-muted">Excalidraw...</div>}>
        <ExcalidrawCanvas
          key={noteId}
          initialData={drawing as never}
          onChange={(elements, appState, files) => {
            const nextDrawing = {
              elements: elements as unknown[],
              appState: {
                currentItemBackgroundColor: appState.currentItemBackgroundColor,
                currentItemFillStyle: appState.currentItemFillStyle,
                currentItemFontFamily: appState.currentItemFontFamily,
                currentItemStrokeColor: appState.currentItemStrokeColor,
                viewBackgroundColor: appState.viewBackgroundColor,
              },
              files: files as unknown as Record<string, unknown>,
            }
            const signature = createDrawingSignature(nextDrawing)

            if (signature === lastSignatureRef.current) {
              return
            }

            lastSignatureRef.current = signature

            if (signature === initialSignatureRef.current) {
              return
            }

            onChange(nextDrawing)
          }}
        />
      </Suspense>
    </div>
  )
}

function createDrawingSignature(drawing: DrawingDocument): string {
  try {
    return JSON.stringify(drawing)
  } catch {
    return `${drawing.elements.length}:${Object.keys(drawing.files).length}:${Object.keys(drawing.appState).join(',')}`
  }
}
