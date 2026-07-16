import { useEffect, useState } from 'react'
import { AppShell } from '@/app/shell/AppShell'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { useThemeBridge } from '@/shared/hooks/useThemeBridge'
import { Button } from '@/shared/ui/Button'
import { translate } from '@/app/i18n/translations'
import { selectHasOnboarding } from '@/app/state/selectors'
import { useWorkspaceStore } from '@/app/state/workspace.store'

function App() {
  const [uiHydrated, setUiHydrated] = useState(() => useWorkspaceStore.persist.hasHydrated())
  const bootStatus = useWorkspaceStore((state) => state.bootStatus)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const hasOnboarding = useWorkspaceStore(selectHasOnboarding)
  const bootstrap = useWorkspaceStore((state) => state.bootstrap)
  useThemeBridge()

  useEffect(() => {
    const unsubscribe = useWorkspaceStore.persist.onFinishHydration(() => setUiHydrated(true))

    if (useWorkspaceStore.persist.hasHydrated()) {
      setUiHydrated(true)
    }

    return unsubscribe
  }, [])

  useEffect(() => {
    if (uiHydrated && bootStatus === 'idle') {
      void bootstrap()
    }
  }, [bootStatus, bootstrap, uiHydrated])

  if (!uiHydrated || bootStatus === 'loading' || bootStatus === 'idle') {
    return (
      <main className="app-shell-bg grid min-h-svh place-items-center px-6 text-center text-[var(--app-text)]">
        <div className="theme-orb theme-orb-one" />
        <div className="animate-fade-up rounded-[2rem] border border-white/12 bg-[var(--app-panel)] p-8 shadow-[0_32px_90px_rgb(0_0_0_/_0.3)]">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--app-muted)]">Notas Crema</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">{translate('es', 'loading')}</h1>
        </div>
      </main>
    )
  }

  if (bootStatus === 'error') {
    return (
      <main className="app-shell-bg grid min-h-svh place-items-center px-6 text-center text-[var(--app-text)]">
        <div className="animate-fade-up max-w-md rounded-[2rem] border border-white/12 bg-[var(--app-panel)] p-8 shadow-[0_32px_90px_rgb(0_0_0_/_0.3)]">
          <p className="text-sm text-red-100">{errorMessage}</p>
          <Button className="mt-5" onClick={() => void bootstrap()} variant="primary">
            {translate('es', 'retry')}
          </Button>
        </div>
      </main>
    )
  }

  return hasOnboarding ? <AppShell /> : <OnboardingPage />
}

export default App
