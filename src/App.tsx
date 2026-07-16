import { useEffect } from 'react'
import { AppShell } from '@/features/shell/AppShell'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { useThemeBridge } from '@/shared/hooks/useThemeBridge'
import { Button } from '@/shared/ui/Button'
import { translate } from '@/i18n/translations'
import { selectHasOnboarding } from '@/store/selectors'
import { useWorkspaceStore } from '@/store/workspace.store'

function App() {
  const uiHydrated = useWorkspaceStore((state) => state.uiHydrated)
  const bootStatus = useWorkspaceStore((state) => state.bootStatus)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const hasOnboarding = useWorkspaceStore(selectHasOnboarding)
  const bootstrap = useWorkspaceStore((state) => state.bootstrap)
  useThemeBridge()

  useEffect(() => {
    if (uiHydrated && bootStatus === 'idle') {
      void bootstrap()
    }
  }, [bootStatus, bootstrap, uiHydrated])

  if (!uiHydrated || bootStatus === 'loading' || bootStatus === 'idle') {
    return (
      <main className="grid min-h-svh place-items-center bg-cream px-6 text-center text-ink">
        <div className="rounded-[2rem] border border-line bg-paper p-8 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted">Notas Crema</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">{translate('es', 'loading')}</h1>
        </div>
      </main>
    )
  }

  if (bootStatus === 'error') {
    return (
      <main className="grid min-h-svh place-items-center bg-cream px-6 text-center text-ink">
        <div className="max-w-md rounded-[2rem] border border-line bg-paper p-8 shadow-soft">
          <p className="text-sm text-red-700">{errorMessage}</p>
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
