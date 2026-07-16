import { EditorWorkspace } from '@/features/editor/EditorWorkspace'
import { Sidebar } from '@/features/library/Sidebar'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { useWorkspaceStore } from '@/app/state/workspace.store'

export function AppShell() {
  const settingsOpen = useWorkspaceStore((state) => state.settingsOpen)

  return (
    <div className="app-shell-bg h-svh overflow-hidden p-1 text-[var(--app-text)] sm:p-2 lg:p-3">
      <div className="theme-orb theme-orb-one" />
      <div className="theme-orb theme-orb-two" />
      <div className="app-shell-frame relative mx-auto flex h-full max-w-[96rem] flex-col overflow-hidden rounded-[1.35rem] border border-white/12 shadow-[0_42px_120px_rgb(0_0_0_/_0.34)] backdrop-blur lg:flex-row">
        <Sidebar />
        <EditorWorkspace />
        {settingsOpen ? (
          <div className="animate-fade-up fixed inset-3 z-30 lg:absolute lg:inset-y-5 lg:left-auto lg:right-5 lg:w-[22rem]">
            <SettingsPanel />
          </div>
        ) : null}
      </div>
    </div>
  )
}
