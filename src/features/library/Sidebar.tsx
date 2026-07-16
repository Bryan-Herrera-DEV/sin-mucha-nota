import { startTransition, useState, type ComponentType } from 'react'
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Lightbulb,
  Plane,
  Plus,
  Settings,
  Trash2,
  Utensils,
  UserRound,
} from 'lucide-react'
import { folderIconOptions, type Folder as FolderEntity, type FolderIcon, type FolderId } from '@/domain/folders/folder'
import type { Note } from '@/domain/notes/note'
import { useI18n } from '@/i18n/useI18n'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { cn } from '@/shared/lib/cn'
import { useWorkspaceStore } from '@/store/workspace.store'

const folderIconMap: Record<FolderIcon, ComponentType<{ size?: number; className?: string }>> = {
  folder: Folder,
  project: Briefcase,
  book: BookOpen,
  idea: Lightbulb,
  travel: Plane,
  meeting: CalendarDays,
  recipe: Utensils,
  personal: UserRound,
}

export function Sidebar() {
  const { t } = useI18n()
  const folders = useWorkspaceStore((state) => state.folders)
  const notes = useWorkspaceStore((state) => state.notes)
  const activeFolderId = useWorkspaceStore((state) => state.activeFolderId)
  const preferences = useWorkspaceStore((state) => state.preferences)
  const search = useWorkspaceStore((state) => state.search)
  const selectFolder = useWorkspaceStore((state) => state.selectFolder)
  const createFolder = useWorkspaceStore((state) => state.createFolder)
  const deleteFolder = useWorkspaceStore((state) => state.deleteFolder)
  const setSearch = useWorkspaceStore((state) => state.setSearch)
  const setSettingsOpen = useWorkspaceStore((state) => state.setSettingsOpen)
  const [folderName, setFolderName] = useState('')
  const [folderIcon, setFolderIcon] = useState<FolderIcon>('folder')
  const play = useSoundFeedback()

  return (
    <aside className="flex min-h-0 flex-col border-b border-white/10 bg-[#10231d]/95 px-4 py-4 text-[#e8efe5] shadow-[inset_-1px_0_rgb(255_255_255_/_0.06)] lg:w-[18rem] lg:border-b-0 lg:border-r">
      <div className="mb-6 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>

      <nav className="space-y-2">
        <button
          className="flex w-full items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-left text-sm font-bold text-white shadow-[inset_0_1px_rgb(255_255_255_/_0.08)]"
          onClick={() => {
            selectFolder(null)
            play('open')
          }}
          type="button"
        >
          <FileText size={16} />
          Daily notes
        </button>
        <button
          className={cn(
            'flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold text-[#d8e5d9] transition hover:bg-white/8',
            activeFolderId === null && 'text-white',
          )}
          onClick={() => {
            selectFolder(null)
            play('tap')
          }}
          type="button"
        >
          <BookOpen size={16} />
          {t('allNotes')}
        </button>
      </nav>

      <label className="relative mt-5 block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa89b]">⌕</span>
        <input
          className="h-10 w-full rounded-full border border-white/10 bg-black/15 pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#8fa89b] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(event) => {
            const value = event.target.value
            startTransition(() => setSearch(value))
          }}
        />
      </label>

      <div className="my-5 h-px bg-white/10" />

      <section className="min-h-0 flex-1 overflow-auto pr-1">
        <div className="mb-3 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-[0.18em] text-[#8fa89b]">
          <span>{t('folders')}</span>
          <span>{folders.length}</span>
        </div>

        <div className="space-y-1">
          {folders
            .filter((folder) => folder.parentId === null)
            .map((folder) => (
              <FolderNode
                activeFolderId={activeFolderId}
                deleteFolder={deleteFolder}
                folder={folder}
                folders={folders}
                key={folder.id}
                notes={notes}
                onSelect={(folderId) => {
                  selectFolder(folderId)
                  play('open')
                }}
              />
            ))}
        </div>
      </section>

      <form
        className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/15 p-2"
        onSubmit={(event) => {
          event.preventDefault()

          if (!folderName.trim()) {
            return
          }

          play('save')
          void createFolder(folderName, activeFolderId, folderIcon)
          setFolderName('')
          setFolderIcon('folder')
        }}
      >
        <div className="mb-2 grid grid-cols-[4.2rem_minmax(0,1fr)] gap-2">
          <select
            className="h-10 rounded-full border border-white/10 bg-[#183027] px-2 text-xs font-bold text-white outline-none focus:border-[var(--accent)]"
            value={folderIcon}
            onChange={(event) => setFolderIcon(event.target.value as FolderIcon)}
          >
            {folderIconOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            className="h-10 rounded-full border border-white/10 bg-[#183027] px-3 text-sm text-white outline-none placeholder:text-[#8fa89b] focus:border-[var(--accent)]"
            placeholder={activeFolderId ? t('newSubfolder') : t('folderNamePlaceholder')}
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
          />
        </div>
        <button className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-sm font-black text-white transition hover:bg-[var(--accent-strong)]" type="submit">
          <Plus size={16} />
          {t('newFolder')}
        </button>
      </form>

      <button
        className="mt-4 flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/8 p-3 text-left"
        onClick={() => {
          play('open')
          setSettingsOpen(true)
        }}
        type="button"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-sm font-black text-white">
          {preferences?.displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-white">{preferences?.displayName}</span>
          <span className="block truncate text-xs text-[#8fa89b]">{t('settings')}</span>
        </span>
        <Settings className="text-[#8fa89b]" size={16} />
      </button>
    </aside>
  )
}

