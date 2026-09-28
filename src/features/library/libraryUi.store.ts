import { create } from 'zustand'
import type { Folder, FolderId } from '@/domain/folders/folder'
import type { Note } from '@/domain/notes/note'

export type LibraryAction =
  | { type: 'create-note' | 'create-folder'; folderId: FolderId | null }
  | { type: 'rename-folder' | 'delete-folder'; folder: Folder }
  | { type: 'move-note' | 'delete-note'; note: Note }

export const useLibraryUi = create<{
  action: LibraryAction | null
  open(action: LibraryAction): void
  close(): void
}>((set) => ({ action: null, open: (action) => set({ action }), close: () => set({ action: null }) }))
