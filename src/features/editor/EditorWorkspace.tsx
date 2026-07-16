import { useDeferredValue, useEffect, useState } from 'react'
import { CalendarDays, FileText, Plus, Save, Trash2 } from 'lucide-react'
import type { Folder as FolderEntity, FolderId } from '@/domain/folders/folder'
import type { Note } from '@/domain/notes/note'
import type { EditorMode } from '@/store/workspace.store'
import { selectActiveNote } from '@/store/selectors'
import { useWorkspaceStore } from '@/store/workspace.store'
import { useI18n } from '@/i18n/useI18n'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { cn } from '@/shared/lib/cn'
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
  const renameActiveNote = useWorkspaceStore((state) => state.renameActiveNote)
  const moveActiveNote = useWorkspaceStore((state) => state.moveActiveNote)
  const selectNote = useWorkspaceStore((state) => state.selectNote)
  const createNote = useWorkspaceStore((state) => state.createNote)
  const deleteNote = useWorkspaceStore((state) => state.deleteNote)
  const [titleDraft, setTitleDraft] = useState(activeNote?.title ?? '')
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const deferredMarkdown = useDeferredValue(markdownDraft)
  const play = useSoundFeedback()
  const visibleNotes = getVisibleNotes(notes, folders, activeFolderId, search)
  const activeContentReady = activeNote !== null && loadedContentNoteId === activeNote.id && contentStatus !== 'loading'
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
    <main className="notes-dark flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_55%_0%,rgb(60_91_73_/_0.32),transparent_28rem),#0a1813] text-[#e8efe5]">
      <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 lg:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold text-[#8fa89b]">
              <CalendarDays size={15} />
              Daily notes
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">Today, {today}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#8fa89b]">
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2">{visibleNotes.length} notes</span>
            <span className={cn('rounded-full border px-3 py-2', isDirty ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-white/10 text-[#8fa89b]')}>
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
            className="h-11 w-full rounded-2xl border border-white/12 bg-[#14251f]/85 px-4 pr-12 text-sm text-white shadow-[inset_0_1px_rgb(255_255_255_/_0.06)] outline-none placeholder:text-[#8fa89b] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            placeholder="Star writing right here..."
            value={newNoteTitle}
            onChange={(event) => setNewNoteTitle(event.target.value)}
          />
          <button className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" type="submit">
            <Plus size={16} />
          </button>
        </form>
      </header>

      <section className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:p-5 lg:px-7">
        <div className="min-h-0 overflow-auto pr-1">
          <div className="space-y-3">
            {visibleNotes.map((note) => (
              <NoteCard
                active={activeNote?.id === note.id}
                folder={folders.find((candidate) => candidate.id === note.folderId) ?? null}
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
            ))}
          </div>
        </div>

        <article className="min-h-0 overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#14251f]/85 shadow-[0_24px_80px_rgb(0_0_0_/_0.22)]">
          {activeNote ? (
            <div className="flex h-full min-h-0 flex-col">
              <header className="border-b border-white/10 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <input
                      className="w-full bg-transparent text-xl font-black tracking-[-0.04em] text-white outline-none sm:text-2xl"
                      value={titleDraft}
                      onBlur={() => void renameActiveNote(titleDraft)}
                      onChange={(event) => setTitleDraft(event.target.value)}
                    />
                    <p className="mt-2 text-xs font-semibold text-[#8fa89b]">
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
                        editorMode === mode ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-white/10 bg-white/6 text-[#8fa89b] hover:text-white',
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
                        className="min-h-[22rem] resize-none rounded-[1.1rem] border border-white/12 bg-[#0d1d17] p-4 font-serif text-sm leading-7 text-[#e8efe5] outline-none transition placeholder:text-[#8fa89b] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                        placeholder={t('editorPlaceholder')}
                        value={markdownDraft}
                        onChange={(event) => updateMarkdownDraft(event.target.value)}
                      />
                    )}

                    {editorMode === 'preview' && <MarkdownPreview markdown={deferredMarkdown} />}

                    {(editorMode === 'split' || editorMode === 'drawing') && <ExcalidrawPanel drawing={drawingDraft} noteId={activeNote.id} onChange={updateDrawingDraft} />}
                  </section>
                ) : (
                  <div className="grid min-h-[22rem] place-items-center rounded-[1.1rem] border border-white/12 bg-[#0d1d17] text-sm font-bold text-[#8fa89b]">
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
                <p className="mt-3 leading-7 text-[#8fa89b]">{t('noNoteBody')}</p>
              </div>
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

type NoteCardProps = {
  note: Note
  folder: FolderEntity | null
  active: boolean
  markdownPreview: string
  onSelect(): void
  onDelete(): void
}

function NoteCard({ note, folder, active, markdownPreview, onSelect, onDelete }: NoteCardProps) {
  const excerpt = markdownPreview.trim().replace(/[#*_>`-]/g, '').replace(/\s+/g, ' ').slice(0, 150)

  return (
    <article className={cn('group rounded-[1.1rem] border p-3 transition', active ? 'border-[var(--accent)] bg-[#20362d]' : 'border-white/10 bg-[#14251f]/75 hover:border-white/20 hover:bg-[#1a2c25]')}>
      <button className="w-full text-left" onClick={onSelect} type="button">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-white">{note.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#8fa89b]">
              <span className="h-2 w-2 rounded-sm border border-[var(--accent)]" />
              {folder?.name ?? 'Personal'}
            </p>
          </div>
          <span className="text-xs font-bold text-[#8fa89b]">{new Date(note.updatedAt).toLocaleDateString()}</span>
        </div>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-[#c7d4ca]">{excerpt || 'Markdown + Excalidraw note ready to edit.'}</p>
      </button>
      <button className="mt-3 hidden items-center gap-1 text-xs font-bold text-[#ff8b8b] group-hover:flex" onClick={onDelete} type="button">
        <Trash2 size={13} />
        Delete
      </button>
    </article>
  )
}

function getVisibleNotes(notes: Note[], folders: FolderEntity[], activeFolderId: FolderId | null, search: string): Note[] {
  const visibleFolderIds = activeFolderId ? [activeFolderId, ...collectDescendantFolderIds(activeFolderId, folders)] : null
  const normalizedSearch = search.trim().toLowerCase()

  return notes.filter((note) => {
    const matchesFolder = visibleFolderIds === null || (note.folderId !== null && visibleFolderIds.includes(note.folderId))
    const matchesSearch = !normalizedSearch || note.title.toLowerCase().includes(normalizedSearch)

    return matchesFolder && matchesSearch
  })
}

function collectDescendantFolderIds(folderId: FolderId, folders: FolderEntity[]): FolderId[] {
  const childFolders = folders.filter((folder) => folder.parentId === folderId)

  return childFolders.flatMap((folder) => [folder.id, ...collectDescendantFolderIds(folder.id, folders)])
}
