import { useDeferredValue, useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import type { FolderId } from '@/domain/folders/folder'
import type { EditorMode } from '@/store/workspace.store'
import { selectActiveNote } from '@/store/selectors'
import { useWorkspaceStore } from '@/store/workspace.store'
import { useI18n } from '@/i18n/useI18n'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { ExcalidrawPanel } from '@/features/editor/ExcalidrawPanel'
import { MarkdownPreview } from '@/features/editor/MarkdownPreview'

const editorModes: EditorMode[] = ['split', 'markdown', 'drawing', 'preview']

export function EditorWorkspace() {
  const { t } = useI18n()
  const activeNote = useWorkspaceStore(selectActiveNote)
  const folders = useWorkspaceStore((state) => state.folders)
  const markdownDraft = useWorkspaceStore((state) => state.markdownDraft)
  const drawingDraft = useWorkspaceStore((state) => state.drawingDraft)
  const editorMode = useWorkspaceStore((state) => state.editorMode)
  const isDirty = useWorkspaceStore((state) => state.isDirty)
  const contentStatus = useWorkspaceStore((state) => state.contentStatus)
  const lastSavedAt = useWorkspaceStore((state) => state.lastSavedAt)
  const updateMarkdownDraft = useWorkspaceStore((state) => state.updateMarkdownDraft)
  const updateDrawingDraft = useWorkspaceStore((state) => state.updateDrawingDraft)
  const saveActiveNote = useWorkspaceStore((state) => state.saveActiveNote)
  const setEditorMode = useWorkspaceStore((state) => state.setEditorMode)
  const renameActiveNote = useWorkspaceStore((state) => state.renameActiveNote)
  const moveActiveNote = useWorkspaceStore((state) => state.moveActiveNote)
  const [titleDraft, setTitleDraft] = useState(activeNote?.title ?? '')
  const deferredMarkdown = useDeferredValue(markdownDraft)
  const play = useSoundFeedback()

  useEffect(() => {
    setTitleDraft(activeNote?.title ?? '')
  }, [activeNote?.id, activeNote?.title])

  useEffect(() => {
    if (!isDirty || contentStatus === 'saving') {
      return
    }

    const autosave = window.setTimeout(() => {
      void saveActiveNote()
    }, 900)

    return () => window.clearTimeout(autosave)
  }, [contentStatus, isDirty, saveActiveNote])

  if (!activeNote) {
    return (
      <main className="grid min-h-[32rem] flex-1 place-items-center rounded-[2rem] border border-line bg-paper/90 p-6 shadow-soft">
        <div className="max-w-md text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted">Markdown + Excalidraw</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-ink">{t('noNoteTitle')}</h1>
          <p className="mt-4 leading-8 text-muted">{t('noNoteBody')}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100svh-1.5rem)] flex-1 flex-col rounded-[2rem] border border-line bg-paper/90 p-4 shadow-soft backdrop-blur">
      <header className="flex flex-col gap-4 border-b border-line pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-3xl font-black tracking-[-0.05em] text-ink outline-none sm:text-5xl"
            value={titleDraft}
            onBlur={() => void renameActiveNote(titleDraft)}
            onChange={(event) => setTitleDraft(event.target.value)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
            <span>{isDirty ? t('unsaved') : t('saved')}</span>
            {lastSavedAt ? <span>{new Date(lastSavedAt).toLocaleString()}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-full border border-line bg-paper-soft px-3 text-sm font-bold text-ink outline-none focus:border-[var(--accent)]"
            value={activeNote.folderId ?? ''}
            onChange={(event) => void moveActiveNote((event.target.value || null) as FolderId | null)}
          >
            <option value="">{t('rootFolder')}</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <Button
            disabled={!isDirty || contentStatus === 'saving'}
            onClick={() => {
              play('save')
              void saveActiveNote()
            }}
            variant="primary"
          >
            <Save size={16} />
            {contentStatus === 'saving' ? t('saving') : t('save')}
          </Button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {editorModes.map((mode) => (
          <Button
            key={mode}
            onClick={() => {
              play('tap')
              setEditorMode(mode)
            }}
            size="sm"
            variant={editorMode === mode ? 'primary' : 'soft'}
          >
            {t(mode)}
          </Button>
        ))}
      </div>

      <section
        className={cn(
          'mt-4 grid min-h-0 flex-1 gap-4',
          editorMode === 'split' && 'lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]',
          editorMode !== 'split' && 'grid-cols-1',
        )}
      >
        {(editorMode === 'split' || editorMode === 'markdown') && (
          <textarea
            className="min-h-[28rem] resize-none rounded-[1.5rem] border border-line bg-paper-soft p-5 font-serif text-base leading-8 text-ink outline-none shadow-inner transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            placeholder={t('editorPlaceholder')}
            value={markdownDraft}
            onChange={(event) => updateMarkdownDraft(event.target.value)}
          />
        )}

        {editorMode === 'preview' && <MarkdownPreview markdown={deferredMarkdown} />}

        {(editorMode === 'split' || editorMode === 'drawing') && (
          <ExcalidrawPanel drawing={drawingDraft} noteId={activeNote.id} onChange={updateDrawingDraft} />
        )}
      </section>
    </main>
  )
}
