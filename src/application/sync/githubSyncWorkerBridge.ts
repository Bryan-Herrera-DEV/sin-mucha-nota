import { useEffect } from 'react'
import { useWorkspaceStore } from '@/app/state/workspace.store'

let githubSyncWorker: Worker | null = null

type GithubSyncWorkerMessage = {
  type: 'sync-complete' | 'sync-error'
  message?: string
  result?: { workspaceChanged?: boolean }
}

export function useGithubSyncWorkerBridge(): void {
  const bootStatus = useWorkspaceStore((state) => state.bootStatus)
  const githubSyncEnabled = useWorkspaceStore((state) => state.githubConfig?.enabled ?? false)
  const bootstrap = useWorkspaceStore((state) => state.bootstrap)
  const loadGithubSettings = useWorkspaceStore((state) => state.loadGithubSettings)

  useEffect(() => {
    if (bootStatus !== 'ready' || !githubSyncEnabled) {
      githubSyncWorker?.postMessage({ type: 'stop' })

      return
    }

    githubSyncWorker ??= new Worker(new URL('../../infrastructure/sync/githubSync.worker.ts', import.meta.url), { type: 'module' })

    githubSyncWorker.onmessage = (event: MessageEvent<GithubSyncWorkerMessage>) => {
      void loadGithubSettings()

      if (event.data.type === 'sync-error') {
        useWorkspaceStore.setState({ githubError: event.data.message ?? 'No se pudo sincronizar con GitHub' })
      }

      if (event.data.result?.workspaceChanged && !useWorkspaceStore.getState().isDirty) {
        void bootstrap()
      }
    }

    githubSyncWorker.postMessage({ type: 'start' })

    const syncNow = () => githubSyncWorker?.postMessage({ type: 'sync-now' })

    window.addEventListener('github-sync-now', syncNow)
    window.addEventListener('github-sync-config-changed', syncNow)

    return () => {
      window.removeEventListener('github-sync-now', syncNow)
      window.removeEventListener('github-sync-config-changed', syncNow)
      githubSyncWorker?.postMessage({ type: 'stop' })
    }
  }, [bootStatus, bootstrap, githubSyncEnabled, loadGithubSettings])
}

export function requestGithubSyncNow(): void {
  githubSyncWorker?.postMessage({ type: 'sync-now' })
}
