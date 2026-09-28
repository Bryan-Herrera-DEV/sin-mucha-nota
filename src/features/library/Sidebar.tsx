import { memo, startTransition, useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Home, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings, X } from 'lucide-react'
import type { Folder as FolderEntity, FolderId } from '@/domain/folders/folder'
import { useI18n } from '@/app/i18n/useI18n'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { cn } from '@/shared/lib/cn'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { createFolderTreeIndex, type FolderTreeIndex } from '@/application/workspace/noteFilters'
import { Button } from '@/shared/ui/shadcn/button'
import { Input } from '@/shared/ui/shadcn/input'
import { CreateMenu } from './CreateMenu'
import { FolderMenu } from './EntityMenus'
import { folderIconMap } from './folderIcons'

export function Sidebar() {
  const { t } = useI18n()
  const folders = useWorkspaceStore((state) => state.folders)
  const notes = useWorkspaceStore((state) => state.notes)
  const activeFolderId = useWorkspaceStore((state) => state.activeFolderId)
  const view = useWorkspaceStore((state) => state.workspaceView)
  const preferences = useWorkspaceStore((state) => state.preferences)
  const search = useWorkspaceStore((state) => state.search)
  const selectFolder = useWorkspaceStore((state) => state.selectFolder)
  const setView = useWorkspaceStore((state) => state.setWorkspaceView)
  const setSearch = useWorkspaceStore((state) => state.setSearch)
  const setSettingsOpen = useWorkspaceStore((state) => state.setSettingsOpen)
  const collapsed = useWorkspaceStore((state) => state.sidebarCollapsed)
  const setCollapsed = useWorkspaceStore((state) => state.setSidebarCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const folderIndex = useMemo(() => createFolderTreeIndex(folders, notes), [folders, notes])
  const play = useSoundFeedback()
  const handleSelectFolder = useCallback((folderId: FolderId) => {
    selectFolder(folderId); setSearch(''); setMobileOpen(false); play('open')
  }, [play, selectFolder, setSearch])
  function home() { setView('dashboard'); setSearch(''); setMobileOpen(false); play('open') }
  function allNotes() { selectFolder(null); setSearch(''); setMobileOpen(false); play('open') }

  return (
    <aside className={cn('app-sidebar flex w-full shrink-0 flex-col border-b border-border lg:h-full lg:border-b-0 lg:border-r', collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64')}>
      <div className="flex h-14 shrink-0 items-center gap-2 px-3 lg:hidden">
        <button type="button" onClick={home} className="min-w-0 flex-1 truncate text-left font-bold tracking-tight" data-workspace-focus>sin mucha nota</button>
        <Button type="button" variant="ghost" size="icon" aria-label={t('dashboard')} onClick={home}><Home /></Button>
        <CreateMenu compact />
        <Button type="button" variant="ghost" size="icon" aria-label={t('folders')} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</Button>
      </div>
      {collapsed && <div className="hidden h-full flex-col items-center gap-3 p-3 lg:flex">
        <Button type="button" variant="ghost" size="icon" aria-label="Expandir menú" title="Expandir menú" onClick={() => setCollapsed(false)}><PanelLeftOpen /></Button>
        <Button type="button" variant={view === 'dashboard' ? 'secondary' : 'ghost'} size="icon" aria-label={t('dashboard')} title={t('dashboard')} onClick={home} data-workspace-focus><Home /></Button>
        <CreateMenu compact />
        <Button type="button" variant={view === 'notes' && !activeFolderId ? 'secondary' : 'ghost'} size="icon" aria-label={t('allNotes')} title={t('allNotes')} onClick={allNotes}><FileText /></Button>
        <div className="min-h-0 flex-1 space-y-2 overflow-auto">
          {folderIndex.rootFolders.map((folder) => {
            const Icon = folderIconMap[folder.icon]
            return <FolderMenu key={folder.id} folder={folder}><Button type="button" variant={view === 'notes' && activeFolderId === folder.id ? 'secondary' : 'ghost'} size="icon" title={folder.name} aria-label={folder.name} onClick={() => handleSelectFolder(folder.id)}><Icon size={16} /></Button></FolderMenu>
          })}
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label={t('settings')} title={t('settings')} onClick={() => setSettingsOpen(true)}><Settings /></Button>
      </div>}
      <div className={cn('min-h-0 flex-col gap-4 p-3', mobileOpen ? 'flex max-h-[60dvh]' : 'hidden', collapsed ? 'lg:hidden' : 'lg:flex lg:h-full lg:max-h-none')}>
        <div className="hidden items-center justify-between gap-2 lg:flex">
          <button className="min-w-0 truncate text-sm font-bold tracking-tight" type="button" onClick={home}>sin mucha nota</button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Colapsar menú" title="Colapsar menú" onClick={() => setCollapsed(true)}><PanelLeftClose /></Button>
        </div>
        <nav className="space-y-1" aria-label={t('appName')}>
          <Button type="button" variant={view === 'dashboard' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={home} data-workspace-focus><Home />{t('dashboard')}</Button>
          <Button type="button" variant={view === 'notes' && activeFolderId === null ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={allNotes}><FileText />{t('allNotes')}</Button>
        </nav>
        <CreateMenu />
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input aria-label={t('searchPlaceholder')} className="pl-9" placeholder={t('searchPlaceholder')} value={search} onChange={(event) => {
            const value = event.target.value
            setView('notes')
            startTransition(() => setSearch(value))
          }} />
        </div>
        <section className="min-h-0 flex-1 overflow-auto" aria-label={t('folders')}>
          <div className="mb-2 flex items-center justify-between px-2 text-xs font-medium text-muted-foreground"><span>{t('folders')}</span><span>{folders.length}</span></div>
          {folderIndex.rootFolders.map((folder) => <FolderNode activeFolderId={view === 'notes' ? activeFolderId : null} folder={folder} folderIndex={folderIndex} key={folder.id} onSelect={handleSelectFolder} depth={0} />)}
          {!folders.length && <p className="px-2 py-3 text-xs leading-5 text-muted-foreground">{t('createFolderBody')}</p>}
        </section>
        <button className="flex shrink-0 items-center gap-3 rounded-md border border-border p-3 text-left hover:bg-secondary" onClick={() => { play('open'); setSettingsOpen(true); setMobileOpen(false) }} type="button">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{preferences?.displayName.slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{preferences?.displayName}</span><span className="block text-xs text-muted-foreground">{t('settings')}</span></span>
          <Settings className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </aside>
  )
}

type FolderNodeProps = { folder: FolderEntity; folderIndex: FolderTreeIndex; activeFolderId: FolderId | null; onSelect(folderId: FolderId): void; depth: number }
const FolderNode = memo(function FolderNode({ folder, folderIndex, activeFolderId, onSelect, depth }: FolderNodeProps) {
  const [open, setOpen] = useState(true)
  const children = folderIndex.childrenByParent.get(folder.id) ?? []
  const Icon = folderIconMap[folder.icon]
  const count = folderIndex.noteCountByFolderId.get(folder.id) ?? 0
  return <div className="min-w-0">
    <FolderMenu folder={folder}>
      <div className={cn('flex min-w-0 items-center gap-0.5 rounded-md', activeFolderId === folder.id && 'bg-secondary')} style={{ paddingLeft: Math.min(depth, 4) * 12 }}>
        <button className="grid size-7 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-secondary disabled:cursor-default" aria-label={folder.name} aria-expanded={children.length ? open : undefined} disabled={!children.length} onClick={() => setOpen(!open)} type="button">
          {children.length ? open ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span className="size-3.5" />}
        </button>
        <button className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-2.5 pr-1 text-left text-sm hover:bg-secondary" title={folder.name} onClick={() => onSelect(folder.id)} type="button">
          <Icon className="shrink-0 text-muted-foreground" size={16} /><span className="min-w-0 flex-1 truncate">{folder.name}</span><span className="shrink-0 text-xs text-muted-foreground">{count}</span>
        </button>
        <FolderMenu folder={folder} />
      </div>
    </FolderMenu>
    {open && children.map((child) => <FolderNode activeFolderId={activeFolderId} folder={child} folderIndex={folderIndex} key={child.id} onSelect={onSelect} depth={depth + 1} />)}
  </div>
})
