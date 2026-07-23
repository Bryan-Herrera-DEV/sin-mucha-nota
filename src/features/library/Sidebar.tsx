import { memo, startTransition, useCallback, useMemo, useState, type ComponentType } from 'react'
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Lightbulb,
  PanelLeftClose,
  PanelLeftOpen,
  Plane,
  Plus,
  Settings,
  Trash2,
  Utensils,
  UserRound,
} from 'lucide-react'
import { folderIconOptions, type Folder as FolderEntity, type FolderIcon, type FolderId } from '@/domain/folders/folder'
import { useI18n } from '@/app/i18n/useI18n'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { cn } from '@/shared/lib/cn'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { createFolderTreeIndex, type FolderTreeIndex } from '@/application/workspace/noteFilters'

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
  const sidebarCollapsed = useWorkspaceStore((state) => state.sidebarCollapsed)
  const setSidebarCollapsed = useWorkspaceStore((state) => state.setSidebarCollapsed)
  const [folderName, setFolderName] = useState('')
  const [folderIcon, setFolderIcon] = useState<FolderIcon>('folder')
  const folderIndex = useMemo(() => createFolderTreeIndex(folders, notes), [folders, notes])
  const play = useSoundFeedback()
  const handleSelectFolder = useCallback((folderId: FolderId) => {
    selectFolder(folderId)
    play('open')
  }, [play, selectFolder])

  return (
    <>
      {sidebarCollapsed ? (
      <aside className="app-sidebar flex min-h-0 w-full flex-row items-center gap-2 border-b border-white/10 px-3 py-2 shadow-[inset_-1px_0_rgb(255_255_255_/_0.06)] lg:h-full lg:w-[4.6rem] lg:flex-col lg:border-b-0 lg:border-r lg:py-3">
        <button
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-white transition hover:bg-white/12"
          onClick={() => {
            play('open')
            setSidebarCollapsed(false)
          }}
          title="Expandir menu"
          type="button"
        >
          <PanelLeftOpen size={15} />
        </button>
        <button
          className={cn(
            'grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 transition hover:bg-white/12 hover:text-white',
            activeFolderId === null ? 'bg-white/10 text-white' : 'text-[#d8e5d9]',
          )}
          onClick={() => {
            selectFolder(null)
            setSearch('')
            play('open')
          }}
          title={t('allNotes')}
          type="button"
        >
          <FileText size={15} />
        </button>
        <div className="flex min-w-0 flex-1 gap-2 overflow-auto lg:w-full lg:flex-col lg:items-center">
            {folderIndex.rootFolders.map((folder) => {
              const FolderIcon = folderIconMap[folder.icon]

              return (
                <button
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#d8e5d9] transition hover:bg-white/10 hover:text-white',
                    activeFolderId === folder.id && 'bg-white/12 text-white',
                  )}
                  key={folder.id}
                  onClick={() => {
                    selectFolder(folder.id)
                    play('open')
                  }}
                  title={folder.name}
                  type="button"
                >
                  <FolderIcon size={15} />
                </button>
              )
            })}
        </div>
        <button
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--app-muted)] transition hover:bg-white/10 hover:text-white"
          onClick={() => {
            play('open')
            setSettingsOpen(true)
          }}
          title={t('settings')}
          type="button"
        >
          <Settings size={15} />
        </button>
      </aside>
      ) : (
    <aside className="app-sidebar flex min-h-0 flex-col border-b border-white/10 px-3 py-3 shadow-[inset_-1px_0_rgb(255_255_255_/_0.06)] lg:w-[16.5rem] lg:border-b-0 lg:border-r">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <button
          className="ml-auto grid h-8 w-8 place-items-center rounded-full text-[var(--app-muted)] transition hover:bg-white/10 hover:text-white"
          onClick={() => {
            play('open')
            setSidebarCollapsed(true)
          }}
          title="Colapsar menu"
          type="button"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      <nav className="space-y-2">
        <button
          className={cn(
            'flex w-full items-center gap-3 rounded-full border px-3 py-2 text-left text-sm font-bold transition',
            activeFolderId === null
              ? 'border-white/15 bg-white/10 text-white shadow-[inset_0_1px_rgb(255_255_255_/_0.08)]'
              : 'border-transparent text-[#d8e5d9] hover:bg-white/8 hover:text-white',
          )}
          onClick={() => {
            selectFolder(null)
            setSearch('')
            play('open')
          }}
          type="button"
        >
          <FileText size={16} />
          {t('allNotes')}
        </button>
      </nav>

      <label className="relative mt-4 block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]">⌕</span>
        <input
          className="h-9 w-full rounded-full border border-white/10 bg-black/15 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(event) => {
            const value = event.target.value
            startTransition(() => setSearch(value))
          }}
        />
      </label>

      <div className="my-4 h-px bg-white/10" />

      <section className="min-h-0 flex-1 overflow-auto pr-1">
        <div className="mb-2 flex items-center justify-between px-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--app-muted)]">
          <span>{t('folders')}</span>
          <span>{folders.length}</span>
        </div>

        <div className="space-y-1">
            {folderIndex.rootFolders.map((folder) => (
              <FolderNode
                activeFolderId={activeFolderId}
                deleteFolder={deleteFolder}
                folder={folder}
                folderIndex={folderIndex}
                key={folder.id}
                onSelect={handleSelectFolder}
              />
            ))}
        </div>
      </section>

      <form
        className="mt-3 rounded-[1.15rem] border border-white/10 bg-black/15 p-2"
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
        <div className="mb-2 space-y-2">
          <div className="grid grid-cols-8 gap-1" role="radiogroup" aria-label="Folder icon">
            {folderIconOptions.map((option) => {
              const Icon = folderIconMap[option.value]

              return (
                <button
                  aria-label={option.label}
                  aria-checked={folderIcon === option.value}
                  className={cn(
                    'grid h-8 place-items-center rounded-full border text-[var(--app-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-white',
                    folderIcon === option.value ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-white' : 'border-white/10 bg-[var(--app-panel)]',
                  )}
                  key={option.value}
                  onClick={() => setFolderIcon(option.value)}
                  role="radio"
                  title={option.label}
                  type="button"
                >
                  <Icon size={15} />
                </button>
              )
            })}
          </div>
          <input
            className="w-full h-9 rounded-full border border-white/10 bg-[var(--app-panel)] px-3 text-sm text-white outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--accent)]"
            placeholder={activeFolderId ? t('newSubfolder') : t('folderNamePlaceholder')}
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
          />
        </div>
        <button className="flex h-9 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-sm font-black text-white transition hover:bg-[var(--accent-strong)]" type="submit">
          <Plus size={16} />
          {t('newFolder')}
        </button>
      </form>

      <button
        className="mt-3 flex items-center gap-3 rounded-[1.1rem] border border-white/10 bg-white/8 p-2.5 text-left"
        onClick={() => {
          play('open')
          setSettingsOpen(true)
        }}
        type="button"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent)] text-sm font-black text-white">
          {preferences?.displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-white">{preferences?.displayName}</span>
          <span className="block truncate text-xs text-[var(--app-muted)]">{t('settings')}</span>
        </span>
        <Settings className="text-[var(--app-muted)]" size={16} />
      </button>
    </aside>
      )}
    </>
  )
}

type FolderNodeProps = {
  folder: FolderEntity
  folderIndex: FolderTreeIndex
  activeFolderId: FolderId | null
  onSelect(folderId: FolderId): void
  deleteFolder(folderId: FolderId): Promise<void>
}

const FolderNode = memo(function FolderNode({ folder, folderIndex, activeFolderId, onSelect, deleteFolder }: FolderNodeProps) {
  const [open, setOpen] = useState(true)
  const children = folderIndex.childrenByParent.get(folder.id) ?? []
  const FolderIcon = folderIconMap[folder.icon]
  const count = folderIndex.noteCountByFolderId.get(folder.id) ?? 0

  return (
    <div>
      <div className="group flex items-center gap-1 rounded-2xl py-1">
        <button className="rounded-full p-1 text-[var(--app-muted)] hover:bg-white/10" onClick={() => setOpen((value) => !value)} type="button">
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
          <span className="ml-auto text-xs text-[var(--app-muted)]">{count}</span>
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
              <FolderNode activeFolderId={activeFolderId} deleteFolder={deleteFolder} folder={child} folderIndex={folderIndex} key={child.id} onSelect={onSelect} />
            ))}
          </div>
      ) : null}
    </div>
  )
})
