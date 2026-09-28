import { useId, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/app/i18n/useI18n'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { folderIconOptions, type FolderIcon, type FolderId } from '@/domain/folders/folder'
import { collectFolderBranchIds } from '@/application/workspace/noteFilters'
import { Button } from '@/shared/ui/shadcn/button'
import { Input } from '@/shared/ui/shadcn/input'
import { Label } from '@/shared/ui/shadcn/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/shadcn/dialog'
import { FolderPicker, getFolderPath } from './FolderPicker'
import { useLibraryUi, type LibraryAction } from './libraryUi.store'
import { folderIconMap } from './folderIcons'

export function LibraryDialogs() {
  const action = useLibraryUi((state) => state.action)
  return action ? <LibraryActionDialog key={JSON.stringify(action)} action={action} /> : null
}

function LibraryActionDialog({ action }: { action: LibraryAction }) {
  const { t } = useI18n()
  const close = useLibraryUi((state) => state.close)
  const folders = useWorkspaceStore((state) => state.folders)
  const notes = useWorkspaceStore((state) => state.notes)
  const [name, setName] = useState(action.type === 'rename-folder' ? action.folder.name : '')
  const [folderId, setFolderId] = useState<FolderId | null>('folderId' in action ? action.folderId : 'note' in action ? action.note.folderId : action.folder.parentId)
  const [icon, setIcon] = useState<FolderIcon>('folder')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const nameId = useId()
  const locationId = useId()
  const isDelete = action.type === 'delete-note' || action.type === 'delete-folder'
  const isMove = action.type === 'move-note'
  const isFolder = action.type === 'create-folder'
  const title = t(action.type === 'create-note' ? 'newNote' : isFolder ? 'newFolder' : action.type === 'rename-folder' ? 'renameFolder' : isMove ? 'moveNote' : 'delete')
  const description = t(action.type === 'create-note' ? 'createNoteBody' : isFolder ? 'createFolderBody' : action.type === 'rename-folder' ? 'renameFolderBody' : isMove ? 'moveNoteBody' : action.type === 'delete-folder' ? 'deleteFolderBody' : 'deleteNoteBody')
  const destinationExists = folderId === null || folders.some((folder) => folder.id === folderId)
  const pathLabel = getFolderPath(folders, folderId).map((folder) => folder.name).join(' / ') || t(isFolder ? 'topLevel' : 'rootFolder')
  const deletedFolderIds = action.type === 'delete-folder' ? collectFolderBranchIds(action.folder.id, folders) : []
  const deletedNotesCount = action.type === 'delete-folder' ? notes.filter((note) => note.folderId && deletedFolderIds.includes(note.folderId)).length : 0
  const unchanged = isMove && folderId === action.note.folderId || action.type === 'rename-folder' && name.trim() === action.folder.name

  async function submit() {
    if (busy || unchanged || (!isDelete && !isMove && !name.trim()) || (!isDelete && !destinationExists)) return
    setBusy(true)
    setError('')
    const store = useWorkspaceStore.getState()
    store.dismissError()
    let success = false
    let message = t('deleted')
    try {
      switch (action.type) {
        case 'create-note': success = await store.createNote(name, folderId); message = t('noteCreated'); break
        case 'create-folder': success = await store.createFolder(name, folderId, icon); message = t('folderCreated'); break
        case 'rename-folder': success = await store.renameFolder(action.folder.id, name); message = t('folderRenamed'); break
        case 'move-note': success = await store.moveNote(action.note.id, folderId); message = t('noteMoved'); break
        case 'delete-note': await store.deleteNote(action.note.id); success = !useWorkspaceStore.getState().notes.some((note) => note.id === action.note.id); break
        case 'delete-folder': await store.deleteFolder(action.folder.id); success = !useWorkspaceStore.getState().folders.some((folder) => folder.id === action.folder.id); break
      }
      if (success) { toast.success(message); close() }
      else setError(useWorkspaceStore.getState().errorMessage ?? t('actionFailed'))
    } catch { setError(t('actionFailed')) }
    finally { setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) close() }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto text-foreground" showCloseButton={!busy} closeLabel={t('close')}
        onCloseAutoFocus={(event) => {
          // Context menu triggers may have disappeared after a move or deletion.
          event.preventDefault()
          Array.from(document.querySelectorAll<HTMLElement>('[data-workspace-focus]')).find((element) => element.offsetParent !== null)?.focus()
        }}>
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit() }}>
          <DialogHeader className="pr-6"><DialogTitle>{title}</DialogTitle><DialogDescription className="leading-6">{description}</DialogDescription></DialogHeader>
          {(isDelete || isMove) && <div className="rounded-md border bg-secondary/50 p-3">
            <p className="break-words text-sm font-medium">{'note' in action ? action.note.title : 'folder' in action ? action.folder.name : ''}</p>
            {action.type === 'delete-folder' && <p className="mt-2 text-xs text-muted-foreground">{deletedFolderIds.length} {t('folders').toLowerCase()} · {deletedNotesCount} {t('notes').toLowerCase()}</p>}
          </div>}
          {!isDelete && !isMove && <div className="space-y-2">
            <Label htmlFor={nameId}>{t(isFolder || action.type === 'rename-folder' ? 'name' : 'title')}</Label>
            <Input id={nameId} autoFocus required maxLength={240} value={name} disabled={busy} autoComplete="off"
              placeholder={t(isFolder || action.type === 'rename-folder' ? 'folderNamePlaceholder' : 'noteNamePlaceholder')}
              onChange={(event) => setName(event.target.value)} onFocus={(event) => { if (action.type === 'rename-folder') event.target.select() }} />
          </div>}
          {(isFolder || action.type === 'create-note' || isMove) && <div className="space-y-2">
            <Label id={locationId}>{t('location')}</Label>
            <FolderPicker value={folderId} onChange={setFolderId} topLevel={isFolder} disabled={busy} />
            <p className="text-xs leading-5 text-muted-foreground">{t('folderPickerHint')}</p>
            <p className="break-words rounded-md bg-secondary/60 px-3 py-2 text-xs leading-5 text-foreground">{t('location')}: {pathLabel}</p>
          </div>}
          {isFolder && <fieldset disabled={busy} className="space-y-2"><legend className="mb-2 text-sm font-medium">{t('icon')}</legend>
            <div className="flex flex-wrap gap-2">{folderIconOptions.map((option) => {
              const Icon = folderIconMap[option.value]
              return <Button type="button" key={option.value} variant={icon === option.value ? 'default' : 'outline'} size="icon" aria-pressed={icon === option.value} aria-label={option.label} title={option.label} onClick={() => setIcon(option.value)}><Icon size={16} /></Button>
            })}</div>
          </fieldset>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={busy}>{t('cancel')}</Button>
            <Button type="submit" variant={isDelete ? 'destructive' : 'default'} disabled={busy || unchanged || (!isDelete && !isMove && !name.trim()) || (!isDelete && !destinationExists)}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? t('saving') : t(isDelete ? 'delete' : isMove ? 'move' : action.type === 'rename-folder' ? 'rename' : 'create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
