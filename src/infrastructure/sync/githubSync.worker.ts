import { performGithubWorkspaceSync } from '@/application/sync/githubWorkspaceSync'
import { reportAppError } from '@/shared/lib/appError'

const SYNC_INTERVAL_MS = 30_000

let intervalId: number | null = null
let syncing = false

self.addEventListener('message', (event: MessageEvent<{ type: 'start' | 'sync-now' | 'stop' }>) => {
  if (event.data.type === 'start') {
    startSyncLoop()
  }

  if (event.data.type === 'sync-now') {
    void syncNow()
  }

  if (event.data.type === 'stop') {
    stopSyncLoop()
  }
})

function startSyncLoop(): void {
  if (intervalId !== null) {
    return
  }

  void syncNow()
  intervalId = self.setInterval(() => {
    void syncNow()
  }, SYNC_INTERVAL_MS)
}

function stopSyncLoop(): void {
  if (intervalId !== null) {
    self.clearInterval(intervalId)
    intervalId = null
  }
}

async function syncNow(): Promise<void> {
  if (syncing) {
    return
  }

  syncing = true

  try {
    const result = await performGithubWorkspaceSync()

    self.postMessage({ type: 'sync-complete', result })
  } catch (error) {
    const appError = reportAppError(error, { scope: 'github.sync.worker', operation: 'syncNow' })

    self.postMessage({ type: 'sync-error', message: appError.userMessage })
  } finally {
    syncing = false
  }
}
