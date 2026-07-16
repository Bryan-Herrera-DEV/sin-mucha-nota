import { createEntityId, ensureNonEmptyText, nowIso, type EntityId, type ISODate } from '@/domain/shared/valueObjects'

export type FolderId = EntityId & { readonly __folderId: 'FolderId' }

export type Folder = {
  id: FolderId
  name: string
  parentId: FolderId | null
  createdAt: ISODate
  updatedAt: ISODate
}

export function createFolder(input: { name: string; parentId: FolderId | null }): Folder {
  const timestamp = nowIso()

  return {
    id: createEntityId('folder') as FolderId,
    name: ensureNonEmptyText(input.name, 'La carpeta'),
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
