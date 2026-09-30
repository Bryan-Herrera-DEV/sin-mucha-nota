import type { FolderId } from '@/domain/folders/folder'
import { createEntityId, ensureNonEmptyText, nowIso, type EntityId, type ISODate } from '@/domain/shared/valueObjects'

export type NoteId = EntityId & { readonly __noteId: 'NoteId' }

export type DrawingDocument = {
  elements: readonly unknown[]
  appState: Record<string, unknown>
  files: Record<string, unknown>
}

export type NoteContentRef = {
  markdownPath: string
  drawingPath: string
  // Optional so notes created before image assets existed keep loading.
  assetsPath?: string
}

// Pasted images live next to the note instead of inside it, so the Markdown stays readable.
export type NoteImageAsset = {
  id: string
  name: string
  mimeType: string
  byteSize: number
  createdAt: ISODate
  dataUrl: string
}

export type NoteAssets = Record<string, NoteImageAsset>

export type Note = {
  id: NoteId
  title: string
  folderId: FolderId | null
  contentRef: NoteContentRef
  createdAt: ISODate
  updatedAt: ISODate
}

export type NoteContent = {
  markdown: string
  drawing: DrawingDocument
  assets: NoteAssets
}

export function createEmptyDrawing(): DrawingDocument {
  return {
    elements: [],
    appState: {
      viewBackgroundColor: '#fff8ec',
    },
    files: {},
  }
}

export function createNote(input: { title: string; folderId: FolderId | null }): Note {
  const timestamp = nowIso()
  const id = createEntityId('note') as NoteId

  return {
    id,
    title: ensureNonEmptyText(input.title, 'La nota'),
    folderId: input.folderId,
    contentRef: createContentRef(id),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function renameNote(note: Note, title: string): Note {
  return {
    ...note,
    title: ensureNonEmptyText(title, 'La nota'),
    updatedAt: nowIso(),
  }
}

export function moveNote(note: Note, folderId: FolderId | null): Note {
  return {
    ...note,
    folderId,
    updatedAt: nowIso(),
  }
}

export function markNoteContentSaved(note: Note): Note {
  return {
    ...note,
    updatedAt: nowIso(),
  }
}

function createContentRef(noteId: NoteId): NoteContentRef {
  return {
    markdownPath: `notes/${noteId}/markdown.md`,
    drawingPath: `notes/${noteId}/drawing.excalidraw.json`,
    assetsPath: `notes/${noteId}/assets.json`,
  }
}

export function resolveNoteAssetsPath(note: Note): string {
  return note.contentRef.assetsPath ?? `${note.contentRef.markdownPath.replace(/\.md$/i, '')}.assets.json`
}
