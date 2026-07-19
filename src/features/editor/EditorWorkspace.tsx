import { useDeferredValue, useEffect, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { CalendarDays, FileText, Maximize2, Minimize2, Plus, Save, Trash2 } from 'lucide-react'
import type { Folder as FolderEntity, FolderId } from '@/domain/folders/folder'
import type { Note } from '@/domain/notes/note'
import { getVisibleNotes } from '@/application/workspace/noteFilters'
import type { EditorMode } from '@/app/state/workspace.store'
import { selectActiveNote } from '@/app/state/selectors'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { useI18n } from '@/app/i18n/useI18n'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { cn } from '@/shared/lib/cn'
import { listContainer, listItem, panelPresence, smoothSpring } from '@/shared/lib/motionPresets'
import { Select } from '@/shared/ui/Select'
import { ExcalidrawPanel } from '@/features/editor/ExcalidrawPanel'
import { MarkdownPreview } from '@/features/editor/MarkdownPreview'

const editorModes: EditorMode[] = ['markdown', 'preview', 'drawing', 'split']
const ROOT_FOLDER_VALUE = 'root-folder'

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
  const createNote = useWorkspaceStore((state) => state.createNote)
  const deleteNote = useWorkspaceStore((state) => state.deleteNote)
  const setSearch = useWorkspaceStore((state) => state.setSearch)
  const [titleDraft, setTitleDraft] = useState(activeNote?.title ?? '')
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [editorExpanded, setEditorExpanded] = useState(false)
  const deferredMarkdown = useDeferredValue(markdownDraft)
  const play = useSoundFeedback()
  const visibleNotes = getVisibleNotes(notes, folders, activeFolderId, search)
  const folderById = createFolderById(folders)
  const activeContentReady = activeNote !== null && loadedContentNoteId === activeNote.id && contentStatus !== 'loading'
  const activeFolder = activeFolderId ? (folderById.get(activeFolderId) ?? null) : null
  const viewTitle = activeFolder?.name ?? t('allNotes')
  const today = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date())

  useEffect(() => {
    setTitleDraft(activeNote?.title ?? '')
  }, [activeNote?.id, activeNote?.title])

  useEffect(() => {
    if (!isDirty || contentStatus === 'saving') {
      return
    }

    const autosave = window.setTimeout(() => {
      void saveActiveNote()
    }, 1000)

    return () => window.clearTimeout(autosave)
  }, [contentStatus, isDirty, saveActiveNote])

  return (
    <LayoutGroup>
      <motion.main className="notes-dark app-workspace flex min-h-0 flex-1 flex-col overflow-hidden" layout transition={smoothSpring}>
        <AnimatePresence initial={false}>
          {!editorExpanded ? (
            <motion.header className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 lg:px-7" key="workspace-header" layout initial={{ opacity: 0, height: 0, y: -16, filter: 'blur(8px)' }} animate={{ opacity: 1, height: 'auto', y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, height: 0, y: -16, filter: 'blur(8px)' }} transition={smoothSpring}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold text-[var(--app-muted)]">
                    <CalendarDays size={15} />
                    {today}
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">{viewTitle}</h1>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--app-muted)]">
                  <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2">{visibleNotes.length} {t('notes').toLowerCase()}</span>
                  <span className={cn('rounded-full border px-3 py-2', isDirty ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-white/10 text-[var(--app-muted)]')}>
                    {isDirty ? t('unsaved') : t('saved')}
                  </span>
                </div>
              </div>

              <form
                className="relative max-w-2xl"
                onSubmit={(event) => {
                  event.preventDefault()

                  if (!newNoteTitle.trim()) {
                    return
                  }

                  play('save')
                  void createNote(newNoteTitle, activeFolderId)
                  setNewNoteTitle('')
                }}
              >
                <input
                  className="h-11 w-full rounded-2xl border border-white/12 bg-[var(--app-panel)] px-4 pr-12 text-sm text-white shadow-[inset_0_1px_rgb(255_255_255_/_0.06)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                  placeholder={t('noteNamePlaceholder')}
                  value={newNoteTitle}
                  onChange={(event) => setNewNoteTitle(event.target.value)}
                />
                <button className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" type="submit">
                  <Plus size={16} />
                </button>
              </form>
            </motion.header>
          ) : null}
        </AnimatePresence>

        <motion.section className={cn('flex min-h-0 flex-1 flex-col overflow-hidden p-4 lg:flex-row lg:p-5 lg:px-7', editorExpanded ? 'gap-0' : 'gap-4')} layout transition={smoothSpring}>
          <AnimatePresence initial={false} mode="popLayout">
            {!editorExpanded ? (
              <motion.div className="min-h-0 min-w-0 overflow-auto pr-1 lg:w-[22rem]" key="note-list" layout layoutScroll initial={{ opacity: 0, x: -24, filter: 'blur(8px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -24, filter: 'blur(8px)' }} transition={smoothSpring}>
                <motion.div className="space-y-3" variants={listContainer} initial="hidden" animate="visible">
                  <AnimatePresence initial={false}>
                    {visibleNotes.length > 0 ? visibleNotes.map((note) => (
                      <NoteCard
                        active={activeNote?.id === note.id}
                        deleteLabel={t('delete')}
                        fallbackFolderLabel={t('rootFolder')}
                        folder={note.folderId ? (folderById.get(note.folderId) ?? null) : null}
                        key={note.id}
                        markdownPreview={activeNote?.id === note.id ? markdownDraft : ''}
                        note={note}
                        onDelete={() => {
                          play('delete')
                          void deleteNote(note.id)
                        }}
                        onSelect={() => {
                          play('open')
                          void selectNote(note.id)
                        }}
                      />
                    )) : (
                      <motion.div className="app-panel-soft rounded-[1.1rem] border border-dashed border-white/15 p-5 text-sm leading-6 text-[var(--app-muted)]" key="empty-notes" layout {...panelPresence}>
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.article className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-[1.35rem] border border-white/12 bg-[var(--app-panel)] shadow-[0_24px_80px_rgb(0_0_0_/_0.22)]" layout transition={smoothSpring}>
            <AnimatePresence mode="wait">
          {activeNote ? (
            <motion.div className="flex h-full min-h-0 flex-col" key={activeNote.id} layout {...panelPresence}>
              <header className="border-b border-white/10 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <input
                      className="w-full bg-transparent text-xl font-black tracking-[-0.04em] text-white outline-none sm:text-2xl"
                      value={titleDraft}
                      onBlur={() => void renameActiveNote(titleDraft)}
                      onChange={(event) => setTitleDraft(event.target.value)}
                    />
                    <p className="mt-2 text-xs font-semibold text-[var(--app-muted)]">
                      {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : t('saved')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      ariaLabel={t('moveTo')}
                      className="h-9 w-44 rounded-full text-sm"
                      onValueChange={(value) => void moveActiveNote(value === ROOT_FOLDER_VALUE ? null : (value as FolderId))}
                      options={[
                        { value: ROOT_FOLDER_VALUE, label: t('rootFolder') },
                        ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
                      ]}
                      value={activeNote.folderId ?? ROOT_FOLDER_VALUE}
                    />
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
                <AnimatePresence mode="wait">
                {activeContentReady ? (
                  <motion.section
                    className={cn(
                      'grid min-h-full gap-3',
                      editorMode === 'split' && 'xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]',
                      editorMode !== 'split' && 'grid-cols-1',
                    )}
                    key={`${activeNote.id}-${editorMode}`}
                    layout
                    {...panelPresence}
                  >
                    {(editorMode === 'split' || editorMode === 'markdown') && (
                      <motion.textarea
                        className="markdown-editor min-h-[22rem] resize-none rounded-[1.1rem] border border-white/12 bg-[var(--app-panel-strong)] p-4 text-sm leading-7 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                        layout
                        placeholder={t('editorPlaceholder')}
                        value={markdownDraft}
                        onChange={(event) => updateMarkdownDraft(event.target.value)}
                      />
                    )}

                    {editorMode === 'preview' && <motion.div layout><MarkdownPreview markdown={deferredMarkdown} /></motion.div>}

                    {(editorMode === 'split' || editorMode === 'drawing') && <motion.div className="min-h-0" layout><ExcalidrawPanel drawing={drawingDraft} noteId={activeNote.id} onChange={updateDrawingDraft} /></motion.div>}
                  </motion.section>
                ) : (
                  <motion.div className="grid min-h-[22rem] place-items-center rounded-[1.1rem] border border-white/12 bg-[var(--app-panel-strong)] text-sm font-bold text-[var(--app-muted)]" key="content-loading" layout {...panelPresence}>
                    {t('loading')}
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div className="grid h-full min-h-[28rem] place-items-center p-6 text-center" key="no-note" layout {...panelPresence}>
              <div className="max-w-md">
                <FileText className="mx-auto text-[var(--accent)]" size={34} />
                <h2 className="mt-4 text-2xl font-black tracking-[-0.05em] text-white">{t('noNoteTitle')}</h2>
                <p className="mt-3 leading-7 text-[var(--app-muted)]">{t('noNoteBody')}</p>
              </div>
            </motion.div>
          )}
            </AnimatePresence>
          </motion.article>
        </motion.section>
      </motion.main>
    </LayoutGroup>
  )
}

type NoteCardProps = {
  note: Note
  folder: FolderEntity | null
  deleteLabel: string
  fallbackFolderLabel: string
  active: boolean
  markdownPreview: string
  onSelect(): void
  onDelete(): void
}

function NoteCard({ note, folder, deleteLabel, fallbackFolderLabel, active, markdownPreview, onSelect, onDelete }: NoteCardProps) {
  const excerpt = markdownPreview.trim().replace(/[#*_>`-]/g, '').replace(/\s+/g, ' ').slice(0, 150)

  return (
    <motion.article className={cn('note-card group rounded-[1.1rem] border p-3 transition', active ? 'note-card-active border-[var(--accent)]' : 'border-white/10 hover:border-white/20')} layout variants={listItem} exit="exit">
      <button className="w-full text-left" onClick={onSelect} type="button">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-white">{note.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[var(--app-muted)]">
              <span className="h-2 w-2 rounded-sm border border-[var(--accent)]" />
              {folder?.name ?? fallbackFolderLabel}
            </p>
          </div>
          <span className="text-xs font-bold text-[var(--app-muted)]">{new Date(note.updatedAt).toLocaleDateString()}</span>
        </div>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-[var(--app-card-text)]">{excerpt || 'Markdown + Excalidraw note ready to edit.'}</p>
      </button>
      <button className="mt-3 hidden items-center gap-1 text-xs font-bold text-[#ff8b8b] group-hover:flex" onClick={onDelete} type="button">
        <Trash2 size={13} />
        {deleteLabel}
      </button>
    </motion.article>
  )
}

function createFolderById(folders: FolderEntity[]): Map<FolderId, FolderEntity> {
  const folderById = new Map<FolderId, FolderEntity>()

  for (const folder of folders) {
    folderById.set(folder.id, folder)
  }

  return folderById
}
