import { performGithubWorkspaceSync } from '@/application/sync/githubWorkspaceSync'

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
  console.log("Strat Sync Loop")
  if (intervalId !== null) {
    return
  }

  void syncNow()
  intervalId = self.setInterval(() => {
    void syncNow()
  }, SYNC_INTERVAL_MS)
}

function stopSyncLoop(): void {
  console.log("Stop Sync Loop")
  if (intervalId !== null) {
    self.clearInterval(intervalId)
    intervalId = null
  }
}

async function syncNow(): Promise<void> {
  console.log("Sync Now")
  if (syncing) {
    return
  }

  syncing = true

  try {
    const result = await performGithubWorkspaceSync()

    self.postMessage({ type: 'sync-complete', result })
  } catch (error) {
    self.postMessage({ type: 'sync-error', message: error instanceof Error ? error.message : 'No se pudo sincronizar con GitHub' })
  } finally {
    syncing = false
  }
}
