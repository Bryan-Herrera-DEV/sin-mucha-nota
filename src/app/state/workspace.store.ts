import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type { Folder, FolderIcon, FolderId } from '@/domain/folders/folder'
import { createEmptyDrawing, type DrawingDocument, type Note, type NoteId } from '@/domain/notes/note'
import {
  createUserPreferences,
  updateUserPreferences,
  type FontFamily,
  type Locale,
  type ThemeId,
  type UserPreferences,
} from '@/domain/preferences/preferences'
import type { ISODate } from '@/domain/shared/valueObjects'
import { getVisibleNotes } from '@/application/workspace/noteFilters'
import { workspaceService } from '@/application/workspace/workspaceService'
import { loadGithubAuth, loadGithubConfig, loadGithubSyncState, type GithubAuth, type GithubSyncConfig, type GithubSyncState } from '@/infrastructure/db/localDatabase'
import { createZustandIndexedDbJsonStorage } from '@/infrastructure/state/zustandIndexedDbStorage'

export type EditorMode = 'split' | 'markdown' | 'drawing' | 'preview'
export type BootStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ContentStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

type OnboardingInput = {
  displayName: string
  accentColor: string
  themeId: ThemeId
  fontFamily: FontFamily
  locale: Locale
}

type WorkspaceState = {
  bootStatus: BootStatus
  contentStatus: ContentStatus
  storageMode: string
  preferences: UserPreferences | null
  folders: Folder[]
  notes: Note[]
  activeFolderId: FolderId | null
  activeNoteId: NoteId | null
  markdownDraft: string
  drawingDraft: DrawingDocument
  loadedContentNoteId: NoteId | null
  editorMode: EditorMode
  search: string
  isDirty: boolean
  settingsOpen: boolean
  sidebarCollapsed: boolean
  lastSavedAt: ISODate | null
  githubAuth: GithubAuth | null
  githubConfig: GithubSyncConfig | null
  githubSyncState: GithubSyncState | null
  errorMessage: string | null
}

