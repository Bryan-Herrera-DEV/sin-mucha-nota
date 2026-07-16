import { useState } from 'react'
import { accentColorOptions, fontOptions, type FontFamily, type Locale } from '@/domain/preferences/preferences'
import { translate } from '@/i18n/translations'
import { useWorkspaceStore } from '@/store/workspace.store'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'

export function OnboardingPage() {
  const completeOnboarding = useWorkspaceStore((state) => state.completeOnboarding)
  const bootStatus = useWorkspaceStore((state) => state.bootStatus)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const [displayName, setDisplayName] = useState('')
  const [locale, setLocale] = useState<Locale>('es')
  const [fontFamily, setFontFamily] = useState<FontFamily>('system')
  const [accentColor, setAccentColor] = useState(accentColorOptions[0].value)
  const play = useSoundFeedback()
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)

  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-paper shadow-soft lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative isolate flex min-h-[30rem] flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,var(--paper-soft),var(--cream))] p-8 sm:p-10">
          <div className="absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-[var(--accent-soft)] blur-2xl" />
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-muted">{t('onboardingEyebrow')}</p>
            <h1 className="max-w-md text-4xl font-black tracking-[-0.05em] text-ink sm:text-6xl">{t('onboardingTitle')}</h1>
            <p className="mt-6 max-w-md text-base leading-8 text-muted">{t('onboardingBody')}</p>
          </div>
          <div className="rounded-3xl border border-line bg-paper/80 p-5 backdrop-blur">
            <p className="text-sm font-bold text-ink">Markdown + Excalidraw</p>
            <p className="mt-2 text-sm leading-7 text-muted">{t('appTagline')}</p>
          </div>
        </div>

        <form
          className="space-y-7 p-8 sm:p-10"
          onSubmit={(event) => {
            event.preventDefault()
            play('open')
            void completeOnboarding({ displayName, accentColor, fontFamily, locale })
          }}
        >
          <div>
            <label className="text-sm font-bold text-ink" htmlFor="displayName">
              {t('nameLabel')}
            </label>
            <input
              id="displayName"
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-paper-soft px-4 text-ink outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              placeholder={t('namePlaceholder')}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-bold text-ink">
              {t('languageLabel')}
              <select
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-paper-soft px-4 text-ink outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>

            <label className="text-sm font-bold text-ink">
              {t('fontLabel')}
              <select
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-paper-soft px-4 text-ink outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                value={fontFamily}
                onChange={(event) => setFontFamily(event.target.value as FontFamily)}
              >
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {locale === 'es' ? option.labelEs : option.labelEn}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <p className="text-sm font-bold text-ink">{t('accentLabel')}</p>
            <div className="mt-3 grid grid-cols-5 gap-3">
              {accentColorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'h-14 rounded-2xl border-2 bg-paper transition hover:scale-[1.03]',
                    accentColor === option.value ? 'border-ink shadow-soft' : 'border-line',
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

          {errorMessage ? <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}

          <Button className="w-full" disabled={bootStatus === 'loading'} type="submit" variant="primary">
            {bootStatus === 'loading' ? t('loading') : t('startButton')}
          </Button>
        </form>
      </section>
    </main>
  )
}
