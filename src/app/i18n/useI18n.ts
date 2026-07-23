import { useCallback, useMemo } from 'react'
import { translate, type TranslationKey } from '@/app/i18n/translations'
import { useWorkspaceStore } from '@/app/state/workspace.store'

export function useI18n(): { t: (key: TranslationKey) => string } {
  const locale = useWorkspaceStore((state) => state.preferences?.locale ?? 'es')
  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale])

  return useMemo(() => ({ t }), [t])
}