type WorkspaceActions = {
  bootstrap(): Promise<void>
  completeOnboarding(input: OnboardingInput): Promise<void>
  selectFolder(folderId: FolderId | null): void
  selectNote(noteId: NoteId): Promise<void>
  createFolder(name: string, parentId: FolderId | null, icon: FolderIcon): Promise<void>
  createNote(title: string, folderId: FolderId | null): Promise<void>
  renameActiveNote(title: string): Promise<void>
  moveActiveNote(folderId: FolderId | null): Promise<void>
  deleteNote(noteId: NoteId): Promise<void>
  deleteFolder(folderId: FolderId): Promise<void>
  updateMarkdownDraft(markdown: string): void
  updateDrawingDraft(noteId: NoteId, drawing: DrawingDocument): void
  saveActiveNote(): Promise<void>
  setEditorMode(mode: EditorMode): void
  setSearch(search: string): void
  setSettingsOpen(open: boolean): void
  setSidebarCollapsed(collapsed: boolean): void
  loadGithubSettings(): Promise<void>
  updatePreferences(patch: Partial<Omit<UserPreferences, 'onboardedAt' | 'updatedAt' | 'accentColor'> & { accentColor: string }>): Promise<void>
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions

type PersistedWorkspaceState = Pick<WorkspaceState, 'activeFolderId' | 'activeNoteId' | 'editorMode' | 'settingsOpen' | 'sidebarCollapsed'>

const initialWorkspaceState: WorkspaceState = {
  bootStatus: 'idle',
  contentStatus: 'idle',
  storageMode: workspaceService.storageMode,
  preferences: null,
  folders: [],
  notes: [],
  activeFolderId: null,
  activeNoteId: null,
  markdownDraft: '',
  drawingDraft: createEmptyDrawing(),
  loadedContentNoteId: null,
  editorMode: 'split',
  search: '',
  isDirty: false,
  settingsOpen: false,
  sidebarCollapsed: false,
  lastSavedAt: null,
  githubAuth: null,
  githubConfig: null,
  githubSyncState: null,
  errorMessage: null,
}

const persistedWorkspaceStorage = createZustandIndexedDbJsonStorage<PersistedWorkspaceState>()

export const useWorkspaceStore = create<WorkspaceStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialWorkspaceState,
        async bootstrap() {
          if (get().bootStatus === 'loading') {
            return
          }

          set({ bootStatus: 'loading', errorMessage: null })

          try {
            const snapshot = await workspaceService.loadSnapshot()
            await workspaceService.mirrorNoteFilesToIndexedDb(snapshot.notes)
            const [githubAuth, githubConfig, githubSyncState] = await Promise.all([loadGithubAuth(), loadGithubConfig(), loadGithubSyncState()])
            const activeNote = pickActiveNote(snapshot.notes, get().activeNoteId)
            const content = activeNote ? await workspaceService.loadNoteContent(activeNote) : null
            const activeFolderId = resolveActiveFolderId(snapshot.folders, get().activeFolderId)

            set({
              preferences: snapshot.preferences,
              folders: snapshot.folders,
              notes: snapshot.notes,
              storageMode: workspaceService.storageMode,
              activeFolderId,
              activeNoteId: activeNote?.id ?? null,
              markdownDraft: content?.markdown ?? '',
              drawingDraft: content?.drawing ?? createEmptyDrawing(),
              loadedContentNoteId: activeNote?.id ?? null,
              isDirty: false,
              bootStatus: 'ready',
              contentStatus: activeNote ? 'ready' : 'idle',
              lastSavedAt: activeNote?.updatedAt ?? null,
              githubAuth,
              githubConfig,
              githubSyncState,
            })
          } catch (error) {
            set({ bootStatus: 'error', contentStatus: 'error', errorMessage: getErrorMessage(error) })
          }
        },
        async completeOnboarding(input) {
          set({ bootStatus: 'loading', errorMessage: null })

          try {
            const preferences = createUserPreferences({ ...input, soundEnabled: true })
            const snapshot = await workspaceService.completeOnboarding(preferences)
            const activeNote = pickActiveNote(snapshot.notes, null)
            const content = activeNote ? await workspaceService.loadNoteContent(activeNote) : null

            set({
              preferences: snapshot.preferences,
              folders: snapshot.folders,
              notes: snapshot.notes,
              activeFolderId: null,
              activeNoteId: activeNote?.id ?? null,
              markdownDraft: content?.markdown ?? '',
              drawingDraft: content?.drawing ?? createEmptyDrawing(),
              loadedContentNoteId: activeNote?.id ?? null,
              isDirty: false,
              bootStatus: 'ready',
              contentStatus: activeNote ? 'ready' : 'idle',
              lastSavedAt: activeNote?.updatedAt ?? null,
            })
          } catch (error) {
            set({ bootStatus: 'error', contentStatus: 'error', errorMessage: getErrorMessage(error) })
          }
        },
        selectFolder(folderId) {
          set({ activeFolderId: folderId })
        },
        async selectNote(noteId) {
          const note = get().notes.find((candidate) => candidate.id === noteId)

          if (!note) {
            return
          }

          if (get().isDirty) {
            await get().saveActiveNote()
          }

          set({
            activeNoteId: noteId,
            markdownDraft: '',
            drawingDraft: createEmptyDrawing(),
            loadedContentNoteId: null,
            isDirty: false,
            contentStatus: 'loading',
            errorMessage: null,
          })

          try {
            const content = await workspaceService.loadNoteContent(note)

            if (get().activeNoteId !== noteId) {
              return
            }

            set({
              markdownDraft: content.markdown,
              drawingDraft: content.drawing,
              loadedContentNoteId: noteId,
              isDirty: false,
              contentStatus: 'ready',
              lastSavedAt: note.updatedAt,
            })
          } catch (error) {
            set({ contentStatus: 'error', errorMessage: getErrorMessage(error) })
          }
        },
        async createFolder(name, parentId, icon) {
          try {
            const folder = await workspaceService.createFolder(name, parentId, icon)

            set((state) => ({
              folders: [...state.folders, folder].sort((first, second) => first.name.localeCompare(second.name)),
              activeFolderId: folder.id,
            }))
          } catch (error) {
            set({ errorMessage: getErrorMessage(error) })
          }
        },
        async createNote(title, folderId) {
          if (get().isDirty) {
            await get().saveActiveNote()
          }

          try {
            const note = await workspaceService.createNote(title, folderId)

            set((state) => ({
              notes: [note, ...state.notes],
              activeNoteId: note.id,
              activeFolderId: folderId,
              markdownDraft: '',
              drawingDraft: createEmptyDrawing(),
              loadedContentNoteId: note.id,
              isDirty: false,
              contentStatus: 'ready',
              lastSavedAt: note.updatedAt,
            }))
          } catch (error) {
            set({ errorMessage: getErrorMessage(error) })
          }
        },
        async renameActiveNote(title) {
          const activeNote = get().notes.find((note) => note.id === get().activeNoteId)

          if (!activeNote || activeNote.title === title.trim()) {
            return
          }

          try {
            const renamedNote = await workspaceService.renameNote(activeNote, title)

            set((state) => ({
              notes: state.notes.map((note) => (note.id === renamedNote.id ? renamedNote : note)),
              lastSavedAt: renamedNote.updatedAt,
            }))
          } catch (error) {
            set({ errorMessage: getErrorMessage(error) })
          }
        },
        async moveActiveNote(folderId) {
          const activeNote = get().notes.find((note) => note.id === get().activeNoteId)

          if (!activeNote || activeNote.folderId === folderId) {
            return
          }

          try {
            const movedNote = await workspaceService.moveNote(activeNote, folderId)

            set((state) => ({
              notes: state.notes.map((note) => (note.id === movedNote.id ? movedNote : note)),
              lastSavedAt: movedNote.updatedAt,
            }))
          } catch (error) {
            set({ errorMessage: getErrorMessage(error) })
          }
        },
        async deleteNote(noteId) {
          const note = get().notes.find((candidate) => candidate.id === noteId)

          if (!note) {
            return
          }

          try {
            await workspaceService.deleteNote(note)

            const state = get()
            const nextNotes = state.notes.filter((candidate) => candidate.id !== noteId)
            const nextActiveNote = state.activeNoteId === noteId ? getVisibleNotes(nextNotes, state.folders, state.activeFolderId, state.search)[0] : null

            set({ notes: nextNotes, isDirty: false })

            if (nextActiveNote) {
              await get().selectNote(nextActiveNote.id)
            } else if (get().activeNoteId === noteId) {
              set({
                activeNoteId: null,
                markdownDraft: '',
                drawingDraft: createEmptyDrawing(),
                loadedContentNoteId: null,
                contentStatus: 'idle',
                lastSavedAt: null,
              })
            }
          } catch (error) {
            set({ errorMessage: getErrorMessage(error) })
          }
        },
        async deleteFolder(folderId) {
          try {
            const deleted = await workspaceService.deleteFolder(folderId, get().folders, get().notes)
            const notes = get().notes.filter((note) => !deleted.deletedNoteIds.includes(note.id))
            const activeNoteStillExists = get().activeNoteId !== null && notes.some((note) => note.id === get().activeNoteId)

            set({
              folders: get().folders.filter((folder) => !deleted.deletedFolderIds.includes(folder.id)),
              notes,
              activeFolderId: deleted.deletedFolderIds.includes(get().activeFolderId as FolderId) ? null : get().activeFolderId,
              isDirty: activeNoteStillExists ? get().isDirty : false,
            })

            if (!activeNoteStillExists) {
              const state = get()
              const nextNote = getVisibleNotes(notes, state.folders, state.activeFolderId, state.search)[0]

              if (nextNote) {
                await get().selectNote(nextNote.id)
              } else {
                set({ activeNoteId: null, markdownDraft: '', drawingDraft: createEmptyDrawing(), loadedContentNoteId: null, contentStatus: 'idle' })
              }
            }
          } catch (error) {
            set({ errorMessage: getErrorMessage(error) })
          }
        },
        updateMarkdownDraft(markdown) {
          if (get().activeNoteId !== get().loadedContentNoteId) {
            return
          }

          set({ markdownDraft: markdown, isDirty: true })
        },
        updateDrawingDraft(noteId, drawing) {
          if (get().activeNoteId !== noteId || get().loadedContentNoteId !== noteId) {
            return
          }

          if (areDrawingsEqual(get().drawingDraft, drawing)) {
            return
          }

          set({ drawingDraft: drawing, isDirty: true })
        },
        async saveActiveNote() {
          const activeNote = get().notes.find((note) => note.id === get().activeNoteId)

          if (!activeNote || !get().isDirty || get().loadedContentNoteId !== activeNote.id) {
            return
          }

          set({ contentStatus: 'saving', errorMessage: null })

          try {
            const savedNote = await workspaceService.saveNoteContent(activeNote, {
              markdown: get().markdownDraft,
              drawing: get().drawingDraft,
            })

            set((state) => ({
              notes: state.notes.map((note) => (note.id === savedNote.id ? savedNote : note)),
              contentStatus: 'ready',
              isDirty: false,
              lastSavedAt: savedNote.updatedAt,
            }))
          } catch (error) {
            set({ contentStatus: 'error', errorMessage: getErrorMessage(error) })
          }
        },
        setEditorMode(mode) {
          set({ editorMode: mode })
        },
        setSearch(search) {
          set({ search })
        },
        setSettingsOpen(open) {
          set({ settingsOpen: open })
        },
        setSidebarCollapsed(collapsed) {
          set({ sidebarCollapsed: collapsed })
        },
        async loadGithubSettings() {
          const [githubAuth, githubConfig, githubSyncState] = await Promise.all([loadGithubAuth(), loadGithubConfig(), loadGithubSyncState()])

          set({ githubAuth, githubConfig, githubSyncState })
        },
        async updatePreferences(patch) {
          const preferences = get().preferences

          if (!preferences) {
            return
          }

          try {
            const updatedPreferences = updateUserPreferences(preferences, patch)

            set({ preferences: updatedPreferences })
            await workspaceService.savePreferences(updatedPreferences)
          } catch (error) {
            set({ errorMessage: getErrorMessage(error) })
          }
        },
      }),
      {
        name: 'notas-crema-ui-v1',
        storage: persistedWorkspaceStorage,
        version: 2,
        migrate: (persistedState) => sanitizePersistedWorkspaceState(persistedState),
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...sanitizePersistedWorkspaceState(persistedState),
          search: '',
        }),
        partialize: (state) => ({
          activeFolderId: state.activeFolderId,
          activeNoteId: state.activeNoteId,
          editorMode: state.editorMode,
          settingsOpen: state.settingsOpen,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      },
    ),
  ),
)

