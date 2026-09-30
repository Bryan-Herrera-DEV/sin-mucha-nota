import { useEffect } from 'react'
import { useWorkspaceStore } from '@/app/state/workspace.store'

let githubSyncWorker: Worker | null = null

type GithubSyncWorkerMessage = {
  type: 'sync-complete' | 'sync-error' | 'paused'
  requestId?: string
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
      if (event.data.type === 'paused' || useWorkspaceStore.getState().sessionBusy) return
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

export async function withGithubSyncPaused<T>(action: () => Promise<T>): Promise<T> {
  const worker = githubSyncWorker
  try {
    if (worker) {
      await new Promise<void>((resolve, reject) => {
        const requestId = crypto.randomUUID()
        const cleanup = () => {
          window.clearTimeout(timeout)
          worker.removeEventListener('message', onMessage)
        }
        const onMessage = (event: MessageEvent<GithubSyncWorkerMessage>) => {
          if (event.data.type === 'paused' && event.data.requestId === requestId) {
            cleanup()
            resolve()
          }
        }
        const timeout = window.setTimeout(() => {
          cleanup()
          reject(new Error('GitHub sigue sincronizando. Inténtalo de nuevo en unos segundos.'))
        }, 60_000)
        worker.addEventListener('message', onMessage)
        worker.postMessage({ type: 'pause', requestId })
      })
    }
    return await action()
  } finally {
    if (worker) worker.postMessage({ type: 'resume', enabled: useWorkspaceStore.getState().githubConfig?.enabled ?? false })
  }
}

export function requestGithubSyncNow(): void {
  githubSyncWorker?.postMessage({ type: 'sync-now' })
}
