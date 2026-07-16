import type { Folder } from '@/domain/folders/folder'
import { createEmptyDrawing, type Note } from '@/domain/notes/note'
import type { UserPreferences } from '@/domain/preferences/preferences'
import type { ISODate } from '@/domain/shared/valueObjects'
import {
  deleteFolderById,
  deleteNoteById,
  deleteStoredFile,
  listFolders,
  listNotes,
  loadGithubAuth,
  loadGithubConfig,
  loadGithubSyncState,
  loadLocalWorkspaceMeta,
  loadPreferences,
  loadStoredFile,
  markLocalWorkspaceChanged,
  saveFolder,
  saveGithubSyncState,
  saveNote,
  savePreferences,
  saveStoredFile,
  type GithubSyncConfig,
  type GithubSyncState,
} from '@/infrastructure/db/localDatabase'
import {
  createGithubBlob,
  createGithubCommit,
  createGithubFile,
  createGithubTree,
  decodeGithubBlobContent,
  getGithubBlob,
  getGithubBranchRef,
  getGithubCommit,
  getGithubTree,
  updateGithubBranchRef,
  type GithubTreeItem,
  type GithubTreeUpdateEntry,
} from '@/infrastructure/github/githubApi'

const WORKSPACE_FILE_NAME = 'workspace.json'
const GITHUB_COMMIT_MESSAGE = 'sync: actualizar notas'

export type GithubSyncResult = {
  direction: 'pull' | 'push' | 'none'
  workspaceChanged: boolean
  state: GithubSyncState
}

type GithubWorkspaceDocument = {
  app: 'notas-online'
  version: 1
  exportedAt: ISODate
  updatedAt: ISODate
  preferences: UserPreferences | null
  folders: Folder[]
  notes: Note[]
}

type LocalWorkspaceSnapshot = {
  document: GithubWorkspaceDocument
  files: SyncFile[]
}

type RemoteWorkspaceSnapshot = {
  document: GithubWorkspaceDocument | null
  files: Map<string, string>
  remotePaths: Set<string>
  headSha: string | null
  treeSha: string | null
  empty: boolean
}

type SyncFile = {
  path: string
  content: string
}

export async function performGithubWorkspaceSync(): Promise<GithubSyncResult> {
  const [auth, config] = await Promise.all([loadGithubAuth(), loadGithubConfig()])

  if (!auth || !config?.enabled) {
    const state = await writeSyncState({ status: 'disabled', lastDirection: 'none', lastError: null })

    return { direction: 'none', workspaceChanged: false, state }
  }

  await writeSyncState({ status: 'syncing', lastDirection: null, lastError: null })

  try {
    const [localSnapshot, remoteSnapshot] = await Promise.all([createLocalWorkspaceSnapshot(config), readRemoteWorkspaceSnapshot(auth.accessToken, config)])
    const remoteDocument = remoteSnapshot.document
    const localUpdatedAt = toTime(localSnapshot.document.updatedAt)
    const remoteUpdatedAt = remoteDocument ? toTime(remoteDocument.updatedAt) : 0

    if (remoteDocument && remoteUpdatedAt > localUpdatedAt) {
      await writeSyncState({ status: 'pulling', lastDirection: 'pull', lastError: null, remoteUpdatedAt: remoteDocument.updatedAt })
      await applyRemoteWorkspaceSnapshot(remoteDocument, remoteSnapshot.files, config)

      const state = await writeSyncState({ status: 'synced', lastDirection: 'pull', lastError: null, remoteUpdatedAt: remoteDocument.updatedAt })

      return { direction: 'pull', workspaceChanged: true, state }
    }

    if (!remoteDocument || localUpdatedAt > remoteUpdatedAt) {
      await writeSyncState({ status: 'pushing', lastDirection: 'push', lastError: null, remoteUpdatedAt: remoteDocument?.updatedAt ?? null })
      await pushLocalWorkspaceSnapshot(auth.accessToken, config, localSnapshot, remoteSnapshot)

      const state = await writeSyncState({ status: 'synced', lastDirection: 'push', lastError: null, remoteUpdatedAt: localSnapshot.document.updatedAt })

      return { direction: 'push', workspaceChanged: false, state }
    }

    const state = await writeSyncState({ status: 'synced', lastDirection: 'none', lastError: null, remoteUpdatedAt: remoteDocument?.updatedAt ?? null })

    return { direction: 'none', workspaceChanged: false, state }
  } catch (error) {
    const state = await writeSyncState({ status: 'error', lastDirection: null, lastError: getErrorMessage(error) })

    return { direction: 'none', workspaceChanged: false, state }
  }
}

