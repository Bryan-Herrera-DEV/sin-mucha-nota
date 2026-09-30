import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { resolveNoteAssetsPath, type Note, type NoteId } from '@/domain/notes/note'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { workspaceService } from '@/application/workspace/workspaceService'
import { getLocalDatabase, saveStoredFile } from '@/infrastructure/db/localDatabase'
import { removeAssetReferences } from '@/features/editor/imageAssets'
import { ImageLibrary } from '@/features/settings/ImageLibrary'

const dataUrl = 'data:image/png;base64,iVBORw0KGgo='
const asset = (id: string, name: string) => ({ id, name, mimeType: 'image/png', byteSize: 11, createdAt: '2026-01-01T00:00:00.000Z' as never, dataUrl })
const usedId = 'a'.repeat(32)
const orphanId = 'b'.repeat(32)

async function seedNote(title: string, markdown: string, assets: Record<string, ReturnType<typeof asset>>): Promise<Note> {
  const note = await workspaceService.createNote(title, null)

  await workspaceService.saveNoteContent(note, { markdown, drawing: { elements: [], appState: {}, files: {} }, assets })
  // Saving prunes unreferenced assets, so an orphan is written straight to the file,
  // the way a GitHub pull can leave one behind.
  await saveStoredFile({ path: resolveNoteAssetsPath(note), content: JSON.stringify(assets), kind: 'json' })

  return note
}

beforeEach(async () => {
  const database = await getLocalDatabase()
  await Promise.all(Array.from(database.objectStoreNames).map((store) => database.clear(store)))
  useWorkspaceStore.setState({ notes: [], activeNoteId: null, loadedContentNoteId: null, markdownDraft: '', assetsDraft: {}, isDirty: false, contentStatus: 'idle' })
})

it('removes the image markdown along with the stored bytes', () => {
  const markdown = `# Nota\n\n![foto](asset:${usedId})\n\ntexto`
  expect(removeAssetReferences(markdown, usedId)).toBe('# Nota\n\ntexto')
  expect(removeAssetReferences(markdown, orphanId)).toBe(markdown)
})

it('lists every stored image and flags the ones the note no longer shows', async () => {
  const note = await seedNote('Con imagenes', `![usada](asset:${usedId})`, { [usedId]: asset(usedId, 'usada.png'), [orphanId]: asset(orphanId, 'huerfana.png') })
  useWorkspaceStore.setState({ notes: [note] })

  render(<ImageLibrary />)

  await waitFor(() => expect(screen.getByText('usada.png')).toBeTruthy())
  expect(screen.getByText('huerfana.png')).toBeTruthy()
  // Previews are served from the blob store, not from a data URL in the DOM.
  expect(screen.getAllByRole('img').every((image) => image.getAttribute('src')?.startsWith('blob:'))).toBe(true)
  expect(screen.getAllByText('Ya no aparece en la nota')).toHaveLength(1)
})

it('deletes an image from a note that is not open, and cleans its reference', async () => {
  const note = await seedNote('Cerrada', `antes\n\n![usada](asset:${usedId})\n\ndespues`, { [usedId]: asset(usedId, 'usada.png') })
  useWorkspaceStore.setState({ notes: [note] })

  await useWorkspaceStore.getState().deleteImageAsset(note.id, usedId)

  const content = await workspaceService.loadNoteContent(note)
  expect(content.assets).toEqual({})
  expect(content.markdown).toBe('antes\n\ndespues')
})

it('deletes an image from the note currently open, keeping the draft in sync', async () => {
  const note = await seedNote('Abierta', `![usada](asset:${usedId})`, { [usedId]: asset(usedId, 'usada.png') })
  useWorkspaceStore.setState({
    notes: [note], activeNoteId: note.id, loadedContentNoteId: note.id,
    markdownDraft: `texto\n\n![usada](asset:${usedId})`, assetsDraft: { [usedId]: asset(usedId, 'usada.png') }, isDirty: false,
  })

  await useWorkspaceStore.getState().deleteImageAsset(note.id, usedId)

  const state = useWorkspaceStore.getState()
  expect(state.assetsDraft).toEqual({})
  expect(state.markdownDraft).toBe('texto')
  expect(state.isDirty).toBe(false)
  expect((await workspaceService.loadNoteContent(note)).markdown).toBe('texto')
})

it('ignores a delete for an unknown note or image', async () => {
  const note = await seedNote('Intacta', `![usada](asset:${usedId})`, { [usedId]: asset(usedId, 'usada.png') })
  useWorkspaceStore.setState({ notes: [note] })

  await useWorkspaceStore.getState().deleteImageAsset('note_missing' as NoteId, usedId)
  await useWorkspaceStore.getState().deleteImageAsset(note.id, orphanId)

  expect((await workspaceService.loadNoteContent(note)).assets[usedId]).toBeTruthy()
  expect(useWorkspaceStore.getState().errorMessage).toBeNull()
})
