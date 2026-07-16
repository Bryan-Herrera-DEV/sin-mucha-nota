import { createEntityId, ensureNonEmptyText, nowIso, type EntityId, type ISODate } from '@/domain/shared/valueObjects'

export type FolderId = EntityId & { readonly __folderId: 'FolderId' }
export type FolderIcon = 'folder' | 'project' | 'book' | 'idea' | 'travel' | 'meeting' | 'recipe' | 'personal'

export const folderIconOptions = [
  { value: 'folder', label: 'Folder' },
  { value: 'project', label: 'Project' },
  { value: 'book', label: 'Book' },
  { value: 'idea', label: 'Idea' },
  { value: 'travel', label: 'Travel' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'recipe', label: 'Recipe' },
  { value: 'personal', label: 'Personal' },
] as const satisfies ReadonlyArray<{ value: FolderIcon; label: string }>

export type Folder = {
  id: FolderId
  name: string
  icon: FolderIcon
  parentId: FolderId | null
  createdAt: ISODate
  updatedAt: ISODate
}

export function createFolder(input: { name: string; parentId: FolderId | null; icon?: FolderIcon }): Folder {
  const timestamp = nowIso()

  return {
    id: createEntityId('folder') as FolderId,
    name: ensureNonEmptyText(input.name, 'La carpeta'),
    icon: input.icon ?? 'folder',
    parentId: input.parentId,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function renameFolder(folder: Folder, name: string): Folder {
  return {
    ...folder,
    name: ensureNonEmptyText(name, 'La carpeta'),
    updatedAt: nowIso(),
  }
}