async function createLocalWorkspaceSnapshot(config: GithubSyncConfig): Promise<LocalWorkspaceSnapshot> {
  const [preferences, folders, notes, localMeta] = await Promise.all([loadPreferences(), listFolders(), listNotes(), loadLocalWorkspaceMeta()])
  const updatedAt = maxIso([preferences?.updatedAt, localMeta?.updatedAt, ...folders.map((folder) => folder.updatedAt), ...notes.map((note) => note.updatedAt)])
  const document: GithubWorkspaceDocument = {
    app: 'notas-online',
    version: 1,
    exportedAt: nowIso(),
    updatedAt,
    preferences,
    folders,
    notes,
  }
  const files: SyncFile[] = [
    {
      path: createWorkspacePath(config),
      content: JSON.stringify(document, null, 2),
    },
  ]

  for (const note of notes) {
    const [markdownFile, drawingFile] = await Promise.all([loadStoredFile(note.contentRef.markdownPath), loadStoredFile(note.contentRef.drawingPath)])

    files.push({ path: createNoteMarkdownPath(config, note), content: markdownFile?.content ?? '' })
    files.push({ path: createNoteDrawingPath(config, note), content: drawingFile?.content ?? JSON.stringify(createEmptyDrawing(), null, 2) })
  }

  return { document, files }
}

async function readRemoteWorkspaceSnapshot(accessToken: string, config: GithubSyncConfig): Promise<RemoteWorkspaceSnapshot> {
  const ref = await getGithubBranchRef(accessToken, config.owner, config.repo, config.branch).catch((error: unknown) => {
    if (isEmptyRepositoryError(error)) {
      return null
    }

    throw error
  })

  if (!ref) {
    return { document: null, files: new Map(), remotePaths: new Set(), headSha: null, treeSha: null, empty: true }
  }

  const commit = await getGithubCommit(accessToken, config.owner, config.repo, ref.object.sha)
  const tree = await getGithubTree(accessToken, config.owner, config.repo, commit.tree.sha)
  const remoteEntries = createTreeEntryMap(tree.tree)
  const remotePaths = new Set([...remoteEntries.keys()].filter((path) => path === normalizeBasePath(config.basePath) || path.startsWith(`${normalizeBasePath(config.basePath)}/`)))
  const workspaceEntry = remoteEntries.get(createWorkspacePath(config))

  if (!workspaceEntry?.sha) {
    return { document: null, files: new Map(), remotePaths, headSha: ref.object.sha, treeSha: commit.tree.sha, empty: false }
  }

  const workspaceContent = await readRemoteBlob(accessToken, config, workspaceEntry.sha)
  const document = JSON.parse(workspaceContent) as GithubWorkspaceDocument
  const files = new Map<string, string>([[createWorkspacePath(config), workspaceContent]])

  for (const note of document.notes) {
    const markdownPath = createNoteMarkdownPath(config, note)
    const drawingPath = createNoteDrawingPath(config, note)
    const markdownEntry = remoteEntries.get(markdownPath)
    const drawingEntry = remoteEntries.get(drawingPath)

    files.set(markdownPath, markdownEntry?.sha ? await readRemoteBlob(accessToken, config, markdownEntry.sha) : '')
    files.set(drawingPath, drawingEntry?.sha ? await readRemoteBlob(accessToken, config, drawingEntry.sha) : JSON.stringify(createEmptyDrawing(), null, 2))
  }

  return { document, files, remotePaths, headSha: ref.object.sha, treeSha: commit.tree.sha, empty: false }
}

async function readRemoteBlob(accessToken: string, config: GithubSyncConfig, blobSha: string): Promise<string> {
  const blob = await getGithubBlob(accessToken, config.owner, config.repo, blobSha)

  return decodeGithubBlobContent(blob)
}

async function pushLocalWorkspaceSnapshot(accessToken: string, config: GithubSyncConfig, localSnapshot: LocalWorkspaceSnapshot, remoteSnapshot: RemoteWorkspaceSnapshot): Promise<void> {
  if (remoteSnapshot.empty) {
    await initializeEmptyRepository(accessToken, config, localSnapshot)

    const initializedRemoteSnapshot = await readRemoteWorkspaceSnapshot(accessToken, config)

    await pushLocalWorkspaceSnapshot(accessToken, config, localSnapshot, initializedRemoteSnapshot)

    return
  }

  if (!remoteSnapshot.headSha || !remoteSnapshot.treeSha) {
    throw new Error('No se pudo leer la rama de GitHub para sincronizar')
  }

  const localPaths = new Set(localSnapshot.files.map((file) => file.path))
  const treeEntries: GithubTreeUpdateEntry[] = []

  for (const file of localSnapshot.files) {
    const blob = await createGithubBlob(accessToken, config.owner, config.repo, file.content)

    treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha })
  }

  for (const remotePath of remoteSnapshot.remotePaths) {
    if (!localPaths.has(remotePath)) {
      treeEntries.push({ path: remotePath, mode: '100644', type: 'blob', sha: null })
    }
  }

  const tree = await createGithubTree(accessToken, config.owner, config.repo, remoteSnapshot.treeSha, treeEntries)
  const commit = await createGithubCommit(accessToken, config.owner, config.repo, GITHUB_COMMIT_MESSAGE, tree.sha, remoteSnapshot.headSha)

  await updateGithubBranchRef(accessToken, config.owner, config.repo, config.branch, commit.sha)
}

