import type { Folder, FolderId } from '@/domain/folders/folder'
import type { Note } from '@/domain/notes/note'

export type FolderTreeIndex = {
  rootFolders: Folder[]
  childrenByParent: ReadonlyMap<FolderId | null, Folder[]>
  noteCountByFolderId: ReadonlyMap<FolderId, number>
}

export function getVisibleNotes(notes: Note[], folders: Folder[], activeFolderId: FolderId | null, search: string): Note[] {
  const visibleFolderIds = activeFolderId ? new Set(collectFolderBranchIds(activeFolderId, folders)) : null
  const normalizedSearch = search.trim().toLowerCase()

  return notes.filter((note) => {
    const matchesFolder = visibleFolderIds === null || (note.folderId !== null && visibleFolderIds.has(note.folderId))
    const matchesSearch = !normalizedSearch || note.title.toLowerCase().includes(normalizedSearch)

    return matchesFolder && matchesSearch
  })
}

export function collectFolderBranchIds(folderId: FolderId, folders: Folder[]): FolderId[] {
  const childrenByParent = createChildrenByParentMap(folders)
  const folderIds: FolderId[] = []
  const visited = new Set<FolderId>()
  const stack: FolderId[] = [folderId]

  while (stack.length > 0) {
    const currentFolderId = stack.pop()

    if (!currentFolderId || visited.has(currentFolderId)) {
      continue
    }

    visited.add(currentFolderId)
    folderIds.push(currentFolderId)

    const children = childrenByParent.get(currentFolderId) ?? []

    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push(children[index].id)
    }
  }

  return folderIds
}

export function createFolderTreeIndex(folders: Folder[], notes: Note[]): FolderTreeIndex {
  const childrenByParent = createChildrenByParentMap(folders)
  const directNoteCountByFolderId = new Map<FolderId, number>()
  const noteCountByFolderId = new Map<FolderId, number>()
  const folderVisitState = new Map<FolderId, 'processing' | 'done'>()

  for (const note of notes) {
    if (note.folderId !== null) {
      directNoteCountByFolderId.set(note.folderId, (directNoteCountByFolderId.get(note.folderId) ?? 0) + 1)
    }
  }

  for (const folder of folders) {
    if (folderVisitState.get(folder.id) === 'done') {
      continue
    }

    const stack: Array<{ folder: Folder; expanded: boolean }> = [{ folder, expanded: false }]

    while (stack.length > 0) {
      const current = stack.pop()

      if (!current) {
        continue
      }

      if (current.expanded) {
        const children = childrenByParent.get(current.folder.id) ?? []
        const childCount = children.reduce((total, child) => total + (noteCountByFolderId.get(child.id) ?? 0), 0)

        noteCountByFolderId.set(current.folder.id, (directNoteCountByFolderId.get(current.folder.id) ?? 0) + childCount)
        folderVisitState.set(current.folder.id, 'done')
        continue
      }

      const state = folderVisitState.get(current.folder.id)

      if (state === 'done' || state === 'processing') {
        continue
      }

      folderVisitState.set(current.folder.id, 'processing')
      stack.push({ folder: current.folder, expanded: true })

      const children = childrenByParent.get(current.folder.id) ?? []

      for (let index = children.length - 1; index >= 0; index -= 1) {
        stack.push({ folder: children[index], expanded: false })
      }
    }
  }

  return {
    rootFolders: childrenByParent.get(null) ?? [],
    childrenByParent,
    noteCountByFolderId,
  }
}

function createChildrenByParentMap(folders: Folder[]): Map<FolderId | null, Folder[]> {
  const childrenByParent = new Map<FolderId | null, Folder[]>()

  for (const folder of folders) {
    const children = childrenByParent.get(folder.parentId) ?? []

    children.push(folder)
    childrenByParent.set(folder.parentId, children)
  }

  return childrenByParent
}
