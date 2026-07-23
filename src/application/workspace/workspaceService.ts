import { createFolder, type Folder, type FolderIcon, type FolderId } from '@/domain/folders/folder'
import {
  createEmptyDrawing,
  createNote,
  markNoteContentSaved,
  moveNote,
  renameNote,
  type DrawingDocument,
  type Note,
  type NoteContent,
  type NoteId,
} from '@/domain/notes/note'
import type { UserPreferences } from '@/domain/preferences/preferences'
import {
  deleteFolderById,
  deleteNoteById,
  listFolders,
  listNotes,
  loadPreferences,
  markLocalWorkspaceChanged,
  saveFolder,
  saveNote,
  saveStoredFile,
  savePreferences,
} from '@/infrastructure/db/localDatabase'
import { createFileStorage, type FileStorage, type FileStorageMode } from '@/infrastructure/storage/fileStorage'

const INDEXED_DB_FILE_MIRROR_KEY = 'sin-mucha-nota-files-mirrored-v1'
const FILE_MIRROR_BATCH_SIZE = 24
import { collectFolderBranchIds } from '@/application/workspace/noteFilters'
import { getWelcomeDrawing, getWelcomeMarkdown } from '@/application/workspace/welcomeContent'

export type WorkspaceSnapshot = {
  preferences: UserPreferences | null
  folders: Folder[]
  notes: Note[]
}

class WorkspaceService {
  private readonly fileStorage: FileStorage

  constructor(fileStorage: FileStorage) {
    this.fileStorage = fileStorage
  }

  get storageMode(): FileStorageMode {
    return this.fileStorage.mode
  }

  async loadSnapshot(): Promise<WorkspaceSnapshot> {
    const [preferences, folders, notes] = await Promise.all([loadPreferences(), listFolders(), listNotes()])

    return { preferences, folders, notes }
  }

  async completeOnboarding(preferences: UserPreferences): Promise<WorkspaceSnapshot> {
    await savePreferences(preferences)

    const snapshot = await this.loadSnapshot()

    if (snapshot.notes.length === 0 && snapshot.folders.length === 0) {
      await this.seedWorkspace(preferences)
    }

    return this.loadSnapshot()
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    await savePreferences(preferences)
  }

  async createFolder(name: string, parentId: FolderId | null, icon: FolderIcon): Promise<Folder> {
    const folder = createFolder({ name, parentId, icon })

    await saveFolder(folder)

    return folder
  }

  async createNote(title: string, folderId: FolderId | null): Promise<Note> {
    const note = createNote({ title, folderId })

    await saveNote(note)
    await this.fileStorage.writeText(note.contentRef.markdownPath, '')
    await this.fileStorage.writeJson(note.contentRef.drawingPath, createEmptyDrawing())

    return note
  }

  async renameNote(note: Note, title: string): Promise<Note> {
    const renamedNote = renameNote(note, title)

    await saveNote(renamedNote)

    return renamedNote
  }

  async moveNote(note: Note, folderId: FolderId | null): Promise<Note> {
    const movedNote = moveNote(note, folderId)

    await saveNote(movedNote)

    return movedNote
  }

  async loadNoteContent(note: Note): Promise<NoteContent> {
    const [markdown, drawing] = await Promise.all([
      this.fileStorage.readText(note.contentRef.markdownPath),
      this.fileStorage.readJson<DrawingDocument>(note.contentRef.drawingPath),
    ])

    return {
      markdown: markdown ?? '',
      drawing: drawing ?? createEmptyDrawing(),
    }
  }

  async mirrorNoteFilesToIndexedDb(notes: Note[]): Promise<void> {
    if (hasCompletedFileMirror()) {
      return
    }

    for (let index = 0; index < notes.length; index += FILE_MIRROR_BATCH_SIZE) {
      const batch = notes.slice(index, index + FILE_MIRROR_BATCH_SIZE)

      await Promise.all(batch.map(async (note) => {
        const content = await this.loadNoteContent(note)

        await Promise.all([
          saveStoredFile({ path: note.contentRef.markdownPath, content: content.markdown, kind: 'text' }),
          saveStoredFile({ path: note.contentRef.drawingPath, content: JSON.stringify(content.drawing), kind: 'json' }),
        ])
      }))
    }

    markFileMirrorComplete()
  }

  async saveNoteContent(note: Note, content: NoteContent): Promise<Note> {
    const updatedNote = markNoteContentSaved(note)

    await Promise.all([
      this.fileStorage.writeText(note.contentRef.markdownPath, content.markdown),
      this.fileStorage.writeJson(note.contentRef.drawingPath, content.drawing),
      saveNote(updatedNote),
    ])

    return updatedNote
  }

  async deleteNote(note: Note): Promise<void> {
    await Promise.all([
      deleteNoteById(note.id),
      this.fileStorage.deleteFile(note.contentRef.markdownPath),
      this.fileStorage.deleteFile(note.contentRef.drawingPath),
    ])
    await markLocalWorkspaceChanged()
  }

  async deleteFolder(folderId: FolderId, folders: Folder[], notes: Note[]): Promise<{ deletedFolderIds: FolderId[]; deletedNoteIds: NoteId[] }> {
    const folderIds = collectFolderBranchIds(folderId, folders)
    const folderIdSet = new Set(folderIds)
    const notesToDelete = notes.filter((note) => note.folderId !== null && folderIdSet.has(note.folderId))

    await Promise.all([
      ...folderIds.map((id) => deleteFolderById(id)),
      ...notesToDelete.map((note) => this.deleteNote(note)),
    ])
    await markLocalWorkspaceChanged()

    return {
      deletedFolderIds: folderIds,
      deletedNoteIds: notesToDelete.map((note) => note.id),
    }
  }

  private async seedWorkspace(preferences: UserPreferences): Promise<void> {
    const homeFolder = createFolder({ name: preferences.locale === 'en' ? 'Home' : 'Inicio', parentId: null, icon: 'personal' })
    const sketchesFolder = createFolder({ name: preferences.locale === 'en' ? 'Sketches' : 'Bocetos', parentId: homeFolder.id, icon: 'idea' })
    const welcomeNote = createNote({ title: preferences.locale === 'en' ? 'First warm note' : 'Primera nota calida', folderId: homeFolder.id })

    await Promise.all([
      saveFolder(homeFolder),
      saveFolder(sketchesFolder),
      saveNote(welcomeNote),
      this.fileStorage.writeText(welcomeNote.contentRef.markdownPath, getWelcomeMarkdown(preferences.locale, preferences.displayName)),
      this.fileStorage.writeJson(welcomeNote.contentRef.drawingPath, getWelcomeDrawing()),
    ])
  }
}

export const workspaceService = new WorkspaceService(createFileStorage())

function hasCompletedFileMirror(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return window.localStorage.getItem(INDEXED_DB_FILE_MIRROR_KEY) === '1'
  } catch {
    return false
  }
}

function markFileMirrorComplete(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(INDEXED_DB_FILE_MIRROR_KEY, '1')
  } catch {
    // Storage can be unavailable in privacy-restricted contexts; mirroring still succeeded.
  }
}
