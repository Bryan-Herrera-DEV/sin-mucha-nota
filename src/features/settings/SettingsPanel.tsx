import { PanelRightClose, Palette, Type, Volume2 } from 'lucide-react'
import { accentColorOptions, fontOptions, type FontFamily, type Locale } from '@/domain/preferences/preferences'
import { useI18n } from '@/i18n/useI18n'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { Button } from '@/shared/ui/Button'
import { useWorkspaceStore } from '@/store/workspace.store'

export function SettingsPanel() {
  const { t } = useI18n()
  const preferences = useWorkspaceStore((state) => state.preferences)
  const storageMode = useWorkspaceStore((state) => state.storageMode)
  const updatePreferences = useWorkspaceStore((state) => state.updatePreferences)
  const setSettingsOpen = useWorkspaceStore((state) => state.setSettingsOpen)
  const play = useSoundFeedback()

  if (!preferences) {
    return null
  }

  return (
    <aside className="mt-3 flex max-h-none flex-col rounded-[2rem] border border-line bg-paper/95 p-4 shadow-soft backdrop-blur lg:mt-0 lg:max-h-[calc(100svh-1.5rem)] lg:w-[21rem]">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted">{t('settings')}</p>
          <h2 className="text-2xl font-black tracking-[-0.05em] text-ink">{t('interface')}</h2>
        </div>
        <Button
          aria-label={t('close')}
          onClick={() => {
            play('tap')
            setSettingsOpen(false)
          }}
          size="icon"
          variant="ghost"
        >
          <PanelRightClose size={18} />
        </Button>
      </header>

      <div className="space-y-5 overflow-auto pr-1">
        <section className="rounded-3xl border border-line bg-paper-soft/70 p-4">
          <p className="mb-3 text-sm font-black text-ink">{t('profile')}</p>
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            {t('nameLabel')}
            <input
              className="mt-2 h-11 w-full rounded-2xl border border-line bg-paper px-3 text-sm normal-case tracking-normal text-ink outline-none focus:border-[var(--accent)]"
              value={preferences.displayName}
              onChange={(event) => void updatePreferences({ displayName: event.target.value })}
            />
          </label>
          <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-muted">
            {t('languageLabel')}
            <select
              className="mt-2 h-11 w-full rounded-2xl border border-line bg-paper px-3 text-sm normal-case tracking-normal text-ink outline-none focus:border-[var(--accent)]"
              value={preferences.locale}
              onChange={(event) => void updatePreferences({ locale: event.target.value as Locale })}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
        </section>

        <section className="rounded-3xl border border-line bg-paper-soft/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
            <Palette size={17} />
            {t('accentLabel')}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {accentColorOptions.map((option) => (
              <button
                className="h-10 rounded-2xl border-2 transition hover:scale-105"
                key={option.value}
                onClick={() => {
                  play('tap')
                  void updatePreferences({ accentColor: option.value })
                }}
                style={{ background: option.value, borderColor: preferences.accentColor === option.value ? '#2f261f' : 'transparent' }}
                type="button"
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-paper-soft/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
            <Type size={17} />
            {t('fontLabel')}
          </div>
          <select
            className="h-11 w-full rounded-2xl border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-[var(--accent)]"
            value={preferences.fontFamily}
            onChange={(event) => void updatePreferences({ fontFamily: event.target.value as FontFamily })}
          >
            {fontOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {preferences.locale === 'es' ? option.labelEs : option.labelEn}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-3xl border border-line bg-paper-soft/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
            <Volume2 size={17} />
            {t('sounds')}
          </div>
          <Button
            className="w-full"
            onClick={() => {
              play('tap')
              void updatePreferences({ soundEnabled: !preferences.soundEnabled })
            }}
            variant={preferences.soundEnabled ? 'primary' : 'soft'}
          >
            {preferences.soundEnabled ? t('enabled') : t('disabled')}
          </Button>
        </section>

        <section className="rounded-3xl border border-line bg-cream/70 p-4 text-sm leading-7 text-muted">
          <p className="font-black text-ink">{t('storage')}</p>
          <p>{storageMode === 'opfs' ? t('storageOpfs') : t('storageIndexedDb')}</p>
        </section>
      </div>
    </aside>
  )
}
