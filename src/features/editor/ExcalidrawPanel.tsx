import { lazy, Suspense, useRef } from 'react'
import type { DrawingDocument, NoteId } from '@/domain/notes/note'

type ExcalidrawPanelProps = {
  noteId: NoteId
  drawing: DrawingDocument
  onChange(noteId: NoteId, drawing: DrawingDocument): void
}

const ExcalidrawCanvas = lazy(() => import('@/features/editor/ExcalidrawCanvas'))

export function ExcalidrawPanel({ noteId, drawing, onChange }: ExcalidrawPanelProps) {
  const initialDrawing = useRef(drawing)
  const lastSignature = useRef(JSON.stringify(drawing))

  return (
    <div className="excalidraw-wrapper h-full min-h-[28rem] overflow-hidden rounded-[1.35rem] border border-white/12 bg-[var(--app-panel-strong)]">
      <Suspense fallback={<div className="grid h-full min-h-[28rem] place-items-center text-sm font-bold text-[var(--app-muted)]">Excalidraw...</div>}>
        <ExcalidrawCanvas
          initialData={initialDrawing.current as never}
          onChange={(elements, appState, files) => {
            const nextDrawing: DrawingDocument = {
              elements,
              appState: {
                currentItemBackgroundColor: appState.currentItemBackgroundColor,
                currentItemFillStyle: appState.currentItemFillStyle,
                currentItemFontFamily: appState.currentItemFontFamily,
                currentItemStrokeColor: appState.currentItemStrokeColor,
                viewBackgroundColor: appState.viewBackgroundColor,
              },
              files: { ...files },
            }
            const signature = JSON.stringify(nextDrawing)
            if (signature === lastSignature.current) return
            lastSignature.current = signature
            // Navigation, save and ZIP export need the latest image files immediately.
            onChange(noteId, nextDrawing)
          }}
        />
      </Suspense>
    </div>
  )
}
