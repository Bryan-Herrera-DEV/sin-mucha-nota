import { useEffect } from 'react'
import { Cloud, PanelRightClose, Palette, Sparkles, Type, Volume2 } from 'lucide-react'
import { accentColorOptions, fontOptions, themeOptions, type FontFamily, type Locale } from '@/domain/preferences/preferences'
import { useI18n } from '@/app/i18n/useI18n'
import { useSoundFeedback } from '@/shared/hooks/useSoundFeedback'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Select'
import { useWorkspaceStore } from '@/app/state/workspace.store'

export function SettingsPanel() {
  const { t } = useI18n()
  const preferences = useWorkspaceStore((state) => state.preferences)
  const storageMode = useWorkspaceStore((state) => state.storageMode)
  const updatePreferences = useWorkspaceStore((state) => state.updatePreferences)
  const setSettingsOpen = useWorkspaceStore((state) => state.setSettingsOpen)
  const githubAuth = useWorkspaceStore((state) => state.githubAuth)
  const githubConfig = useWorkspaceStore((state) => state.githubConfig)
  const githubSyncState = useWorkspaceStore((state) => state.githubSyncState)
  const githubRepos = useWorkspaceStore((state) => state.githubRepos)
  const githubDeviceFlow = useWorkspaceStore((state) => state.githubDeviceFlow)
  const githubBusy = useWorkspaceStore((state) => state.githubBusy)
  const githubError = useWorkspaceStore((state) => state.githubError)
  const loadGithubSettings = useWorkspaceStore((state) => state.loadGithubSettings)
  const startGithubOAuth = useWorkspaceStore((state) => state.startGithubOAuth)
  const completeGithubOAuth = useWorkspaceStore((state) => state.completeGithubOAuth)
  const loadGithubRepositories = useWorkspaceStore((state) => state.loadGithubRepositories)
  const selectGithubRepository = useWorkspaceStore((state) => state.selectGithubRepository)
  const disconnectGithub = useWorkspaceStore((state) => state.disconnectGithub)
  const syncGithubNow = useWorkspaceStore((state) => state.syncGithubNow)
  const play = useSoundFeedback()

  useEffect(() => {
    void loadGithubSettings()
  }, [loadGithubSettings])

  useEffect(() => {
    if (!githubAuth || githubRepos.length > 0) {
      return
    }

    void loadGithubRepositories()
  }, [githubAuth, githubRepos.length, loadGithubRepositories])

  useEffect(() => {
    if (!githubDeviceFlow) {
      return
    }

    const poll = window.setInterval(() => {
      void completeGithubOAuth()
    }, githubDeviceFlow.intervalSeconds * 1000)

    return () => window.clearInterval(poll)
  }, [completeGithubOAuth, githubDeviceFlow])

  if (!preferences) {
    return null
  }

  return (
    <aside className="app-settings flex h-full max-h-none flex-col rounded-[1.5rem] border border-white/12 p-3 text-[var(--app-text)] shadow-soft backdrop-blur lg:max-h-full">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--app-muted)]">{t('settings')}</p>
          <h2 className="text-xl font-black tracking-[-0.05em] text-white">{t('interface')}</h2>
        </div>
        <Button
          aria-label={t('close')}
          onClick={() => {
            play('tap')
            setSettingsOpen(false)
          }}
          size="icon"
          variant="ghost"
        >
          <PanelRightClose size={18} />
        </Button>
      </header>

      <div className="space-y-3 overflow-auto pr-1">
        <section className="rounded-2xl border border-white/10 bg-white/6 p-3">
          <p className="mb-3 text-sm font-black text-white">{t('profile')}</p>
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--app-muted)]">
            {t('nameLabel')}
            <input
              className="mt-2 h-9 w-full rounded-xl border border-white/10 bg-[var(--app-panel-strong)] px-3 text-sm normal-case tracking-normal text-white outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              value={preferences.displayName}
              onChange={(event) => void updatePreferences({ displayName: event.target.value })}
            />
          </label>
          <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-[var(--app-muted)]">
            {t('languageLabel')}
            <Select
              className="mt-2 h-9"
              onValueChange={(value) => void updatePreferences({ locale: value as Locale })}
              options={[
                { value: 'es', label: 'Español' },
                { value: 'en', label: 'English' },
              ]}
              value={preferences.locale}
            />
          </label>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/6 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-white">
            <Sparkles size={17} />
            {t('themeLabel')}
          </div>
          <p className="mb-3 text-xs leading-5 text-[var(--app-muted)]">{t('themeBody')}</p>
          <div className="grid grid-cols-2 gap-2">
            {themeOptions.map((theme) => (
              <button
                className={cn('theme-card theme-card-compact text-left', preferences.themeId === theme.value && 'theme-card-selected')}
                key={theme.value}
                onClick={() => {
                  play('open')
                  void updatePreferences({ themeId: theme.value, accentColor: theme.accentColor })
                }}
                type="button"
              >
                <span className="theme-card-preview" style={{ background: `linear-gradient(135deg, ${theme.preview[0]}, ${theme.preview[1]})` }} />
                <span className="block truncate text-xs font-black text-white">{preferences.locale === 'es' ? theme.labelEs : theme.labelEn}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/6 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <Palette size={17} />
            {t('accentLabel')}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {accentColorOptions.map((option) => (
              <button
                className="h-8 rounded-xl border-2 transition hover:scale-105"
                key={option.value}
                onClick={() => {
                  play('tap')
                  void updatePreferences({ accentColor: option.value })
                }}
                style={{ background: option.value, borderColor: preferences.accentColor === option.value ? '#ffffff' : 'transparent' }}
                type="button"
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/6 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <Type size={17} />
            {t('fontLabel')}
          </div>
          <Select
            onValueChange={(value) => void updatePreferences({ fontFamily: value as FontFamily })}
            options={fontOptions.map((option) => ({
              value: option.value,
              label: preferences.locale === 'es' ? option.labelEs : option.labelEn,
            }))}
            value={preferences.fontFamily}
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/6 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <Volume2 size={17} />
            {t('sounds')}
          </div>
          <Button
            className="w-full"
            onClick={() => {
              play('tap')
              void updatePreferences({ soundEnabled: !preferences.soundEnabled })
            }}
            variant={preferences.soundEnabled ? 'primary' : 'soft'}
          >
            {preferences.soundEnabled ? t('enabled') : t('disabled')}
          </Button>
          {preferences.soundEnabled ? (
            <Button className="mt-2 w-full" onClick={() => play('save')} variant="ghost">
              {t('soundPreview')}
            </Button>
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/6 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-white">
            <Cloud size={17} />
            {t('githubSync')}
          </div>
          <p className="mb-3 text-xs leading-5 text-[var(--app-muted)]">{t('githubConnectBody')}</p>

          {!githubAuth ? (
            <div className="space-y-3">
              <Button
                className="w-full"
                disabled={githubBusy}
                onClick={() => {
                  play('open')
                  void startGithubOAuth()
                }}
                variant="primary"
              >
                {t('githubConnect')}
              </Button>

              {githubDeviceFlow ? (
                <div className="rounded-2xl border border-white/10 bg-[var(--app-panel-strong)] p-3 text-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--app-muted)]">{t('githubUserCode')}</p>
                  <p className="mt-1 text-2xl font-black tracking-[0.18em] text-white">{githubDeviceFlow.userCode}</p>
                  <a className="mt-3 inline-flex rounded-full border border-[var(--accent)] px-3 py-2 text-xs font-black text-[var(--accent)]" href={githubDeviceFlow.verificationUri} rel="noreferrer" target="_blank">
                    {t('githubOpenDevice')}
                  </a>
                  <p className="mt-3 text-xs text-[var(--app-muted)]">{t('githubWaiting')}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--app-panel-strong)] p-3">
                {githubAuth.avatarUrl ? <img alt="" className="h-9 w-9 rounded-full" src={githubAuth.avatarUrl} /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-sm font-black text-white">{githubAuth.username.slice(0, 1).toUpperCase()}</span>}
                <span className="min-w-0">
                  <span className="block text-xs text-[var(--app-muted)]">{t('githubConnectedAs')}</span>
                  <span className="block truncate text-sm font-black text-white">{githubAuth.username}</span>
                </span>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--app-muted)]">{t('githubRepository')}</p>
                <Select
                  onValueChange={(value) => {
                    if (value !== 'no-repos') {
                      play('open')
                      void selectGithubRepository(value)
                    }
                  }}
                  options={createRepoOptions(githubRepos, githubConfig, t('githubNoRepos'))}
                  value={githubConfig?.repoFullName ?? githubRepos[0]?.full_name ?? 'no-repos'}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    play('tap')
                    void loadGithubRepositories()
                  }}
                  variant="ghost"
                >
                  {t('githubLoadRepos')}
                </Button>
                <Button
                  disabled={!githubConfig}
                  onClick={() => {
                    play('save')
                    syncGithubNow()
                  }}
                  variant="primary"
                >
                  {t('githubSyncNow')}
                </Button>
              </div>

              {githubConfig ? (
                <div className="rounded-2xl border border-white/10 bg-[var(--app-panel-strong)] p-3 text-xs leading-6 text-[var(--app-muted)]">
                  <p><span className="font-black text-white">{t('githubBasePath')}:</span> {githubConfig.basePath}</p>
                  <p><span className="font-black text-white">Branch:</span> {githubConfig.branch}</p>
                  <p><span className="font-black text-white">{t('githubStatus')}:</span> {formatSyncStatus(githubSyncState?.status, preferences.locale)}</p>
                  <p><span className="font-black text-white">{t('githubLastSync')}:</span> {githubSyncState?.lastSyncedAt ? new Date(githubSyncState.lastSyncedAt).toLocaleString() : '-'}</p>
                </div>
              ) : null}

              <Button
                className="w-full"
                onClick={() => {
                  play('delete')
                  void disconnectGithub()
                }}
                variant="danger"
              >
                {t('githubDisconnect')}
              </Button>
            </div>
          )}

          {githubError ? <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs leading-5 text-red-100">{githubError}</p> : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[var(--app-panel-strong)] p-3 text-sm leading-6 text-[var(--app-muted)]">
          <p className="font-black text-white">{t('storage')}</p>
          <p>{storageMode === 'opfs' ? t('storageOpfs') : t('storageIndexedDb')}</p>
        </section>
      </div>
    </aside>
  )
}

function createRepoOptions(
  repos: ReadonlyArray<{ full_name: string; private: boolean }>,
  config: { repoFullName: string } | null,
  emptyLabel: string,
): Array<{ value: string; label: string }> {
  if (repos.length > 0) {
    return repos.map((repo) => ({ value: repo.full_name, label: `${repo.full_name}${repo.private ? ' private' : ''}` }))
  }

  if (config) {
    return [{ value: config.repoFullName, label: config.repoFullName }]
  }

  return [{ value: 'no-repos', label: emptyLabel }]
}

function formatSyncStatus(status: string | undefined, locale: Locale): string {
  const labels = {
    es: {
      idle: 'En espera',
      disabled: 'Desactivado',
      syncing: 'Sincronizando',
      pulling: 'Descargando',
      pushing: 'Subiendo',
      synced: 'Sincronizado',
      error: 'Error',
    },
    en: {
      idle: 'Idle',
      disabled: 'Disabled',
      syncing: 'Syncing',
      pulling: 'Pulling',
      pushing: 'Pushing',
      synced: 'Synced',
      error: 'Error',
    },
  }

  return labels[locale][(status ?? 'idle') as keyof typeof labels.es] ?? labels[locale].idle
}
