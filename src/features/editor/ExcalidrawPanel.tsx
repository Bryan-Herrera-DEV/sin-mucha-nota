import { lazy, Suspense, useEffect, useRef, type MutableRefObject } from 'react'
import '@excalidraw/excalidraw/index.css'
import type { DrawingDocument, NoteId } from '@/domain/notes/note'

type ExcalidrawPanelProps = {
  noteId: NoteId
  drawing: DrawingDocument
  onChange(noteId: NoteId, drawing: DrawingDocument): void
}

const DRAWING_SYNC_INTERVAL = 700

const ExcalidrawCanvas = lazy(async () => {
  const module = await import('@excalidraw/excalidraw')

  return { default: module.Excalidraw }
})

export function ExcalidrawPanel({ noteId, drawing, onChange }: ExcalidrawPanelProps) {
  const initialSignatureRef = useRef(createDrawingSignature(drawing))
  const lastSignatureRef = useRef(initialSignatureRef.current)
  const lastSyncedAtRef = useRef(0)
  const pendingDrawingRef = useRef<DrawingDocument | null>(null)
  const syncTimerRef = useRef<number | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const signature = createDrawingSignature(drawing)

    initialSignatureRef.current = signature
    lastSignatureRef.current = signature
    pendingDrawingRef.current = null
    lastSyncedAtRef.current = 0

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
  }, [drawing, noteId])

  useEffect(() => {
    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="excalidraw-wrapper h-full min-h-[28rem] overflow-hidden rounded-[1.35rem] border border-white/12 bg-[var(--app-panel-strong)]">
      <Suspense fallback={<div className="grid h-full min-h-[28rem] place-items-center text-sm font-bold text-[var(--app-muted)]">Excalidraw...</div>}>
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

            queueDrawingSync(noteId, nextDrawing, onChangeRef, pendingDrawingRef, lastSyncedAtRef, syncTimerRef)
          }}
        />
      </Suspense>
    </div>
  )
}

function queueDrawingSync(
  noteId: NoteId,
  drawing: DrawingDocument,
  onChangeRef: MutableRefObject<(noteId: NoteId, drawing: DrawingDocument) => void>,
  pendingDrawingRef: MutableRefObject<DrawingDocument | null>,
  lastSyncedAtRef: MutableRefObject<number>,
  syncTimerRef: MutableRefObject<number | null>,
): void {
  const now = Date.now()
  const elapsed = now - lastSyncedAtRef.current

  pendingDrawingRef.current = drawing

  if (elapsed >= DRAWING_SYNC_INTERVAL) {
    flushDrawingSync(noteId, onChangeRef, pendingDrawingRef, lastSyncedAtRef, syncTimerRef)

    return
  }

  if (syncTimerRef.current === null) {
    syncTimerRef.current = window.setTimeout(() => {
      flushDrawingSync(noteId, onChangeRef, pendingDrawingRef, lastSyncedAtRef, syncTimerRef)
    }, DRAWING_SYNC_INTERVAL - elapsed)
  }
}

function flushDrawingSync(
  noteId: NoteId,
  onChangeRef: MutableRefObject<(noteId: NoteId, drawing: DrawingDocument) => void>,
  pendingDrawingRef: MutableRefObject<DrawingDocument | null>,
  lastSyncedAtRef: MutableRefObject<number>,
  syncTimerRef: MutableRefObject<number | null>,
): void {
  if (syncTimerRef.current !== null) {
    window.clearTimeout(syncTimerRef.current)
    syncTimerRef.current = null
  }

  if (!pendingDrawingRef.current) {
    return
  }

  onChangeRef.current(noteId, pendingDrawingRef.current)
  pendingDrawingRef.current = null
  lastSyncedAtRef.current = Date.now()
}

function createDrawingSignature(drawing: DrawingDocument): string {
  try {
    return JSON.stringify(drawing)
  } catch {
    return `${drawing.elements.length}:${Object.keys(drawing.files).length}:${Object.keys(drawing.appState).join(',')}`
  }
}
