import { useWorkspaceStore } from '@/app/state/workspace.store'
import { workspaceService } from './workspaceService'
import { decodeSession, encodeSession, type SessionData } from './sessionArchive'
import { getLocalDatabase } from '@/infrastructure/db/localDatabase'
import { createEmptyDrawing, resolveNoteAssetsPath, type NoteId } from '@/domain/notes/note'
import type { FolderId } from '@/domain/folders/folder'
import { nowIso } from '@/domain/shared/valueObjects'
import { loadGameScores, restoreGameScores } from '@/features/dashboard/gameScores'
import { withGithubSyncPaused } from '@/application/sync/githubSyncWorkerBridge'
import { waitForEditorTasks } from '@/features/editor/pendingEditorTasks'
import { normalizeNoteAssets } from '@/features/editor/imageAssets'

export async function exportSession(): Promise<Blob> {
  return withGithubSyncPaused(async () => {
    await savePendingNote()
    const state = useWorkspaceStore.getState()
    const { preferences, notes, folders } = await workspaceService.loadSnapshot()
    const { githubConfig } = state
    const files: Record<string, string> = Object.create(null)
    for (const note of notes) {
      const content = await workspaceService.loadNoteContent(note)
      files[note.contentRef.markdownPath] = content.markdown
      files[note.contentRef.drawingPath] = JSON.stringify(content.drawing)
      files[resolveNoteAssetsPath(note)] = JSON.stringify(content.assets)
    }
    const bytes = await encodeSession({ preferences, notes, folders, files, githubConfig, gameScores: loadGameScores(), view: {
      activeNoteId: notes.some((note) => note.id === state.activeNoteId) ? state.activeNoteId : null,
      activeFolderId: folders.some((folder) => folder.id === state.activeFolderId) ? state.activeFolderId : null, editorMode: state.editorMode,
      sidebarCollapsed: state.sidebarCollapsed, workspaceView: state.workspaceView, search: state.search,
    } })
    return new Blob([new Uint8Array(bytes)], { type: 'application/zip' })
  })
}

export async function readSessionArchive(file: File): Promise<SessionData> {
  if (file.size > 512 * 1024 * 1024) throw new Error('El ZIP supera el límite de 512 MB.')
  return decodeSession(new Uint8Array(await file.arrayBuffer()))
}

export async function importSession(data: SessionData): Promise<void> {
  await withGithubSyncPaused(async () => {
    await savePendingNote()
    const database = await getLocalDatabase()
    const timestamp = nowIso()
    // Fresh paths prevent old OPFS files from shadowing restored IndexedDB content.
    const namespace = `sessions/${crypto.randomUUID()}`
    const notes = data.notes.map((note, index) => ({ ...note, updatedAt: timestamp, contentRef: {
      markdownPath: `${namespace}/${index}.md`, drawingPath: `${namespace}/${index}.excalidraw.json`,
      assetsPath: `${namespace}/${index}.assets.json`,
    } }))
    const transaction = database.transaction(['folders', 'notes', 'files', 'preferences', 'githubConfig', 'githubSyncState', 'localWorkspaceMeta'], 'readwrite')
    const githubConfig = data.githubConfig ? { ...data.githubConfig, enabled: false, initialSyncStrategy: null, updatedAt: timestamp } : null
    const previousScores = loadGameScores()
    const writes: Promise<unknown>[] = []
    try {
      // All note content and metadata are restored atomically, including on quota failures.
      restoreGameScores(data.gameScores)
      for (const name of ['folders', 'notes', 'files', 'preferences', 'githubConfig', 'githubSyncState'] as const) {
        writes.push(transaction.objectStore(name).clear())
      }
      for (const folder of data.folders) writes.push(transaction.objectStore('folders').put({ ...folder, updatedAt: timestamp }))
      notes.forEach((note, index) => {
        writes.push(transaction.objectStore('notes').put(note))
        writes.push(transaction.objectStore('files').put({ path: note.contentRef.markdownPath, content: data.files[data.notes[index].contentRef.markdownPath], kind: 'text', updatedAt: timestamp }))
        writes.push(transaction.objectStore('files').put({ path: note.contentRef.drawingPath, content: data.files[data.notes[index].contentRef.drawingPath], kind: 'json', updatedAt: timestamp }))
        writes.push(transaction.objectStore('files').put({ path: resolveNoteAssetsPath(note), content: data.files[resolveNoteAssetsPath(data.notes[index])] ?? '{}', kind: 'json', updatedAt: timestamp }))
      })
      if (data.preferences) writes.push(transaction.objectStore('preferences').put({ ...data.preferences, updatedAt: timestamp, id: 'active' }))
      if (githubConfig) writes.push(transaction.objectStore('githubConfig').put(githubConfig))
      writes.push(transaction.objectStore('localWorkspaceMeta').put({ id: 'local', updatedAt: timestamp }))
      await Promise.all([...writes, transaction.done])
    }
    catch (error) {
      try { transaction.abort() } catch { /* Already aborted by IndexedDB. */ }
      await Promise.allSettled([...writes, transaction.done])
      restoreGameScores(previousScores)
      throw error
    }
    const activeIndex = notes.findIndex((note) => note.id === data.view.activeNoteId)
    const sourceNote = data.notes[activeIndex]
    useWorkspaceStore.setState({
      ...data.view,
      activeNoteId: data.view.activeNoteId as NoteId | null,
      activeFolderId: data.view.activeFolderId as FolderId | null,
      preferences: data.preferences ? { ...data.preferences, updatedAt: timestamp } : null,
      folders: data.folders.map((folder) => ({ ...folder, updatedAt: timestamp })), notes, githubConfig, githubSyncState: null,
      pendingGithubRepoFullName: null, githubError: null, errorMessage: null,
      markdownDraft: sourceNote ? data.files[sourceNote.contentRef.markdownPath] : '',
      drawingDraft: sourceNote ? JSON.parse(data.files[sourceNote.contentRef.drawingPath]) : createEmptyDrawing(),
      assetsDraft: sourceNote ? normalizeNoteAssets(JSON.parse(data.files[resolveNoteAssetsPath(sourceNote)] ?? '{}')) : {},
      loadedContentNoteId: data.view.activeNoteId as NoteId | null,
      isDirty: false, contentStatus: sourceNote ? 'ready' : 'idle', lastSavedAt: sourceNote ? timestamp : null,
      // Remount editors even when restoring a backup of the same note.
      sessionRevision: useWorkspaceStore.getState().sessionRevision + 1,
    })
  })
}

async function savePendingNote(): Promise<void> {
  await waitForEditorTasks()
  await useWorkspaceStore.getState().saveActiveNote()
  if (useWorkspaceStore.getState().isDirty) await useWorkspaceStore.getState().saveActiveNote()
  if (useWorkspaceStore.getState().isDirty) throw new Error('No se pudo guardar la nota actual.')
}
