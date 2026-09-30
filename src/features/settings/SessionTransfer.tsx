import { useRef, useState } from 'react'
import { Download, Upload, Archive } from 'lucide-react'
import { useI18n } from '@/app/i18n/useI18n'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import type { SessionData } from '@/application/workspace/sessionArchive'
import { Button } from '@/shared/ui/Button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/shadcn/dialog'

export function SessionTransfer({ importOnly = false }: { importOnly?: boolean }) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const busy = useWorkspaceStore((state) => state.sessionBusy)
  const [pending, setPending] = useState<{ name: string; data: SessionData } | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const run = async (operation: () => Promise<void>) => {
    if (useWorkspaceStore.getState().sessionBusy) return
    useWorkspaceStore.setState({ sessionBusy: true })
    setMessage('')
    setError(false)
    try { await operation() }
    catch (cause) {
      console.error('Session transfer failed', cause)
      setError(true)
      setMessage(t('sessionFailed'))
    } finally {
      useWorkspaceStore.setState({ sessionBusy: false })
      void useWorkspaceStore.getState().bootstrap()
    }
  }

  const download = () => run(async () => {
    const { exportSession } = await import('@/application/workspace/sessionTransfer')
    const blob = await exportSession()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sin-mucha-nota-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    setMessage(t('sessionExported'))
  })

  const readArchive = (file: File) => run(async () => {
    const { readSessionArchive } = await import('@/application/workspace/sessionTransfer')
    const data = await readSessionArchive(file)
    setPending({ name: file.name, data })
  })

  const restore = () => run(async () => {
    if (!pending) return
    const { importSession } = await import('@/application/workspace/sessionTransfer')
    await importSession(pending.data)
    setPending(null)
    setMessage(t('sessionImported'))
  })

  return <section className="rounded-2xl border border-white/10 bg-white/6 p-3">
    <div className="mb-2 flex items-center gap-2 text-sm font-black text-white"><Archive size={17} />{t('sessionBackup')}</div>
    <p className="mb-3 text-xs leading-5 text-[var(--app-muted)]">{t('sessionBackupBody')}</p>
    <div className="flex flex-wrap gap-2">
      {!importOnly && <Button type="button" disabled={busy} onClick={() => void download()}><Download size={16} />{t('exportSession')}</Button>}
      <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}><Upload size={16} />{t('importSession')}</Button>
    </div>
    <input ref={inputRef} type="file" accept=".zip,application/zip,application/x-zip-compressed" className="hidden" aria-label={t('importSession')}
      onChange={(event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) void readArchive(file)
      }} />
    {busy && <p role="status" className="mt-3 text-xs text-[var(--app-muted)]">{t('sessionWorking')}</p>}
    {message && <p role={error ? 'alert' : 'status'} className={`mt-3 text-xs leading-5 ${error ? 'text-red-400' : 'text-[var(--accent)]'}`}>{message}</p>}
    <Dialog open={pending !== null} onOpenChange={(open) => { if (!open && !busy) setPending(null) }}>
      <DialogContent showCloseButton={!busy} closeLabel={t('close')}>
        <DialogTitle>{t('importSession')}</DialogTitle>
        <DialogDescription>{t('sessionReplaceBody')}</DialogDescription>
        {pending && <p className="break-words text-sm">{pending.name}<br />{pending.data.notes.length} {t('notes')} · {pending.data.folders.length} {t('folders')}</p>}
        <DialogFooter>
          <Button type="button" disabled={busy} onClick={() => setPending(null)}>{t('cancel')}</Button>
          <Button type="button" variant="primary" disabled={busy} onClick={() => void restore()}>{busy ? t('sessionWorking') : t('restoreSession')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
}
