import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Folder } from '@/domain/folders/folder'
import type { Note } from '@/domain/notes/note'
import { normalizeSoundVolume, type ThemeId, type UserPreferences } from '@/domain/preferences/preferences'
import { nowIso, type ISODate } from '@/domain/shared/valueObjects'

const DATABASE_NAME = 'sin-mucha-nota'
const LEGACY_DATABASE_NAME = 'notas-crema'
const DATABASE_VERSION = 3
const ACTIVE_PREFERENCES_ID = 'active'
const GITHUB_AUTH_ID = 'auth'
const GITHUB_CONFIG_ID = 'config'
const GITHUB_SYNC_STATE_ID = 'state'
const LOCAL_WORKSPACE_META_ID = 'local'

type StoredPreferences = Omit<UserPreferences, 'soundVolume' | 'themeId'> & {
  soundVolume?: number
  themeId?: ThemeId
  id: typeof ACTIVE_PREFERENCES_ID
}

export type StoredFile = {
  path: string
  content: string
  kind: 'text' | 'json'
  updatedAt: ISODate
}

export type GithubAuth = {
  id: typeof GITHUB_AUTH_ID
  accessToken: string
  tokenType: string
  scope: string
  username: string
  avatarUrl: string | null
  connectedAt: ISODate
  updatedAt: ISODate
}

export type GithubSyncConfig = {
  id: typeof GITHUB_CONFIG_ID
  owner: string
  repo: string
  repoFullName: string
  branch: string
  basePath: string
  enabled: boolean
  initialSyncStrategy: GithubInitialSyncStrategy | null
  selectedAt: ISODate
  updatedAt: ISODate
}

export type GithubInitialSyncStrategy = 'pull-remote' | 'push-local' | 'merge'

export type GithubSyncStatus = 'idle' | 'disabled' | 'syncing' | 'pulling' | 'pushing' | 'merging' | 'synced' | 'error'

export type GithubSyncState = {
  id: typeof GITHUB_SYNC_STATE_ID
  status: GithubSyncStatus
  lastSyncedAt: ISODate | null
  lastDirection: 'pull' | 'push' | 'merge' | 'none' | null
  lastError: string | null
  remoteUpdatedAt: ISODate | null
  updatedAt: ISODate
}

export type LocalWorkspaceMeta = {
  id: typeof LOCAL_WORKSPACE_META_ID
  updatedAt: ISODate
}

interface SinMuchaNotaDatabase extends DBSchema {
  folders: {
    key: string
    value: Folder
  }
  notes: {
    key: string
    value: Note
  }
  preferences: {
    key: typeof ACTIVE_PREFERENCES_ID
    value: StoredPreferences
  }
  files: {
    key: string
    value: StoredFile
  }
  githubAuth: {
    key: typeof GITHUB_AUTH_ID
    value: GithubAuth
  }
  githubConfig: {
    key: typeof GITHUB_CONFIG_ID
    value: GithubSyncConfig
  }
  githubSyncState: {
    key: typeof GITHUB_SYNC_STATE_ID
    value: GithubSyncState
  }
  localWorkspaceMeta: {
    key: typeof LOCAL_WORKSPACE_META_ID
    value: LocalWorkspaceMeta
  }
}

let databasePromise: Promise<IDBPDatabase<SinMuchaNotaDatabase>> | null = null

export function getLocalDatabase(): Promise<IDBPDatabase<SinMuchaNotaDatabase>> {
  databasePromise ??= openWorkspaceDatabase(DATABASE_NAME).then(async (database) => {
    await migrateLegacyDatabase(database)

    return database
  })

  return databasePromise
}

