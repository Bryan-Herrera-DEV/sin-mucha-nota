import { afterEach, expect, it, vi } from 'vitest'

const sync = vi.hoisted(() => vi.fn())
vi.mock('@/application/sync/githubWorkspaceSync', () => ({ performGithubWorkspaceSync: sync }))

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); sync.mockReset() })

it('waits for an active sync before acknowledging pause and does not restart after import disables sync', async () => {
  let finish!: (value: object) => void
  sync.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  let receive!: (event: { data: object }) => void
  const postMessage = vi.fn()
  const clearInterval = vi.fn()
  vi.stubGlobal('self', {
    addEventListener: (_type: string, callback: typeof receive) => { receive = callback },
    postMessage, setInterval: () => 1, clearInterval,
  })
  await import('@/infrastructure/sync/githubSync.worker')
  receive({ data: { type: 'start' } })
  expect(sync).toHaveBeenCalledOnce()
  receive({ data: { type: 'pause', requestId: 'backup' } })
  expect(clearInterval).toHaveBeenCalledWith(1)
  expect(postMessage).not.toHaveBeenCalledWith({ type: 'paused', requestId: 'backup' })
  receive({ data: { type: 'sync-now' } })
  expect(sync).toHaveBeenCalledOnce()
  finish({ workspaceChanged: true })
  await vi.waitFor(() => expect(postMessage).toHaveBeenCalledWith({ type: 'paused', requestId: 'backup' }))
  receive({ data: { type: 'start' } })
  expect(sync).toHaveBeenCalledOnce()
  receive({ data: { type: 'resume', enabled: false } })
  expect(sync).toHaveBeenCalledOnce()
  receive({ data: { type: 'resume', enabled: true } })
  await vi.waitFor(() => expect(sync).toHaveBeenCalledTimes(2))
})
