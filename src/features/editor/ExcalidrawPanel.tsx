import type { ComponentProps } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { DrawingDocument } from '@/domain/notes/note'

type ExcalidrawPanelProps = {
  noteId: string
  drawing: DrawingDocument
  onChange(drawing: DrawingDocument): void
}

type ExcalidrawInitialData = ComponentProps<typeof Excalidraw>['initialData']

export function ExcalidrawPanel({ noteId, drawing, onChange }: ExcalidrawPanelProps) {
  return (
    <div className="excalidraw-wrapper h-full min-h-[28rem] overflow-hidden rounded-[1.5rem] border border-line bg-paper shadow-inner">
      <Excalidraw
        key={noteId}
        initialData={drawing as ExcalidrawInitialData}
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
    </div>
  )
}
