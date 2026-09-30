import { lazy, Suspense, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EditorWorkspace } from '@/features/editor/EditorWorkspace'
import { Sidebar } from '@/features/library/Sidebar'
import { useI18n } from '@/app/i18n/useI18n'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { sidePanelPresence, toastPresence } from '@/shared/lib/motionPresets'
import { LibraryDialogs } from '@/features/library/LibraryDialogs'
import { Toaster } from '@/shared/ui/shadcn/sonner'

const Dashboard = lazy(async () => {
  const module = await import('@/features/dashboard/Dashboard')
  return { default: module.Dashboard }
})

const SettingsPanel = lazy(async () => {
  const module = await import('@/features/settings/SettingsPanel')

  return { default: module.SettingsPanel }
})

export function AppShell() {
  const { t } = useI18n()
  const settingsOpen = useWorkspaceStore((state) => state.settingsOpen)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const dismissError = useWorkspaceStore((state) => state.dismissError)
  const view = useWorkspaceStore((state) => state.workspaceView)
  const sessionBusy = useWorkspaceStore((state) => state.sessionBusy)
  const sessionRevision = useWorkspaceStore((state) => state.sessionRevision)
  const isDirty = useWorkspaceStore((state) => state.isDirty)
  const contentStatus = useWorkspaceStore((state) => state.contentStatus)
  const markdownDraft = useWorkspaceStore((state) => state.markdownDraft)
  const drawingDraft = useWorkspaceStore((state) => state.drawingDraft)
  const saveActiveNote = useWorkspaceStore((state) => state.saveActiveNote)

  useEffect(() => {
    if (!isDirty || contentStatus === 'saving' || contentStatus === 'error') return
    const timer = window.setTimeout(() => void saveActiveNote(), 1000)
    return () => window.clearTimeout(timer)
  }, [contentStatus, isDirty, markdownDraft, drawingDraft, saveActiveNote])

  return (
    <div className="app-shell-bg h-dvh overflow-hidden text-[var(--app-text)]">
        <div inert={sessionBusy} className="app-shell-frame relative flex h-full w-full flex-col overflow-hidden lg:flex-row">
          <Sidebar />
          <Suspense fallback={<div className="app-workspace min-w-0 flex-1" />}>
            {view === 'dashboard' ? <Dashboard key={sessionRevision} /> : <EditorWorkspace />}
          </Suspense>
          <LibraryDialogs />
          <Toaster position="bottom-right" closeButton />
          <AnimatePresence>
            {settingsOpen ? (
              <motion.div
                className="fixed inset-3 z-30 lg:absolute lg:inset-y-5 lg:left-auto lg:right-5 lg:w-[30rem]"
                key="settings"
                style={{ willChange: 'transform, opacity' }}
                {...sidePanelPresence}
              >
                <Suspense fallback={<div className="app-settings grid h-full place-items-center rounded-[1.5rem] text-sm font-bold text-[var(--app-muted)]">{t('loading')}</div>}>
                  <SettingsPanel />
                </Suspense>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AnimatePresence>
            {errorMessage ? (
              <motion.div
                className="absolute bottom-4 left-4 right-4 z-40 rounded-2xl border border-red-400/30 bg-red-950/95 p-3 text-sm text-red-50 shadow-[0_18px_60px_rgb(0_0_0_/_0.35)] md:left-auto md:max-w-md"
                key="global-error"
                style={{ willChange: 'transform, opacity' }}
                {...toastPresence}
              >
                <div className="flex items-start gap-3">
                  <p className="min-w-0 flex-1 leading-6">{errorMessage}</p>
                  <button className="rounded-full px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-red-100 hover:bg-white/10" onClick={dismissError} type="button">
                    {t('close')}
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        {sessionBusy && <div role="status" aria-live="polite" className="fixed inset-0 z-[60] grid place-items-center bg-black/60 text-sm font-bold text-white">{t('sessionWorking')}</div>}
    </div>
  )
}
