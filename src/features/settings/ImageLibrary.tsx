import { useCallback, useEffect, useMemo, useState } from 'react'
import { Images, RefreshCw, Trash2 } from 'lucide-react'
import { useI18n } from '@/app/i18n/useI18n'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { workspaceService, type StoredImageAsset } from '@/application/workspace/workspaceService'
import { createAssetObjectUrls, formatBytes, revokeAssetObjectUrls } from '@/features/editor/imageAssets'
import { Button } from '@/shared/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/shared/ui/shadcn/dialog'

export function ImageLibrary() {
  const { t } = useI18n()
  const notes = useWorkspaceStore((state) => state.notes)
  const deleteImageAsset = useWorkspaceStore((state) => state.deleteImageAsset)
  const [entries, setEntries] = useState<StoredImageAsset[] | null>(null)
  const [pending, setPending] = useState<StoredImageAsset | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)

    try {
      // Read from the files, so the list matches what is actually stored.
      if (useWorkspaceStore.getState().isDirty) await useWorkspaceStore.getState().saveActiveNote()
      setEntries(await workspaceService.listImageAssets(useWorkspaceStore.getState().notes))
    } catch {
      setEntries([])
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, notes])

  // Previews come from the browser blob store, never from a megabyte-long src.
  const previews = useMemo(() => createAssetObjectUrls(Object.fromEntries((entries ?? []).map((entry) => [entry.asset.id, entry.asset]))), [entries])

  useEffect(() => () => revokeAssetObjectUrls(previews), [previews])

  const totalBytes = (entries ?? []).reduce((total, entry) => total + entry.asset.byteSize, 0)

  const confirmDelete = async () => {
    if (!pending || busy) return

    setBusy(true)

    try {
      await deleteImageAsset(pending.noteId, pending.asset.id)
      setPending(null)
      await load()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/6 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-white"><Images size={15} />{t('imageLibrary')}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{t('imageLibraryBody')}</p>
        </div>
        <Button aria-label={t('refresh')} onClick={() => void load()} size="icon" variant="ghost"><RefreshCw size={15} /></Button>
      </div>

      {entries === null ? (
        <p className="py-3 text-xs font-bold text-[var(--app-muted)]">{t('loading')}</p>
      ) : entries.length === 0 ? (
        <p className="py-3 text-xs leading-5 text-[var(--app-muted)]">{failed ? t('imageLibraryFailed') : t('imageLibraryEmpty')}</p>
      ) : (
        <>
          <p className="mb-2 text-xs font-bold text-[var(--app-muted)]">{entries.length} · {formatBytes(totalBytes)}</p>
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--app-panel-strong)] p-2" key={`${entry.noteId}:${entry.asset.id}`}>
                <img
                  alt={entry.asset.name}
                  className="h-10 w-10 shrink-0 rounded-lg border border-white/10 object-cover"
                  loading="lazy"
                  src={previews.get(entry.asset.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-white" title={entry.asset.name}>{entry.asset.name}</p>
                  <p className="truncate text-xs text-[var(--app-muted)]" title={entry.noteTitle}>
                    {formatBytes(entry.asset.byteSize)} · {entry.noteTitle}
                  </p>
                  {!entry.referenced ? (
                    <p className="mt-0.5 text-xs font-bold text-[var(--accent)]">{t('imageUnused')}</p>
                  ) : null}
                </div>
                <Button aria-label={`${t('deleteImage')}: ${entry.asset.name}`} onClick={() => setPending(entry)} size="icon" variant="ghost">
                  <Trash2 size={15} />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog onOpenChange={(open) => !open && setPending(null)} open={pending !== null}>
        <DialogContent>
          <DialogTitle>{t('deleteImage')}</DialogTitle>
          <DialogDescription>
            {pending?.referenced ? t('deleteImageUsedBody') : t('deleteImageBody')}
          </DialogDescription>
          <p className="truncate text-sm font-black text-white">{pending?.asset.name}</p>
          <DialogFooter>
            <Button onClick={() => setPending(null)} variant="ghost">{t('cancel')}</Button>
            <Button disabled={busy} onClick={() => void confirmDelete()} variant="danger">
              {busy ? t('sessionWorking') : t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
