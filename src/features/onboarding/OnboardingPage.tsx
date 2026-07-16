import { useEffect, useState } from 'react'
import { accentColorOptions, fontOptions, themeOptions, type FontFamily, type Locale, type ThemeId } from '@/domain/preferences/preferences'
import { translate } from '@/app/i18n/translations'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { Select } from '@/shared/ui/Select'

const defaultTheme = themeOptions[0]

export function OnboardingPage() {
  const completeOnboarding = useWorkspaceStore((state) => state.completeOnboarding)
  const bootStatus = useWorkspaceStore((state) => state.bootStatus)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const [displayName, setDisplayName] = useState('')
  const [locale, setLocale] = useState<Locale>('es')
  const [themeId, setThemeId] = useState<ThemeId>(defaultTheme.value)
  const [fontFamily, setFontFamily] = useState<FontFamily>('system')
  const [accentColor, setAccentColor] = useState(defaultTheme.accentColor)
  const play = useSoundFeedback()
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)

  useEffect(() => {
    document.body.dataset.theme = themeId
    document.body.dataset.font = fontFamily
    document.documentElement.style.setProperty('--accent', accentColor)
  }, [accentColor, fontFamily, themeId])

  return (
    <main className="app-shell-bg grid h-svh place-items-center overflow-auto px-4 py-6 text-[var(--app-text)]">
      <div className="theme-orb theme-orb-one" />
      <div className="theme-orb theme-orb-two" />

      <section className="welcome-card relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[1.8rem] border border-white/12 shadow-[0_42px_120px_rgb(0_0_0_/_0.34)] lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative isolate flex min-h-[34rem] flex-col justify-between overflow-hidden p-7 sm:p-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_10%,var(--accent-soft),transparent_18rem)]" />
          <div className="animate-fade-up">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-[var(--app-muted)]">{t('onboardingEyebrow')}</p>
            <h1 className="max-w-lg text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl">{t('onboardingTitle')}</h1>
            <p className="mt-6 max-w-md text-base leading-8 text-[var(--app-muted)]">{t('onboardingBody')}</p>
          </div>

          <div className="relative mt-8 h-60">
            <div className="welcome-note-preview animate-float-slow absolute left-0 top-2 w-[72%] rounded-[1.35rem] border border-white/12 p-5 shadow-[0_26px_80px_rgb(0_0_0_/_0.28)]">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--app-muted)]">Markdown</p>
              <p className="mt-2 text-xl font-black tracking-[-0.04em] text-white"># Ideas que respiran</p>
              <div className="mt-4 space-y-2">
                <span className="block h-2 rounded-full bg-white/16" />
                <span className="block h-2 w-4/5 rounded-full bg-white/10" />
                <span className="block h-2 w-2/3 rounded-full bg-[color-mix(in_srgb,var(--accent)_70%,transparent)]" />
              </div>
            </div>
            <div className="welcome-drawing-preview animate-float-slow-reverse absolute bottom-0 right-0 w-[54%] rounded-[1.35rem] border border-white/12 p-4 shadow-[0_26px_80px_rgb(0_0_0_/_0.24)]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--app-muted)]">Excalidraw</p>
              <div className="mt-5 grid h-24 place-items-center rounded-2xl border border-dashed border-[var(--accent)]/60 bg-[var(--accent-soft)]">
                <div className="h-12 w-28 rotate-[-4deg] rounded-xl border-2 border-[var(--accent)] bg-white/8" />
              </div>
            </div>
          </div>
        </div>

        <form
          className="space-y-6 border-t border-white/10 bg-black/10 p-7 backdrop-blur sm:p-10 lg:border-l lg:border-t-0"
          onSubmit={(event) => {
            event.preventDefault()
            play('open')
            void completeOnboarding({ displayName, accentColor, themeId, fontFamily, locale })
          }}
        >
          <div>
            <label className="text-sm font-black text-white" htmlFor="displayName">
              {t('nameLabel')}
            </label>
            <input
              id="displayName"
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[var(--app-panel-strong)] px-4 text-white outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              placeholder={t('namePlaceholder')}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-black text-white">
              {t('languageLabel')}
              <Select
                className="mt-2 h-11 rounded-2xl"
                onValueChange={(value) => setLocale(value as Locale)}
                options={[
                  { value: 'es', label: 'Español' },
                  { value: 'en', label: 'English' },
                ]}
                value={locale}
              />
            </label>

            <label className="text-sm font-black text-white">
              {t('fontLabel')}
              <Select
                className="mt-2 h-11 rounded-2xl"
                onValueChange={(value) => setFontFamily(value as FontFamily)}
                options={fontOptions.map((option) => ({
                  value: option.value,
                  label: locale === 'es' ? option.labelEs : option.labelEn,
                }))}
                value={fontFamily}
              />
            </label>
          </div>

          <div>
            <div className="mb-3">
              <p className="text-sm font-black text-white">{t('themeLabel')}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{t('themeBody')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {themeOptions.map((theme) => (
                <button
                  className={cn('theme-card text-left', themeId === theme.value && 'theme-card-selected')}
                  key={theme.value}
                  onClick={() => {
                    setThemeId(theme.value)
                    setAccentColor(theme.accentColor)
                    play('open')
                  }}
                  type="button"
                >
                  <span className="theme-card-preview" style={{ background: `linear-gradient(135deg, ${theme.preview[0]}, ${theme.preview[1]})` }} />
                  <span>
                    <span className="block text-sm font-black text-white">{locale === 'es' ? theme.labelEs : theme.labelEn}</span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">{locale === 'es' ? theme.descriptionEs : theme.descriptionEn}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-black text-white">{t('accentLabel')}</p>
            <div className="mt-3 grid grid-cols-5 gap-3">
              {accentColorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'h-12 rounded-2xl border-2 transition hover:scale-[1.03]',
                    accentColor === option.value ? 'border-white shadow-[0_16px_40px_var(--accent-soft)]' : 'border-white/10',
                  )}
                  aria-label={option.label}
                  style={{ background: option.value }}
                  onClick={() => {
                    setAccentColor(option.value)
                    document.documentElement.style.setProperty('--accent', option.value)
                    play('tap')
                  }}
                />
              ))}
            </div>
          </div>

          {errorMessage ? <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{errorMessage}</p> : null}

          <Button className="h-12 w-full text-sm font-black" disabled={bootStatus === 'loading'} type="submit" variant="primary">
            {bootStatus === 'loading' ? t('loading') : t('startButton')}
          </Button>
        </form>
      </section>
    </main>
  )
}
