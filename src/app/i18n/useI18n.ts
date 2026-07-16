import { translate, type TranslationKey } from '@/app/i18n/translations'
import { useWorkspaceStore } from '@/app/state/workspace.store'

export function useI18n(): { t: (key: TranslationKey) => string } {
  const locale = useWorkspaceStore((state) => state.preferences?.locale ?? 'es')

  return {
    t: (key) => translate(locale, key),
  }
}
