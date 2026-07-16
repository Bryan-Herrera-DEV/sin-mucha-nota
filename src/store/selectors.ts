import type { WorkspaceStore } from '@/store/workspace.store'

export const selectActiveNote = (state: WorkspaceStore) => state.notes.find((note) => note.id === state.activeNoteId) ?? null
export const selectHasOnboarding = (state: WorkspaceStore) => state.preferences !== null
