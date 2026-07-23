import { useEffect } from 'react'
import { useWorkspaceStore } from '@/app/state/workspace.store'

export function useThemeBridge(): void {
  const accentColor = useWorkspaceStore((state) => state.preferences?.accentColor ?? '#c7774a')
  const locale = useWorkspaceStore((state) => state.preferences?.locale ?? 'es')
  const themeId = useWorkspaceStore((state) => state.preferences?.themeId ?? 'forest')
  const fontFamily = useWorkspaceStore((state) => state.preferences?.fontFamily ?? 'system')

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor)
    document.documentElement.lang = locale
    document.body.dataset.theme = themeId
    document.body.dataset.font = fontFamily
  }, [accentColor, fontFamily, locale, themeId])
}
