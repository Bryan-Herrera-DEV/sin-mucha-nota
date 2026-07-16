import { useEffect } from 'react'
import { useWorkspaceStore } from '@/store/workspace.store'

export function useThemeBridge(): void {
  const preferences = useWorkspaceStore((state) => state.preferences)

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', preferences?.accentColor ?? '#c7774a')
    document.documentElement.lang = preferences?.locale ?? 'es'
    document.body.dataset.font = preferences?.fontFamily ?? 'system'
  }, [preferences])
}