function areDrawingsEqual(first: DrawingDocument, second: DrawingDocument): boolean {
  if (first === second) {
    return true
  }

  return createDrawingSignature(first) === createDrawingSignature(second)
}

function createDrawingSignature(drawing: DrawingDocument): string {
  try {
    return JSON.stringify(drawing)
  } catch {
    return `${drawing.elements.length}:${Object.keys(drawing.files).length}:${Object.keys(drawing.appState).join(',')}`
  }
}

function pickActiveNote(notes: Note[], activeNoteId: NoteId | null): Note | null {
  return notes.find((note) => note.id === activeNoteId) ?? notes[0] ?? null
}

function resolveActiveFolderId(folders: Folder[], currentFolderId: FolderId | null): FolderId | null {
  if (currentFolderId && folders.some((folder) => folder.id === currentFolderId)) {
    return currentFolderId
  }

  return null
}

function sanitizePersistedWorkspaceState(persistedState: unknown): PersistedWorkspaceState {
  const state = typeof persistedState === 'object' && persistedState !== null ? (persistedState as Partial<PersistedWorkspaceState>) : {}

  return {
    activeFolderId: state.activeFolderId ?? null,
    activeNoteId: state.activeNoteId ?? null,
    editorMode: isEditorMode(state.editorMode) ? state.editorMode : 'split',
    settingsOpen: state.settingsOpen ?? false,
    sidebarCollapsed: state.sidebarCollapsed ?? false,
  }
}

function isEditorMode(value: unknown): value is EditorMode {
  return value === 'split' || value === 'markdown' || value === 'drawing' || value === 'preview'
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrio un error inesperado'
}
