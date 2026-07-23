import type { WorkspaceStore } from '@/app/state/workspace.store'

let cachedNotes: WorkspaceStore['notes'] | null = null
let cachedActiveNoteId: WorkspaceStore['activeNoteId'] | undefined
let cachedActiveNote: WorkspaceStore['notes'][number] | null = null

export const selectActiveNote = (state: WorkspaceStore): WorkspaceStore['notes'][number] | null => {
  if (cachedNotes === state.notes && cachedActiveNoteId === state.activeNoteId) {
    return cachedActiveNote
  }

  cachedNotes = state.notes
  cachedActiveNoteId = state.activeNoteId
  cachedActiveNote = state.notes.find((note) => note.id === state.activeNoteId) ?? null

  return cachedActiveNote
}
export const selectHasOnboarding = (state: WorkspaceStore) => state.preferences !== null