function openWorkspaceDatabase(name: string): Promise<IDBPDatabase<SinMuchaNotaDatabase>> {
  return openDB<SinMuchaNotaDatabase>(name, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('folders')) {
        database.createObjectStore('folders', { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains('notes')) {
        database.createObjectStore('notes', { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains('preferences')) {
        database.createObjectStore('preferences', { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains('files')) {
        database.createObjectStore('files', { keyPath: 'path' })
      }

      if (!database.objectStoreNames.contains('githubAuth')) {
        database.createObjectStore('githubAuth', { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains('githubConfig')) {
        database.createObjectStore('githubConfig', { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains('githubSyncState')) {
        database.createObjectStore('githubSyncState', { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains('localWorkspaceMeta')) {
        database.createObjectStore('localWorkspaceMeta', { keyPath: 'id' })
      }
    },
  })
}

async function migrateLegacyDatabase(database: IDBPDatabase<SinMuchaNotaDatabase>): Promise<void> {
  if (await hasWorkspaceData(database)) {
    return
  }

  if (!(await databaseExists(LEGACY_DATABASE_NAME))) {
    return
  }

  const legacyDatabase = await openWorkspaceDatabase(LEGACY_DATABASE_NAME)

  try {
    if (!(await hasWorkspaceData(legacyDatabase))) {
      return
    }

    const [folders, notes, preferences, files, githubAuth, githubConfig, githubSyncState, localWorkspaceMeta] = await Promise.all([
      legacyDatabase.getAll('folders'),
      legacyDatabase.getAll('notes'),
      legacyDatabase.getAll('preferences'),
      legacyDatabase.getAll('files'),
      legacyDatabase.getAll('githubAuth'),
      legacyDatabase.getAll('githubConfig'),
      legacyDatabase.getAll('githubSyncState'),
      legacyDatabase.getAll('localWorkspaceMeta'),
    ])

    await Promise.all([
      ...folders.map((folder) => database.put('folders', folder)),
      ...notes.map((note) => database.put('notes', note)),
      ...preferences.map((preference) => database.put('preferences', preference)),
      ...files.map((file) => database.put('files', file)),
      ...githubAuth.map((auth) => database.put('githubAuth', auth)),
      ...githubConfig.map((config) => database.put('githubConfig', config)),
      ...githubSyncState.map((state) => database.put('githubSyncState', state)),
      ...localWorkspaceMeta.map((meta) => database.put('localWorkspaceMeta', meta)),
    ])
  } finally {
    legacyDatabase.close()
  }
}

async function hasWorkspaceData(database: IDBPDatabase<SinMuchaNotaDatabase>): Promise<boolean> {
  const [folderCount, noteCount, preferencesCount, fileCount] = await Promise.all([
    database.count('folders'),
    database.count('notes'),
    database.count('preferences'),
    database.count('files'),
  ])

  return folderCount + noteCount + preferencesCount + fileCount > 0
}

async function databaseExists(name: string): Promise<boolean> {
  if (typeof indexedDB === 'undefined') {
    return false
  }

  const listDatabases = (indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> }).databases

  if (!listDatabases) {
    return true
  }

  const databases = await listDatabases.call(indexedDB)

  return databases.some((database) => database.name === name)
}

export async function listFolders(): Promise<Folder[]> {
  const database = await getLocalDatabase()
  const folders = await database.getAll('folders')

  return folders.map(normalizeFolder).sort((first, second) => first.name.localeCompare(second.name))
}

export async function saveFolder(folder: Folder): Promise<void> {
  const database = await getLocalDatabase()
  await database.put('folders', folder)
}

export async function deleteFolderById(folderId: string): Promise<void> {
  const database = await getLocalDatabase()
  await database.delete('folders', folderId)
}

export async function listNotes(): Promise<Note[]> {
  const database = await getLocalDatabase()
  const notes = await database.getAll('notes')

  return notes.sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
}

export async function saveNote(note: Note): Promise<void> {
  const database = await getLocalDatabase()
  await database.put('notes', note)
}

export async function deleteNoteById(noteId: string): Promise<void> {
  const database = await getLocalDatabase()
  await database.delete('notes', noteId)
}

export async function loadPreferences(): Promise<UserPreferences | null> {
  const database = await getLocalDatabase()
  const preferences = await database.get('preferences', ACTIVE_PREFERENCES_ID)

  if (!preferences) {
    return null
  }

  return {
    displayName: preferences.displayName,
    accentColor: preferences.accentColor,
    themeId: preferences.themeId ?? 'forest',
    fontFamily: preferences.fontFamily,
    locale: preferences.locale,
    soundEnabled: preferences.soundEnabled,
    soundVolume: normalizeSoundVolume(preferences.soundVolume),
    onboardedAt: preferences.onboardedAt,
    updatedAt: preferences.updatedAt,
  }
}

export async function savePreferences(preferences: UserPreferences): Promise<void> {
  const database = await getLocalDatabase()

  await database.put('preferences', {
    ...preferences,
    soundVolume: normalizeSoundVolume(preferences.soundVolume),
    id: ACTIVE_PREFERENCES_ID,
  })
}

export async function loadStoredFile(path: string): Promise<StoredFile | null> {
  const database = await getLocalDatabase()
  const file = await database.get('files', path)

  return file ?? null
}

export async function saveStoredFile(file: Omit<StoredFile, 'updatedAt'>): Promise<void> {
  const database = await getLocalDatabase()

  await database.put('files', {
    ...file,
    updatedAt: nowIso(),
  })
}

export async function deleteStoredFile(path: string): Promise<void> {
  const database = await getLocalDatabase()
  await database.delete('files', path)
}

export async function loadGithubAuth(): Promise<GithubAuth | null> {
  const database = await getLocalDatabase()

  return (await database.get('githubAuth', GITHUB_AUTH_ID)) ?? null
}

export async function saveGithubAuth(auth: Omit<GithubAuth, 'id' | 'connectedAt' | 'updatedAt'> & { connectedAt?: ISODate }): Promise<GithubAuth> {
  const database = await getLocalDatabase()
  const timestamp = nowIso()
  const nextAuth: GithubAuth = {
    ...auth,
    id: GITHUB_AUTH_ID,
    connectedAt: auth.connectedAt ?? timestamp,
    updatedAt: timestamp,
  }

  await database.put('githubAuth', nextAuth)

  return nextAuth
}

export async function deleteGithubAuth(): Promise<void> {
  const database = await getLocalDatabase()
  await database.delete('githubAuth', GITHUB_AUTH_ID)
}

export async function loadGithubConfig(): Promise<GithubSyncConfig | null> {
  const database = await getLocalDatabase()
  const config = (await database.get('githubConfig', GITHUB_CONFIG_ID)) ?? null

  return config ? normalizeGithubConfig(config) : null
}

export async function saveGithubConfig(config: Omit<GithubSyncConfig, 'id' | 'selectedAt' | 'updatedAt'> & { selectedAt?: ISODate }): Promise<GithubSyncConfig> {
  const database = await getLocalDatabase()
  const timestamp = nowIso()
  const nextConfig: GithubSyncConfig = {
    ...config,
    id: GITHUB_CONFIG_ID,
    initialSyncStrategy: config.initialSyncStrategy ?? null,
    selectedAt: config.selectedAt ?? timestamp,
    updatedAt: timestamp,
  }

  await database.put('githubConfig', nextConfig)

  return nextConfig
}

export async function clearGithubInitialSyncStrategy(): Promise<GithubSyncConfig | null> {
  const database = await getLocalDatabase()
  const currentConfig = await loadGithubConfig()

  if (!currentConfig?.initialSyncStrategy) {
    return currentConfig
  }

  const nextConfig: GithubSyncConfig = {
    ...currentConfig,
    initialSyncStrategy: null,
    updatedAt: nowIso(),
  }

  await database.put('githubConfig', nextConfig)

  return nextConfig
}

export async function deleteGithubConfig(): Promise<void> {
  const database = await getLocalDatabase()
  await database.delete('githubConfig', GITHUB_CONFIG_ID)
}

export async function loadGithubSyncState(): Promise<GithubSyncState | null> {
  const database = await getLocalDatabase()

  return (await database.get('githubSyncState', GITHUB_SYNC_STATE_ID)) ?? null
}

export async function saveGithubSyncState(state: Omit<GithubSyncState, 'id' | 'updatedAt'>): Promise<GithubSyncState> {
  const database = await getLocalDatabase()
  const nextState: GithubSyncState = {
    ...state,
    id: GITHUB_SYNC_STATE_ID,
    updatedAt: nowIso(),
  }

  await database.put('githubSyncState', nextState)

  return nextState
}

export async function deleteGithubSyncState(): Promise<void> {
  const database = await getLocalDatabase()
  await database.delete('githubSyncState', GITHUB_SYNC_STATE_ID)
}

export async function loadLocalWorkspaceMeta(): Promise<LocalWorkspaceMeta | null> {
  const database = await getLocalDatabase()

  return (await database.get('localWorkspaceMeta', LOCAL_WORKSPACE_META_ID)) ?? null
}

export async function markLocalWorkspaceChanged(updatedAt: ISODate = nowIso()): Promise<LocalWorkspaceMeta> {
  const database = await getLocalDatabase()
  const meta: LocalWorkspaceMeta = {
    id: LOCAL_WORKSPACE_META_ID,
    updatedAt,
  }

  await database.put('localWorkspaceMeta', meta)

  return meta
}

function normalizeFolder(folder: Folder): Folder {
  return {
    ...folder,
    icon: folder.icon ?? 'folder',
  }
}

function normalizeGithubConfig(config: GithubSyncConfig): GithubSyncConfig {
  const initialSyncStrategy = (config as { initialSyncStrategy?: unknown }).initialSyncStrategy

  return {
    ...config,
    initialSyncStrategy: isGithubInitialSyncStrategy(initialSyncStrategy) ? initialSyncStrategy : null,
  }
}

function isGithubInitialSyncStrategy(value: unknown): value is GithubInitialSyncStrategy {
  return value === 'pull-remote' || value === 'push-local' || value === 'merge'
}
