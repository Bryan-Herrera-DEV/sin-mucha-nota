import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useThemeBridge } from '@/shared/hooks/useThemeBridge'
import { useGithubSyncWorkerBridge } from '@/application/sync/githubSyncWorkerBridge'
import { Button } from '@/shared/ui/Button'
import { translate } from '@/app/i18n/translations'
import { selectHasOnboarding } from '@/app/state/selectors'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { panelPresence } from '@/shared/lib/motionPresets'

const AppShell = lazy(async () => {
  const module = await import('@/app/shell/AppShell')

  return { default: module.AppShell }
})
const OnboardingPage = lazy(async () => {
  const module = await import('@/features/onboarding/OnboardingPage')

  return { default: module.OnboardingPage }
})

function App() {
  const [uiHydrated, setUiHydrated] = useState(() => useWorkspaceStore.persist.hasHydrated())
  const bootStatus = useWorkspaceStore((state) => state.bootStatus)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const hasOnboarding = useWorkspaceStore(selectHasOnboarding)
  const bootstrap = useWorkspaceStore((state) => state.bootstrap)
  useThemeBridge()
  useGithubSyncWorkerBridge()

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

  let content

  if (!uiHydrated || bootStatus === 'loading' || bootStatus === 'idle') {
    content = (
      <motion.main className="app-shell-bg grid min-h-svh place-items-center px-6 text-center text-[var(--app-text)]" key="loading" {...panelPresence}>
        <div className="rounded-[2rem] border border-white/12 bg-[var(--app-panel)] p-8 shadow-[0_32px_90px_rgb(0_0_0_/_0.3)]">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--app-muted)]">sin mucha nota</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">{translate('es', 'loading')}</h1>
        </div>
      </motion.main>
    )
  } else if (bootStatus === 'error') {
    content = (
      <motion.main className="app-shell-bg grid min-h-svh place-items-center px-6 text-center text-[var(--app-text)]" key="error" {...panelPresence}>
        <div className="max-w-md rounded-[2rem] border border-white/12 bg-[var(--app-panel)] p-8 shadow-[0_32px_90px_rgb(0_0_0_/_0.3)]">
          <p className="text-sm text-red-100">{errorMessage}</p>
          <Button className="mt-5" onClick={() => void bootstrap()} variant="primary">
            {translate('es', 'retry')}
          </Button>
        </div>
      </motion.main>
    )
  } else {
    content = (
      <motion.div className="h-svh" key={hasOnboarding ? 'app' : 'onboarding'} {...panelPresence}>
        <Suspense fallback={<div className="app-shell-bg grid h-svh place-items-center text-sm font-bold text-[var(--app-muted)]">{translate('es', 'loading')}</div>}>
          {hasOnboarding ? <AppShell /> : <OnboardingPage />}
        </Suspense>
      </motion.div>
    )
  }

  return <AnimatePresence mode="wait">{content}</AnimatePresence>
}

export default App
