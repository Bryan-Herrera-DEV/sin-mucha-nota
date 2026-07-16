import { EditorWorkspace } from '@/features/editor/EditorWorkspace'
import { Sidebar } from '@/features/library/Sidebar'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { useWorkspaceStore } from '@/store/workspace.store'

export function AppShell() {
  const settingsOpen = useWorkspaceStore((state) => state.settingsOpen)

  return (
    <div className="flex min-h-svh flex-col bg-[radial-gradient(circle_at_top_right,var(--accent-soft),transparent_24rem)] p-3 text-ink lg:flex-row lg:gap-3">
      <Sidebar />
      <EditorWorkspace />
      {settingsOpen ? <SettingsPanel /> : null}
    </div>
  )
}
