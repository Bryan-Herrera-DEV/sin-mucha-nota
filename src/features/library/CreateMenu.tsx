import { FilePlus2, FolderPlus, Plus, ChevronDown } from 'lucide-react'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { useI18n } from '@/app/i18n/useI18n'
import { useLibraryUi } from './libraryUi.store'
import { useMenuAction } from '@/shared/hooks/useMenuAction'
import { Button } from '@/shared/ui/shadcn/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/shared/ui/shadcn/dropdown-menu'

export function CreateMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  const folderId = useWorkspaceStore((state) => state.workspaceView === 'dashboard' ? null : state.activeFolderId)
  const open = useLibraryUi((state) => state.open)
  const { selectAction, onCloseAutoFocus } = useMenuAction()
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" size={compact ? 'icon' : 'default'} className={compact ? '' : 'w-full justify-between'} aria-label={t('create')}>
          <Plus />{!compact && <><span className="flex-1 text-left">{t('create')}</span><ChevronDown className="size-4" /></>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 data-[state=closed]:animate-none" onCloseAutoFocus={onCloseAutoFocus}>
        <DropdownMenuLabel className="whitespace-normal text-xs font-normal text-muted-foreground">{t('createBody')}</DropdownMenuLabel>
        <DropdownMenuItem className="min-h-11" onSelect={() => selectAction(() => open({ type: 'create-note', folderId }))}><FilePlus2 />{t('newNote')}</DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" onSelect={() => selectAction(() => open({ type: 'create-folder', folderId }))}><FolderPlus />{t('newFolder')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
