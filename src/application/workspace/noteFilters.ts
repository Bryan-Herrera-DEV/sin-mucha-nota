import type { Folder, FolderId } from '@/domain/folders/folder'
import type { Note } from '@/domain/notes/note'

export function getVisibleNotes(notes: Note[], folders: Folder[], activeFolderId: FolderId | null, search: string): Note[] {
  const visibleFolderIds = activeFolderId ? [activeFolderId, ...collectDescendantFolderIds(activeFolderId, folders)] : null
  const normalizedSearch = search.trim().toLowerCase()

  return notes.filter((note) => {
    const matchesFolder = visibleFolderIds === null || (note.folderId !== null && visibleFolderIds.includes(note.folderId))
    const matchesSearch = !normalizedSearch || note.title.toLowerCase().includes(normalizedSearch)

    return matchesFolder && matchesSearch
  })
}

function collectDescendantFolderIds(folderId: FolderId, folders: Folder[]): FolderId[] {
  const childFolders = folders.filter((folder) => folder.parentId === folderId)

  return childFolders.flatMap((folder) => [folder.id, ...collectDescendantFolderIds(folder.id, folders)])
}
