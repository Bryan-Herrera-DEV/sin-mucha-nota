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
import {
  deleteGithubAuth,
  deleteGithubConfig,
  deleteGithubSyncState,
  loadGithubAuth,
  loadGithubConfig,
  loadGithubSyncState,
  saveGithubAuth,
  saveGithubConfig,
  type GithubAuth,
  type GithubInitialSyncStrategy,
  type GithubSyncConfig,
  type GithubSyncState,
} from '@/infrastructure/db/localDatabase'
import { canUseGithubOAuth, getGithubUser, listGithubRepositories, pollGithubDeviceToken, requestGithubDeviceCode, type GithubRepository } from '@/infrastructure/github/githubApi'
import { createZustandIndexedDbJsonStorage } from '@/infrastructure/state/zustandIndexedDbStorage'
import { getErrorMessage, reportAppError } from '@/shared/lib/appError'

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

type GithubDeviceFlow = {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresAt: number
  intervalSeconds: number
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
  githubRepos: GithubRepository[]
  pendingGithubRepoFullName: string | null
  githubDeviceFlow: GithubDeviceFlow | null
  githubBusy: boolean
  githubError: string | null
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
  startGithubOAuth(): Promise<void>
  completeGithubOAuth(): Promise<void>
  loadGithubRepositories(): Promise<void>
  selectGithubRepository(repoFullName: string): Promise<void>
  confirmGithubRepositorySync(strategy: GithubInitialSyncStrategy): Promise<void>
  cancelGithubRepositorySelection(): void
  disconnectGithub(): Promise<void>
  syncGithubNow(): void
  dismissError(): void
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
  editorMode: 'markdown',
  search: '',
  isDirty: false,
  settingsOpen: false,
  sidebarCollapsed: false,
  lastSavedAt: null,
  githubAuth: null,
  githubConfig: null,
  githubSyncState: null,
  githubRepos: [],
  pendingGithubRepoFullName: null,
  githubDeviceFlow: null,
  githubBusy: false,
  githubError: null,
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
            const [snapshot, githubAuth, githubConfig, githubSyncState] = await Promise.all([
              workspaceService.loadSnapshot(),
              loadGithubAuth(),
              loadGithubConfig(),
              loadGithubSyncState(),
            ])
            await workspaceService.mirrorNoteFilesToIndexedDb(snapshot.notes)
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
            set({ bootStatus: 'error', contentStatus: 'error', errorMessage: handleStoreError(error, 'bootstrap') })
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
            set({ bootStatus: 'error', contentStatus: 'error', errorMessage: handleStoreError(error, 'completeOnboarding') })
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
            set({ contentStatus: 'error', errorMessage: handleStoreError(error, 'selectNote') })
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
            set({ errorMessage: handleStoreError(error, 'createFolder') })
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
            set({ errorMessage: handleStoreError(error, 'createNote') })
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
            set({ errorMessage: handleStoreError(error, 'renameActiveNote') })
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
            set({ errorMessage: handleStoreError(error, 'moveActiveNote') })
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
            set({ errorMessage: handleStoreError(error, 'deleteNote') })
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
            set({ errorMessage: handleStoreError(error, 'deleteFolder') })
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
            set({ contentStatus: 'error', errorMessage: handleStoreError(error, 'saveActiveNote') })
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
          try {
            const [githubAuth, githubConfig, githubSyncState] = await Promise.all([loadGithubAuth(), loadGithubConfig(), loadGithubSyncState()])

            set({ githubAuth, githubConfig, githubSyncState })
          } catch (error) {
            set({ githubError: handleStoreError(error, 'loadGithubSettings') })
          }
        },
        async startGithubOAuth() {
          if (!canUseGithubOAuth()) {
            set({ githubBusy: false, githubDeviceFlow: null, githubError: null })

            return
          }

          const clientId = getGithubClientId()

          if (!clientId) {
            set({ githubError: 'Configura VITE_GITHUB_CLIENT_ID para activar OAuth con GitHub.' })

            return
          }

          set({ githubBusy: true, githubError: null })

          try {
            const deviceFlow = await requestGithubDeviceCode(clientId)

            set({
              githubDeviceFlow: {
                deviceCode: deviceFlow.device_code,
                userCode: deviceFlow.user_code,
                verificationUri: deviceFlow.verification_uri,
                expiresAt: Date.now() + deviceFlow.expires_in * 1000,
                intervalSeconds: deviceFlow.interval,
              },
              githubBusy: false,
            })
          } catch (error) {
            set({ githubBusy: false, githubError: handleStoreError(error, 'startGithubOAuth') })
          }
        },
        async completeGithubOAuth() {
          if (!canUseGithubOAuth()) {
            set({ githubDeviceFlow: null, githubBusy: false })

            return
          }

          const clientId = getGithubClientId()
          const deviceFlow = get().githubDeviceFlow

          if (!clientId || !deviceFlow || Date.now() > deviceFlow.expiresAt) {
            set({ githubDeviceFlow: null, githubBusy: false })

            return
          }

          try {
            const token = await pollGithubDeviceToken(clientId, deviceFlow.deviceCode)
            const user = await getGithubUser(token.access_token)
            const githubAuth = await saveGithubAuth({
              accessToken: token.access_token,
              tokenType: token.token_type,
              scope: token.scope,
              username: user.login,
              avatarUrl: user.avatar_url,
            })

            set({ githubAuth, githubDeviceFlow: null, githubBusy: false, githubError: null })
            await get().loadGithubRepositories()
          } catch (error) {
            const message = getErrorMessage(error)

            if (message === 'authorization_pending') {
              return
            }

            if (message === 'slow_down') {
              set((state) => ({ githubDeviceFlow: state.githubDeviceFlow ? { ...state.githubDeviceFlow, intervalSeconds: state.githubDeviceFlow.intervalSeconds + 5 } : null }))

              return
            }

            set({ githubBusy: false, githubError: handleStoreError(error, 'completeGithubOAuth') })
          }
        },
        async loadGithubRepositories() {
          const auth = get().githubAuth ?? (await loadGithubAuth())

          if (!auth) {
            return
          }

          set({ githubBusy: true, githubError: null })

          try {
            const githubRepos = await listGithubRepositories(auth.accessToken)

            set({ githubRepos, githubBusy: false })
          } catch (error) {
            set({ githubBusy: false, githubError: handleStoreError(error, 'loadGithubRepositories') })
          }
        },
        async selectGithubRepository(repoFullName) {
          const repo = get().githubRepos.find((candidate) => candidate.full_name === repoFullName)

          if (!repo) {
            return
          }

          if (get().githubConfig?.repoFullName === repoFullName && !get().githubConfig?.initialSyncStrategy) {
            return
          }

          set({ pendingGithubRepoFullName: repoFullName, githubError: null })
        },
        async confirmGithubRepositorySync(strategy) {
          const state = get()
          const repoFullName = state.pendingGithubRepoFullName ?? state.githubConfig?.repoFullName
          const repo = state.githubRepos.find((candidate) => candidate.full_name === repoFullName)
          const currentConfig = state.githubConfig?.repoFullName === repoFullName ? state.githubConfig : null
          const owner = repo?.owner.login ?? currentConfig?.owner
          const repoName = repo?.name ?? currentConfig?.repo
          const branch = repo?.default_branch ?? currentConfig?.branch

          if (!repoFullName || !owner || !repoName || !branch) {
            return
          }

          set({ githubBusy: true, githubError: null })

          try {
            const githubConfig = await saveGithubConfig({
              owner,
              repo: repoName,
              repoFullName,
              branch,
              basePath: currentConfig?.basePath ?? '.sin-mucha-nota',
              enabled: true,
              initialSyncStrategy: strategy,
              selectedAt: currentConfig?.selectedAt,
            })

            set({ githubConfig, pendingGithubRepoFullName: null, githubBusy: false, githubError: null })
            dispatchGithubSyncEvent('github-sync-now')
          } catch (error) {
            set({ githubBusy: false, githubError: handleStoreError(error, 'confirmGithubRepositorySync') })
          }
        },
        cancelGithubRepositorySelection() {
          set({ pendingGithubRepoFullName: null })
        },
        async disconnectGithub() {
          await Promise.all([deleteGithubAuth(), deleteGithubConfig(), deleteGithubSyncState()])
          set({ githubAuth: null, githubConfig: null, githubSyncState: null, githubRepos: [], pendingGithubRepoFullName: null, githubDeviceFlow: null, githubError: null })
          dispatchGithubSyncEvent('github-sync-config-changed')
        },
        syncGithubNow() {
          dispatchGithubSyncEvent('github-sync-now')
        },
        dismissError() {
          set({ errorMessage: null })
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
            set({ errorMessage: handleStoreError(error, 'updatePreferences') })
          }
        },
      }),
      {
        name: 'sin-mucha-nota-ui-v1',
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
    editorMode: isEditorMode(state.editorMode) ? state.editorMode : 'markdown',
    settingsOpen: state.settingsOpen ?? false,
    sidebarCollapsed: state.sidebarCollapsed ?? false,
  }
}

function isEditorMode(value: unknown): value is EditorMode {
  return value === 'split' || value === 'markdown' || value === 'drawing' || value === 'preview'
}

function getGithubClientId(): string {
  return import.meta.env.VITE_GITHUB_CLIENT_ID?.trim() ?? ''
}

function dispatchGithubSyncEvent(type: 'github-sync-now' | 'github-sync-config-changed'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(type))
  }
}

function handleStoreError(error: unknown, operation: string, fallbackMessage?: string): string {
  return reportAppError(error, { scope: 'workspace.store', operation, fallbackMessage }).userMessage
}