type FolderNodeProps = {
  folder: FolderEntity
  folders: FolderEntity[]
  notes: Note[]
  activeFolderId: FolderId | null
  onSelect(folderId: FolderId): void
  deleteFolder(folderId: FolderId): Promise<void>
}

function FolderNode({ folder, folders, notes, activeFolderId, onSelect, deleteFolder }: FolderNodeProps) {
  const [open, setOpen] = useState(true)
  const children = folders.filter((candidate) => candidate.parentId === folder.id)
  const FolderIcon = folderIconMap[folder.icon]
  const count = countNotesInFolder(folder.id, folders, notes)

  return (
    <div>
      <div className="group flex items-center gap-1 rounded-2xl py-1">
        <button className="rounded-full p-1 text-[#8fa89b] hover:bg-white/10" onClick={() => setOpen((value) => !value)} type="button">
          {children.length > 0 ? open ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span className="block h-3.5 w-3.5" />}
        </button>
        <button
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 text-left text-sm font-semibold transition',
            activeFolderId === folder.id ? 'bg-white/12 text-white' : 'text-[#d8e5d9] hover:bg-white/8',
          )}
          onClick={() => onSelect(folder.id)}
          type="button"
        >
          <FolderIcon className="shrink-0" size={16} />
          <span className="truncate">{folder.name}</span>
          <span className="ml-auto text-xs text-[#8fa89b]">{count}</span>
        </button>
        <button
          className="hidden rounded-full p-1 text-[#ff8b8b] hover:bg-red-500/10 group-hover:block"
          onClick={() => void deleteFolder(folder.id)}
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {open && children.length > 0 ? (
        <div className="ml-5 border-l border-white/10 pl-2">
          {children.map((child) => (
            <FolderNode activeFolderId={activeFolderId} deleteFolder={deleteFolder} folder={child} folders={folders} key={child.id} notes={notes} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function countNotesInFolder(folderId: FolderId, folders: FolderEntity[], notes: Note[]): number {
  const folderIds = [folderId, ...collectDescendantFolderIds(folderId, folders)]

  return notes.filter((note) => note.folderId !== null && folderIds.includes(note.folderId)).length
}

function collectDescendantFolderIds(folderId: FolderId, folders: FolderEntity[]): FolderId[] {
  const childFolders = folders.filter((folder) => folder.parentId === folderId)

  return childFolders.flatMap((folder) => [folder.id, ...collectDescendantFolderIds(folder.id, folders)])
}
