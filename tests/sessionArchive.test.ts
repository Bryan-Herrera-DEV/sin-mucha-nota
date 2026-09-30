import { beforeEach, describe, expect, it, vi } from 'vitest'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { decodeSession, encodeSession, type SessionData } from '@/application/workspace/sessionArchive'
import { exportSession, importSession } from '@/application/workspace/sessionTransfer'
import { createFolder } from '@/domain/folders/folder'
import { createNote } from '@/domain/notes/note'
import { createUserPreferences } from '@/domain/preferences/preferences'
import { getLocalDatabase, loadStoredFile, saveGithubAuth } from '@/infrastructure/db/localDatabase'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { workspaceService } from '@/application/workspace/workspaceService'
import { loadGameScores } from '@/features/dashboard/gameScores'

const dataUrl = 'data:image/png;base64,iVBORw0KGgo='

function fixture(): SessionData {
  const folder = createFolder({ name: 'Árbol', parentId: null })
  const child = createFolder({ name: 'Imágenes', parentId: folder.id })
  const note = createNote({ title: 'Nota con imágenes 🌈', folderId: child.id })
  return {
    preferences: createUserPreferences({ displayName: 'Prueba', locale: 'es', accentColor: '#789abc', fontFamily: 'mono' }),
    folders: [folder, child], notes: [note],
    files: { [note.contentRef.markdownPath]: `# Hola\n![imagen](${dataUrl})`,
      [note.contentRef.drawingPath]: JSON.stringify({ elements: [{ id: 'image1', type: 'image', fileId: 'file1' }], appState: {},
        files: { file1: { id: 'file1', dataURL: dataUrl, mimeType: 'image/png', created: 1 } } }) },
    view: { activeFolderId: child.id, activeNoteId: note.id, editorMode: 'split', sidebarCollapsed: true, workspaceView: 'notes', search: 'imagen' },
    gameScores: { best: 12, history: [{ id: 'game', score: 12, playedAt: new Date().toISOString() }] },
    githubConfig: { id: 'config', owner: 'owner', repo: 'notes', repoFullName: 'owner/notes', branch: 'main', basePath: 'workspace',
      enabled: true, initialSyncStrategy: 'push-local', selectedAt: note.createdAt, updatedAt: note.updatedAt },
  }
}

beforeEach(async () => {
  const database = await getLocalDatabase()
  await Promise.all(Array.from(database.objectStoreNames).map((store) => database.clear(store)))
  localStorage.clear()
  useWorkspaceStore.setState({ isDirty: false, activeNoteId: null, loadedContentNoteId: null, notes: [], folders: [], contentStatus: 'idle', githubConfig: null })
})

describe('session ZIP', () => {
  it('round trips nested folders, Unicode, both image formats, preferences, view and scores', async () => {
    const original = fixture()
    const bytes = await encodeSession(original)
    expect(Array.from(bytes.slice(0, 2))).toEqual([80, 75])
    const restored = await decodeSession(bytes)
    expect(restored).toEqual({ ...original, githubConfig: { ...original.githubConfig, enabled: false, initialSyncStrategy: null } })
  })

  it('rejects missing note files before any session can be restored', async () => {
    const original = fixture()
    const entries = unzipSync(await encodeSession(original))
    delete entries[`content/${original.notes[0].contentRef.drawingPath}`]
    await expect(decodeSession(zipSync(entries))).rejects.toThrow('Falta un archivo')
  })

  it.each(['cycle', 'duplicate', 'missing-image', 'unsafe-path', 'unsupported-version', 'bad-preferences'])('rejects invalid archive: %s', async (fault) => {
    const original = fixture()
    const entries = unzipSync(await encodeSession(original))
    const manifest = JSON.parse(strFromU8(entries['session.json']))
    if (fault === 'cycle') manifest.folders[0].parentId = manifest.folders[1].id
    if (fault === 'duplicate') manifest.notes.push(manifest.notes[0])
    if (fault === 'unsafe-path') manifest.notes[0].contentRef.markdownPath = '../outside.md'
    if (fault === 'unsupported-version') manifest.version = 200
    if (fault === 'bad-preferences') manifest.preferences.locale = 'missing'
    if (fault === 'missing-image') {
      const path = `content/${original.notes[0].contentRef.drawingPath}`
      const drawing = JSON.parse(strFromU8(entries[path]))
      drawing.files = {}
      entries[path] = strToU8(JSON.stringify(drawing))
    }
    entries['session.json'] = strToU8(JSON.stringify(manifest))
    await expect(decodeSession(zipSync(entries))).rejects.toThrow()
  })

  it('restores files and UI, keeps local credentials, pauses sync and preserves images after reload', async () => {
    await saveGithubAuth({ accessToken: 'test-secret-must-not-export', tokenType: 'bearer', scope: 'repo', username: 'test', avatarUrl: null })
    const original = fixture()
    await importSession(await decodeSession(await encodeSession(original)))
    const state = useWorkspaceStore.getState()
    expect(state.drawingDraft.files).toHaveProperty('file1')
    expect(state.editorMode).toBe('split')
    expect(state.activeFolderId).toBe(original.view.activeFolderId)
    expect(state.githubConfig?.enabled).toBe(false)
    expect(loadGameScores()).toEqual(original.gameScores)
    const note = state.notes[0]
    expect(note.contentRef.markdownPath).toMatch(/^sessions\//)
    expect((await loadStoredFile(note.contentRef.markdownPath))?.content).toContain(dataUrl)
    expect((await workspaceService.loadNoteContent(note)).drawing.files).toHaveProperty('file1')
    const database = await getLocalDatabase()
    expect((await database.get('githubAuth', 'auth'))?.accessToken).toBe('test-secret-must-not-export')
    useWorkspaceStore.getState().updateMarkdownDraft('# Unsaved image\n' + dataUrl)
    // Export must save the current draft even before the autosave timer fires.
    const archive = await exportSession()
    const bytes = new Uint8Array(await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.readAsArrayBuffer(archive)
    }))
    const entries = unzipSync(bytes)
    expect(strFromU8(entries['session.json'])).not.toContain('test-secret')
    const decoded = await decodeSession(bytes)
    expect(decoded.files[note.contentRef.markdownPath]).toBe('# Unsaved image\n' + dataUrl)
    expect(JSON.parse(decoded.files[note.contentRef.drawingPath]).files.file1.dataURL).toBe(dataUrl)
  })

  it('rolls back all data and scores when storage fails during import', async () => {
    const original = await decodeSession(await encodeSession(fixture()))
    await importSession(original)
    const database = await getLocalDatabase()
    const existingNotes = await database.getAll('notes')
    const existingFiles = await database.getAll('files')
    const put = IDBObjectStore.prototype.put
    const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
      if (this.name === 'files') throw new DOMException('Storage full', 'QuotaExceededError')
      return put.call(this, value, key)
    })
    try {
      await expect(importSession({ ...original, gameScores: { best: 999, history: [] } })).rejects.toThrow('Storage full')
    } finally { failure.mockRestore() }
    expect(await database.getAll('notes')).toEqual(existingNotes)
    expect(await database.getAll('files')).toEqual(existingFiles)
    expect(loadGameScores()).toEqual(original.gameScores)
  })
})