async function initializeEmptyRepository(accessToken: string, config: GithubSyncConfig, localSnapshot: LocalWorkspaceSnapshot): Promise<void> {
  const workspaceFile = localSnapshot.files.find((file) => file.path === createWorkspacePath(config))

  if (!workspaceFile) {
    throw new Error('No se encontro el archivo inicial del workspace')
  }

  await createGithubFile(accessToken, config.owner, config.repo, workspaceFile.path, workspaceFile.content, 'sync: inicializar notas')
}

async function applyRemoteWorkspaceSnapshot(document: GithubWorkspaceDocument, files: Map<string, string>, config: GithubSyncConfig): Promise<void> {
  const [currentFolders, currentNotes] = await Promise.all([listFolders(), listNotes()])
  const remoteFolderIds = new Set(document.folders.map((folder) => folder.id))
  const remoteNoteIds = new Set(document.notes.map((note) => note.id))

  await Promise.all(currentFolders.filter((folder) => !remoteFolderIds.has(folder.id)).map((folder) => deleteFolderById(folder.id)))
  await Promise.all(
    currentNotes
      .filter((note) => !remoteNoteIds.has(note.id))
      .map(async (note) => {
        await Promise.all([deleteNoteById(note.id), deleteStoredFile(note.contentRef.markdownPath), deleteStoredFile(note.contentRef.drawingPath)])
      }),
  )

  if (document.preferences) {
    await savePreferences(document.preferences)
  }

  await Promise.all(document.folders.map((folder) => saveFolder(folder)))
  await Promise.all(document.notes.map((note) => saveNote(note)))

  await Promise.all(
    document.notes.flatMap((note) => [
      saveStoredFile({ path: note.contentRef.markdownPath, content: files.get(createNoteMarkdownPath(config, note)) ?? '', kind: 'text' }),
      saveStoredFile({ path: note.contentRef.drawingPath, content: files.get(createNoteDrawingPath(config, note)) ?? JSON.stringify(createEmptyDrawing()), kind: 'json' }),
    ]),
  )

  await markLocalWorkspaceChanged(document.updatedAt)
}

async function writeSyncState(patch: Partial<Omit<GithubSyncState, 'id' | 'updatedAt'>>): Promise<GithubSyncState> {
  const current = await loadGithubSyncState()

  return saveGithubSyncState({
    status: patch.status ?? current?.status ?? 'idle',
    lastSyncedAt: patch.status === 'synced' ? nowIso() : (patch.lastSyncedAt ?? current?.lastSyncedAt ?? null),
    lastDirection: patch.lastDirection === undefined ? (current?.lastDirection ?? null) : patch.lastDirection,
    lastError: patch.lastError === undefined ? (current?.lastError ?? null) : patch.lastError,
    remoteUpdatedAt: patch.remoteUpdatedAt === undefined ? (current?.remoteUpdatedAt ?? null) : patch.remoteUpdatedAt,
  })
}

function createTreeEntryMap(tree: GithubTreeItem[]): Map<string, GithubTreeItem> {
  return new Map(tree.filter((entry) => entry.type === 'blob' && entry.path).map((entry) => [entry.path as string, entry]))
}

function createWorkspacePath(config: GithubSyncConfig): string {
  return `${normalizeBasePath(config.basePath)}/${WORKSPACE_FILE_NAME}`
}

function createNoteMarkdownPath(config: GithubSyncConfig, note: Note): string {
  return `${normalizeBasePath(config.basePath)}/notes/${note.id}/markdown.md`
}

function createNoteDrawingPath(config: GithubSyncConfig, note: Note): string {
  return `${normalizeBasePath(config.basePath)}/notes/${note.id}/drawing.excalidraw.json`
}

function normalizeBasePath(basePath: string): string {
  return basePath.trim().replace(/^\/+|\/+$/g, '') || '.notas-online'
}

function maxIso(values: Array<ISODate | null | undefined>): ISODate {
  const sortedValues = values.filter(Boolean).sort((first, second) => String(second).localeCompare(String(first)))

  return (sortedValues[0] ?? nowIso()) as ISODate
}

function toTime(value: ISODate | null | undefined): number {
  return value ? new Date(value).getTime() : 0
}

function isEmptyRepositoryError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('git repository is empty')
}

function nowIso(): ISODate {
  return new Date().toISOString() as ISODate
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo sincronizar con GitHub'
}
