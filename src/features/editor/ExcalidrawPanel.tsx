import { lazy, Suspense } from 'react'
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
  return (
    <div className="excalidraw-wrapper h-full min-h-[28rem] overflow-hidden rounded-[1.5rem] border border-line bg-paper shadow-inner">
      <Suspense fallback={<div className="grid h-full min-h-[28rem] place-items-center text-sm font-bold text-muted">Excalidraw...</div>}>
        <ExcalidrawCanvas
          key={noteId}
          initialData={drawing as never}
          onChange={(elements, appState, files) => {
            onChange({
              elements: elements as unknown[],
              appState: {
                currentItemBackgroundColor: appState.currentItemBackgroundColor,
                currentItemFillStyle: appState.currentItemFillStyle,
                currentItemFontFamily: appState.currentItemFontFamily,
                currentItemStrokeColor: appState.currentItemStrokeColor,
                viewBackgroundColor: appState.viewBackgroundColor,
              },
              files: files as unknown as Record<string, unknown>,
            })
          }}
        />
      </Suspense>
    </div>
  )
}
