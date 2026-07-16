import { EditorWorkspace } from '@/features/editor/EditorWorkspace'
import { Sidebar } from '@/features/library/Sidebar'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { useWorkspaceStore } from '@/store/workspace.store'

export function AppShell() {
  const settingsOpen = useWorkspaceStore((state) => state.settingsOpen)

  return (
    <div className="min-h-svh px-3 py-4 text-ink sm:px-6 lg:px-10 lg:py-9">
      <div className="relative mx-auto flex min-h-[calc(100svh-2rem)] max-w-[92rem] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-paper/95 shadow-[0_42px_120px_rgb(124_91_46_/_0.18)] backdrop-blur lg:min-h-[calc(100svh-4.5rem)] lg:flex-row">
        <Sidebar />
        <EditorWorkspace />
        {settingsOpen ? (
          <div className="fixed inset-3 z-30 lg:absolute lg:inset-y-5 lg:left-auto lg:right-5 lg:w-[22rem]">
            <SettingsPanel />
          </div>
        ) : null}
      </div>
    </div>
  )
}
