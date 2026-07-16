import { startTransition, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Folder, FolderPlus, Plus, Search, Settings, Trash2 } from 'lucide-react'
import type { Folder as FolderEntity, FolderId } from '@/domain/folders/folder'
import { useI18n } from '@/i18n/useI18n'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { useWorkspaceStore } from '@/store/workspace.store'

export function Sidebar() {
  const { t } = useI18n()
  const folders = useWorkspaceStore((state) => state.folders)
  const notes = useWorkspaceStore((state) => state.notes)
  const activeFolderId = useWorkspaceStore((state) => state.activeFolderId)
  const activeNoteId = useWorkspaceStore((state) => state.activeNoteId)
  const preferences = useWorkspaceStore((state) => state.preferences)
  const search = useWorkspaceStore((state) => state.search)
  const selectFolder = useWorkspaceStore((state) => state.selectFolder)
  const selectNote = useWorkspaceStore((state) => state.selectNote)
  const createFolder = useWorkspaceStore((state) => state.createFolder)
  const createNote = useWorkspaceStore((state) => state.createNote)
  const deleteNote = useWorkspaceStore((state) => state.deleteNote)
  const deleteFolder = useWorkspaceStore((state) => state.deleteFolder)
  const setSearch = useWorkspaceStore((state) => state.setSearch)
  const setSettingsOpen = useWorkspaceStore((state) => state.setSettingsOpen)
  const [folderName, setFolderName] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const play = useSoundFeedback()
  const visibleFolderIds = activeFolderId ? [activeFolderId, ...collectDescendantFolderIds(activeFolderId, folders)] : null
  const normalizedSearch = search.trim().toLowerCase()
  const visibleNotes = notes.filter((note) => {
    const matchesFolder = visibleFolderIds === null || (note.folderId !== null && visibleFolderIds.includes(note.folderId))
    const matchesSearch = !normalizedSearch || note.title.toLowerCase().includes(normalizedSearch)

    return matchesFolder && matchesSearch
  })

  return (
    <aside className="flex max-h-none flex-col rounded-[2rem] border border-line bg-paper/95 p-4 shadow-soft backdrop-blur lg:max-h-[calc(100svh-1.5rem)] lg:w-[22rem]">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted">{t('appName')}</p>
          <h2 className="text-xl font-black tracking-[-0.04em] text-ink">{preferences?.displayName}</h2>
        </div>
        <Button
          aria-label={t('settings')}
          onClick={() => {
            play('open')
            setSettingsOpen(true)
          }}
          size="icon"
          variant="ghost"
        >
          <Settings size={18} />
        </Button>
      </header>

      <label className="relative mb-4 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
        <input
          className="h-11 w-full rounded-2xl border border-line bg-paper-soft pl-10 pr-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(event) => {
            const value = event.target.value
            startTransition(() => setSearch(value))
          }}
        />
      </label>

      <section className="rounded-3xl border border-line bg-cream/50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-black text-ink">{t('folders')}</p>
          <Button
            onClick={() => {
              selectFolder(null)
              play('tap')
            }}
            size="sm"
            variant={activeFolderId === null ? 'primary' : 'ghost'}
          >
            {t('allNotes')}
          </Button>
        </div>

        <div className="max-h-56 overflow-auto pr-1">
          {folders
            .filter((folder) => folder.parentId === null)
            .map((folder) => (
              <FolderNode
                activeFolderId={activeFolderId}
                deleteFolder={deleteFolder}
                folder={folder}
                folders={folders}
                key={folder.id}
                onSelect={(folderId) => {
                  selectFolder(folderId)
                  play('open')
                }}
              />
            ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()

            if (!folderName.trim()) {
              return
            }

            play('save')
            void createFolder(folderName, activeFolderId)
            setFolderName('')
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-2xl border border-line bg-paper px-3 text-sm outline-none focus:border-[var(--accent)]"
            placeholder={activeFolderId ? t('newSubfolder') : t('folderNamePlaceholder')}
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
          />
          <Button aria-label={t('newFolder')} size="icon" type="submit" variant="soft">
            <FolderPlus size={17} />
          </Button>
        </form>
      </section>

      <section className="mt-4 flex min-h-0 flex-1 flex-col rounded-3xl border border-line bg-paper-soft/70 p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-black text-ink">{t('notes')}</p>
          <span className="rounded-full bg-paper px-2 py-1 text-xs font-bold text-muted">{visibleNotes.length}</span>
        </div>

        <form
          className="mb-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()

            if (!noteTitle.trim()) {
              return
            }

            play('save')
            void createNote(noteTitle, activeFolderId)
            setNoteTitle('')
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-2xl border border-line bg-paper px-3 text-sm outline-none focus:border-[var(--accent)]"
            placeholder={t('noteNamePlaceholder')}
            value={noteTitle}
            onChange={(event) => setNoteTitle(event.target.value)}
          />
          <Button aria-label={t('newNote')} size="icon" type="submit" variant="primary">
            <Plus size={18} />
          </Button>
        </form>

        <div className="min-h-44 flex-1 space-y-2 overflow-auto pr-1">
          {visibleNotes.map((note) => (
            <article
              className={cn(
                'group rounded-2xl border p-3 transition',
                activeNoteId === note.id ? 'border-[var(--accent)] bg-paper shadow-soft' : 'border-line bg-paper/70 hover:border-[var(--accent)]',
              )}
              key={note.id}
            >
              <button
                className="flex w-full items-start gap-3 text-left"
                onClick={() => {
                  play('open')
                  void selectNote(note.id)
                }}
                type="button"
              >
                <FileText className="mt-0.5 shrink-0 text-muted" size={17} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-ink">{note.title}</span>
                  <span className="mt-1 block text-xs text-muted">{new Date(note.updatedAt).toLocaleDateString()}</span>
                </span>
              </button>
              <button
                className="mt-2 hidden text-xs font-bold text-red-600 group-hover:inline-flex"
                onClick={() => {
                  play('delete')
                  void deleteNote(note.id)
                }}
                type="button"
              >
                {t('delete')}
              </button>
            </article>
          ))}
        </div>
      </section>
    </aside>
  )
}

type FolderNodeProps = {
  folder: FolderEntity
  folders: FolderEntity[]
  activeFolderId: FolderId | null
  onSelect(folderId: FolderId): void
  deleteFolder(folderId: FolderId): Promise<void>
}

function FolderNode({ folder, folders, activeFolderId, onSelect, deleteFolder }: FolderNodeProps) {
  const [open, setOpen] = useState(true)
  const children = folders.filter((candidate) => candidate.parentId === folder.id)

  return (
    <div>
      <div className="group flex items-center gap-1 rounded-2xl px-1 py-1">
        <button className="rounded-full p-1 text-muted hover:bg-paper" onClick={() => setOpen((value) => !value)} type="button">
          {children.length > 0 ? open ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span className="block h-3.5 w-3.5" />}
        </button>
        <button
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm font-bold transition',
            activeFolderId === folder.id ? 'bg-[var(--accent)] text-white' : 'text-ink hover:bg-paper',
          )}
          onClick={() => onSelect(folder.id)}
          type="button"
        >
          <Folder size={15} />
          <span className="truncate">{folder.name}</span>
        </button>
        <button
          className="hidden rounded-full p-1 text-red-600 hover:bg-red-50 group-hover:block"
          onClick={() => void deleteFolder(folder.id)}
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {open && children.length > 0 ? (
        <div className="ml-5 border-l border-line pl-2">
          {children.map((child) => (
            <FolderNode activeFolderId={activeFolderId} deleteFolder={deleteFolder} folder={child} folders={folders} key={child.id} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function collectDescendantFolderIds(folderId: FolderId, folders: FolderEntity[]): FolderId[] {
  const childFolders = folders.filter((folder) => folder.parentId === folderId)

  return childFolders.flatMap((folder) => [folder.id, ...collectDescendantFolderIds(folder.id, folders)])
}
