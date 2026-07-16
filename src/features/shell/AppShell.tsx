import { EditorWorkspace } from '@/features/editor/EditorWorkspace'
import { Sidebar } from '@/features/library/Sidebar'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { useWorkspaceStore } from '@/store/workspace.store'

export function AppShell() {
  const settingsOpen = useWorkspaceStore((state) => state.settingsOpen)

  return (
    <div className="h-svh overflow-hidden bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_28rem),linear-gradient(180deg,#263a31_0%,#12221c_52%,#09130f_100%)] p-1 text-ink sm:p-2 lg:p-3">
      <div className="relative mx-auto flex h-full max-w-[96rem] flex-col overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#0c1814] shadow-[0_42px_120px_rgb(0_0_0_/_0.34)] backdrop-blur lg:flex-row">
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
