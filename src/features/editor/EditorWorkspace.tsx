import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CalendarDays, FileText, Maximize2, Minimize2, Plus, Save } from 'lucide-react'
import type { Folder as FolderEntity, FolderId } from '@/domain/folders/folder'
import type { Note } from '@/domain/notes/note'
import { getVisibleNotes } from '@/application/workspace/noteFilters'
import type { EditorMode } from '@/app/state/workspace.store'
import { selectActiveNote } from '@/app/state/selectors'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { useI18n } from '@/app/i18n/useI18n'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { cn } from '@/shared/lib/cn'
import { FolderPicker } from '@/features/library/FolderPicker'
import { NoteMenu } from '@/features/library/EntityMenus'
import { useLibraryUi } from '@/features/library/libraryUi.store'
import { Button } from '@/shared/ui/shadcn/button'
import { ExcalidrawPanel } from '@/features/editor/ExcalidrawPanel'
import { MarkdownPreview } from '@/features/editor/MarkdownPreview'

const editorModes: EditorMode[] = ['markdown', 'preview', 'drawing', 'split']

export function EditorWorkspace() {
  const { t } = useI18n()
  const activeNote = useWorkspaceStore(selectActiveNote)
  const folders = useWorkspaceStore((state) => state.folders)
  const notes = useWorkspaceStore((state) => state.notes)
  const activeFolderId = useWorkspaceStore((state) => state.activeFolderId)
  const search = useWorkspaceStore((state) => state.search)
  const markdownDraft = useWorkspaceStore((state) => state.markdownDraft)
  const drawingDraft = useWorkspaceStore((state) => state.drawingDraft)
  const loadedContentNoteId = useWorkspaceStore((state) => state.loadedContentNoteId)
  const editorMode = useWorkspaceStore((state) => state.editorMode)
  const isDirty = useWorkspaceStore((state) => state.isDirty)
  const contentStatus = useWorkspaceStore((state) => state.contentStatus)
  const lastSavedAt = useWorkspaceStore((state) => state.lastSavedAt)
  const updateMarkdownDraft = useWorkspaceStore((state) => state.updateMarkdownDraft)
  const updateDrawingDraft = useWorkspaceStore((state) => state.updateDrawingDraft)
  const saveActiveNote = useWorkspaceStore((state) => state.saveActiveNote)
  const setEditorMode = useWorkspaceStore((state) => state.setEditorMode)
  const selectFolder = useWorkspaceStore((state) => state.selectFolder)
  const renameActiveNote = useWorkspaceStore((state) => state.renameActiveNote)
  const moveActiveNote = useWorkspaceStore((state) => state.moveActiveNote)
  const selectNote = useWorkspaceStore((state) => state.selectNote)
  const openAction = useLibraryUi((state) => state.open)
  const setSearch = useWorkspaceStore((state) => state.setSearch)
  const [titleDraft, setTitleDraft] = useState(activeNote?.title ?? '')
  const [editorExpanded, setEditorExpanded] = useState(false)
  const deferredMarkdown = useDeferredValue(markdownDraft)
  const play = useSoundFeedback()
  const visibleNotes = useMemo(() => getVisibleNotes(notes, folders, activeFolderId, search), [activeFolderId, folders, notes, search])
  const folderById = useMemo(() => createFolderById(folders), [folders])
  const activeContentReady = activeNote !== null && loadedContentNoteId === activeNote.id && contentStatus !== 'loading'
  const activeFolder = activeFolderId ? (folderById.get(activeFolderId) ?? null) : null
  const viewTitle = activeFolder?.name ?? t('allNotes')
  const [today] = useState(() => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date()))
  const handleSelectNote = useCallback((noteId: Note['id']) => {
    play('open')
    void selectNote(noteId)
  }, [play, selectNote])

  useEffect(() => {
    setTitleDraft(activeNote?.title ?? '')
  }, [activeNote?.id, activeNote?.title])

  return (
    <>
      <main className="notes-dark app-workspace flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!editorExpanded ? (
            <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 lg:px-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-xs font-bold text-[var(--app-muted)]">
                    <CalendarDays size={15} />
                    {today}
                  </p>
                  <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-white sm:text-2xl" title={viewTitle}>{viewTitle}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--app-muted)]">
                  <Button type="button" onClick={() => openAction({ type: 'create-note', folderId: activeFolderId })}><Plus />{t('newNote')}</Button>
                  <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2">{visibleNotes.length} {t('notes').toLowerCase()}</span>
                  <span className={cn('rounded-full border px-3 py-2', isDirty ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-white/10 text-[var(--app-muted)]')}>
                    {isDirty ? t('unsaved') : t('saved')}
                  </span>
                </div>
              </div>

            </header>
          ) : null}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
            {!editorExpanded ? (
              <div className="min-h-0 min-w-0 shrink-0 overflow-auto border-b border-border p-3 lg:w-72 lg:border-b-0 lg:border-r xl:w-80">
                <div className="flex gap-2 lg:block lg:space-y-2">
                    {visibleNotes.length > 0 ? visibleNotes.map((note) => (
                      <NoteCard
                        active={activeNote?.id === note.id}
                        fallbackFolderLabel={t('rootFolder')}
                        folder={note.folderId ? (folderById.get(note.folderId) ?? null) : null}
                        key={note.id}
                        markdownPreview={activeNote?.id === note.id ? deferredMarkdown : ''}
                        note={note}
                        onSelect={handleSelectNote}
                      />
                    )) : (
                      <div className="app-panel-soft rounded-[1.1rem] border border-dashed border-white/15 p-5 text-sm leading-6 text-[var(--app-muted)]">
                        <p className="font-black text-white">{t('emptyNotesTitle')}</p>
                        <p className="mt-2">{t('emptyNotesBody')}</p>
                        {(activeFolderId !== null || search.trim()) ? (
                          <button
                            className="mt-4 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-black text-[var(--accent)]"
                            onClick={() => {
                              selectFolder(null)
                              setSearch('')
                            }}
                            type="button"
                          >
                            {t('clearFilters')}
                          </button>
                        ) : null}
                      </div>
                    )}
                </div>
              </div>
            ) : null}

          <article className="min-h-0 min-w-0 flex-1 overflow-hidden bg-[var(--app-panel)]">
          {activeNote && visibleNotes.some((note) => note.id === activeNote.id) ? (
            <div className="flex h-full min-h-0 flex-col">
              <header className="border-b border-white/10 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <input
                      aria-label={t('title')}
                      maxLength={240}
                      autoComplete="off"
                      className="w-full bg-transparent text-xl font-black tracking-[-0.04em] text-white outline-none sm:text-2xl"
                      value={titleDraft}
                      onBlur={(event) => {
                        const title = event.currentTarget.value.trim()
                        setTitleDraft(title || activeNote.title)
                        if (title) void renameActiveNote(title)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') { event.currentTarget.value = activeNote.title; setTitleDraft(activeNote.title) }
                        if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur()
                      }}
                      onChange={(event) => setTitleDraft(event.target.value)}
                    />
                    <p className="mt-2 text-xs font-semibold text-[var(--app-muted)]">
                      {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : t('saved')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FolderPicker className="h-9 w-44 max-w-full text-sm" onChange={(folderId) => void moveActiveNote(folderId)} value={activeNote.folderId} />
                    <NoteMenu note={activeNote} />
                    <button
                      aria-label={editorExpanded ? t('collapseEditor') : t('expandEditor')}
                      className={cn(
                        'grid h-9 w-9 place-items-center rounded-full border text-[var(--app-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-white',
                        editorExpanded ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-white' : 'border-white/10 bg-white/6',
                      )}
                      onClick={() => {
                        play('page')
                        setEditorExpanded((expanded) => !expanded)
                      }}
                      title={editorExpanded ? t('collapseEditor') : t('expandEditor')}
                      type="button"
                    >
                      {editorExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                    </button>
                    <button
                      className="flex h-9 items-center gap-2 rounded-full bg-[var(--accent)] px-3 text-sm font-black text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
                      disabled={!isDirty || contentStatus === 'saving'}
                      onClick={() => {
                        play('save')
                        void saveActiveNote()
                      }}
                      type="button"
                    >
                      <Save size={15} />
                      {contentStatus === 'saving' ? t('saving') : t('save')}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {editorModes.map((mode) => (
                    <button
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-black transition',
                        editorMode === mode ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-white/10 bg-white/6 text-[var(--app-muted)] hover:text-white',
                      )}
                      key={mode}
                      onClick={() => {
                        play('tap')
                        setEditorMode(mode)
                      }}
                      type="button"
                    >
                      {t(mode)}
                    </button>
                  ))}
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-auto p-4">
                {activeContentReady ? (
                  <section
                    className={cn(
                      'grid min-h-full gap-3',
                      editorMode === 'split' && 'xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]',
                      editorMode !== 'split' && 'grid-cols-1',
                    )}
                  >
                    {(editorMode === 'split' || editorMode === 'markdown') && (
                      <textarea
                        className="markdown-editor min-h-[22rem] resize-none rounded-[1.1rem] border border-white/12 bg-[var(--app-panel-strong)] p-4 text-sm leading-7 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                        placeholder={t('editorPlaceholder')}
                        value={markdownDraft}
                        onChange={(event) => updateMarkdownDraft(event.target.value)}
                      />
                    )}

                    {editorMode === 'preview' && <div><MarkdownPreview markdown={deferredMarkdown} /></div>}

                    {(editorMode === 'split' || editorMode === 'drawing') && <div className="min-h-0"><ExcalidrawPanel drawing={drawingDraft} noteId={activeNote.id} onChange={updateDrawingDraft} /></div>}
                  </section>
                ) : (
                  <div className="grid min-h-[22rem] place-items-center rounded-[1.1rem] border border-white/12 bg-[var(--app-panel-strong)] text-sm font-bold text-[var(--app-muted)]">
                    {t('loading')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid h-full min-h-[28rem] place-items-center p-6 text-center">
              <div className="max-w-md">
                <FileText className="mx-auto text-[var(--accent)]" size={34} />
                <h2 className="mt-4 text-2xl font-black tracking-[-0.05em] text-white">{t('noNoteTitle')}</h2>
                <p className="mt-3 leading-7 text-[var(--app-muted)]">{t('noNoteBody')}</p>
                <Button className="mt-5" type="button" onClick={() => openAction({ type: 'create-note', folderId: activeFolderId })}><Plus />{t('newNote')}</Button>
              </div>
            </div>
          )}
          </article>
        </section>
      </main>
    </>
  )
}

type NoteCardProps = {
  note: Note
  folder: FolderEntity | null
  fallbackFolderLabel: string
  active: boolean
  markdownPreview: string
  onSelect(noteId: Note['id']): void
}

const NoteCard = memo(function NoteCard({ note, folder, fallbackFolderLabel, active, markdownPreview, onSelect }: NoteCardProps) {
  const { t } = useI18n()
  const excerpt = markdownPreview.slice(0, 600).trim().replace(/[#*_>`-]/g, '').replace(/\s+/g, ' ').slice(0, 150)

  return (
    <NoteMenu note={note}><article className={cn('note-card group w-64 shrink-0 rounded-lg border p-3 transition lg:w-full', active ? 'note-card-active border-[var(--accent)]' : 'border-white/10 hover:border-white/20')}>
      <button className="w-full text-left" onClick={() => onSelect(note.id)} type="button">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-white" title={note.title}>{note.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[var(--app-muted)]">
              <span className="h-2 w-2 rounded-sm border border-[var(--accent)]" />
              <span className="truncate" title={folder?.name}>{folder?.name ?? fallbackFolderLabel}</span>
            </p>
          </div>
          <span className="shrink-0 text-xs font-bold text-[var(--app-muted)]">{new Date(note.updatedAt).toLocaleDateString()}</span>
        </div>
        <p className="mt-3 hidden line-clamp-3 text-xs leading-5 text-[var(--app-card-text)] lg:block">{excerpt || t('emptyNoteExcerpt')}</p>
      </button>
      <div className="mt-1 flex justify-end"><NoteMenu note={note} /></div>
    </article></NoteMenu>
  )
})

function createFolderById(folders: FolderEntity[]): Map<FolderId, FolderEntity> {
  const folderById = new Map<FolderId, FolderEntity>()

  for (const folder of folders) {
    folderById.set(folder.id, folder)
  }

  return folderById
}
