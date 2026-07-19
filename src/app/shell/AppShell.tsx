import { EditorWorkspace } from '@/features/editor/EditorWorkspace'
import { Sidebar } from '@/features/library/Sidebar'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { useI18n } from '@/app/i18n/useI18n'
import { useWorkspaceStore } from '@/app/state/workspace.store'

export function AppShell() {
  const { t } = useI18n()
  const settingsOpen = useWorkspaceStore((state) => state.settingsOpen)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const dismissError = useWorkspaceStore((state) => state.dismissError)

  return (
    <div className="app-shell-bg h-svh overflow-hidden p-1 text-[var(--app-text)] sm:p-2 lg:p-3">
      <div className="theme-orb theme-orb-one" />
      <div className="theme-orb theme-orb-two" />
      <div className="app-shell-frame relative mx-auto flex h-full max-w-[96rem] flex-col overflow-hidden rounded-[1.35rem] border border-white/12 shadow-[0_42px_120px_rgb(0_0_0_/_0.34)] backdrop-blur lg:flex-row">
        <Sidebar />
        <EditorWorkspace />
        {settingsOpen ? (
          <div className="animate-fade-up fixed inset-3 z-30 lg:absolute lg:inset-y-5 lg:left-auto lg:right-5 lg:w-[30rem]">
            <SettingsPanel />
          </div>
        ) : null}
        {errorMessage ? (
          <div className="absolute bottom-4 left-4 right-4 z-40 rounded-2xl border border-red-400/30 bg-red-950/90 p-3 text-sm text-red-50 shadow-[0_18px_60px_rgb(0_0_0_/_0.35)] backdrop-blur md:left-auto md:max-w-md">
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 leading-6">{errorMessage}</p>
              <button className="rounded-full px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-red-100 hover:bg-white/10" onClick={dismissError} type="button">
                {t('close')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
