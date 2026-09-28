import type { ComponentType, ReactElement } from 'react'
import { FilePlus2, FolderPlus, MoreHorizontal, FolderInput, Pencil, Trash2 } from 'lucide-react'
import type { Folder } from '@/domain/folders/folder'
import type { Note } from '@/domain/notes/note'
import { useI18n } from '@/app/i18n/useI18n'
import { useLibraryUi } from './libraryUi.store'
import { useMenuAction } from '@/shared/hooks/useMenuAction'
import { Button } from '@/shared/ui/shadcn/button'
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from '@/shared/ui/shadcn/context-menu'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/shared/ui/shadcn/dropdown-menu'

type MenuAction = { label: string; icon: ComponentType<{ className?: string }>; run(): void; destructive?: boolean }
function EntityMenu({ label, actions, children }: { label: string; actions: MenuAction[]; children?: ReactElement }) {
  const { t } = useI18n()
  const { selectAction, onCloseAutoFocus } = useMenuAction()
  if (children) return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56 data-[state=closed]:animate-none" onCloseAutoFocus={onCloseAutoFocus}>
        <ContextMenuLabel className="truncate" title={label}>{label}</ContextMenuLabel>
        <ContextMenuSeparator />
        {actions.map((action) => <ContextMenuItem className="min-h-10 gap-2" key={action.label} variant={action.destructive ? 'destructive' : 'default'} onSelect={() => selectAction(action.run)}><action.icon className="size-4" />{action.label}</ContextMenuItem>)}
      </ContextMenuContent>
    </ContextMenu>
  )
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground" aria-label={`${t('actions')}: ${label}`} title={t('actions')}><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 data-[state=closed]:animate-none" onCloseAutoFocus={onCloseAutoFocus}>
        <DropdownMenuLabel className="truncate" title={label}>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => <DropdownMenuItem className="min-h-10" key={action.label} variant={action.destructive ? 'destructive' : 'default'} onSelect={() => selectAction(action.run)}><action.icon className="size-4" />{action.label}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function FolderMenu({ folder, children }: { folder: Folder; children?: ReactElement }) {
  const { t } = useI18n()
  const open = useLibraryUi((state) => state.open)
  return <EntityMenu label={folder.name} children={children} actions={[
    { label: t('newNote'), icon: FilePlus2, run: () => open({ type: 'create-note', folderId: folder.id }) },
    { label: t('newSubfolder'), icon: FolderPlus, run: () => open({ type: 'create-folder', folderId: folder.id }) },
    { label: t('renameFolder'), icon: Pencil, run: () => open({ type: 'rename-folder', folder }) },
    { label: t('delete'), icon: Trash2, destructive: true, run: () => open({ type: 'delete-folder', folder }) },
  ]} />
}

export function NoteMenu({ note, children }: { note: Note; children?: ReactElement }) {
  const { t } = useI18n()
  const open = useLibraryUi((state) => state.open)
  return <EntityMenu label={note.title} children={children} actions={[
    { label: t('moveNote'), icon: FolderInput, run: () => open({ type: 'move-note', note }) },
    { label: t('delete'), icon: Trash2, destructive: true, run: () => open({ type: 'delete-note', note }) },
  ]} />
}
