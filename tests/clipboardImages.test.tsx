import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { createNote } from '@/domain/notes/note'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { MarkdownEditor } from '@/features/editor/MarkdownEditor'
import MarkdownRenderer from '@/features/editor/MarkdownRenderer'
import { getClipboardImages, getClipboardImageUrl } from '@/features/editor/clipboardImages'
import { collectReferencedAssetIds, extractInlineImages, pruneUnreferencedAssets } from '@/features/editor/imageAssets'

const clipboard = (files: File[]) => ({ clipboardData: { files, items: [], types: [], getData: () => '' } })

beforeEach(() => {
  const note = createNote({ title: 'Paste', folderId: null })
  useWorkspaceStore.setState({ notes: [note], activeNoteId: note.id, loadedContentNoteId: note.id, markdownDraft: 'Before SELECT After', assetsDraft: {}, isDirty: false })
})

it('pastes images as short asset references instead of base64, and renders the stored bytes', async () => {
  render(<MarkdownEditor />)
  const editor = screen.getByRole('textbox') as HTMLTextAreaElement
  editor.setSelectionRange(7, 13)
  fireEvent.paste(editor, clipboard([new File(['image1'], 'one.png', { type: 'image/png' }), new File(['image2'], 'two.jpg', { type: 'image/jpeg' })]))
  await waitFor(() => expect(Object.keys(useWorkspaceStore.getState().assetsDraft)).toHaveLength(2))
  const { markdownDraft, assetsDraft } = useWorkspaceStore.getState()
  expect(markdownDraft).not.toContain('base64')
  expect(markdownDraft).toMatch(/^Before \n!\[one\]\(asset:[a-f\d]{32}\)\n!\[two\]\(asset:[a-f\d]{32}\)\n After$/)
  expect(useWorkspaceStore.getState().isDirty).toBe(true)
  const [first] = [...collectReferencedAssetIds(markdownDraft)]
  expect(assetsDraft[first].dataUrl).toBe('data:image/png;base64,aW1hZ2Ux')
  render(<MarkdownRenderer assets={assetsDraft} markdown={markdownDraft} />)
  // The DOM gets a short blob: URL served from the browser store, never the bytes.
  expect(screen.getByRole('img', { name: 'one' }).getAttribute('src')).toMatch(/^blob:/)
})

it('accepts images whose clipboard entry carries no MIME type', () => {
  const file = new File(['image'], 'captura.PNG', { type: '' })
  expect(getClipboardImages({ files: [file], items: [] } as unknown as DataTransfer)).toEqual([file])
})

it('supports browsers exposing image files only through clipboard items', () => {
  const file = new File(['image'], 'clipboard.png', { type: 'image/png' })
  expect(getClipboardImages({ files: [], items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }] } as unknown as DataTransfer)).toEqual([file])
})

it('pastes one image when the clipboard exposes it through both files and items', async () => {
  // Real browsers mint a distinct File on every getAsFile() call, with its own
  // lastModified, so the same screenshot cannot be recognised across both lists.
  const asFile = () => new File(['image'], 'captura.png', { type: 'image/png' })
  const both = { files: [asFile()], items: [{ kind: 'file', type: 'image/png', getAsFile: asFile }], types: ['Files'], getData: () => '' }
  expect(getClipboardImages(both as unknown as DataTransfer)).toHaveLength(1)

  render(<MarkdownEditor />)
  fireEvent.paste(screen.getByRole('textbox'), { clipboardData: both })
  const { waitForEditorTasks } = await import('@/features/editor/pendingEditorTasks')
  await waitForEditorTasks()
  expect(useWorkspaceStore.getState().markdownDraft.match(/!\[captura\]\(asset:/g)).toHaveLength(1)
  expect(Object.keys(useWorkspaceStore.getState().assetsDraft)).toHaveLength(1)
})

it('links a remote image when the clipboard only carries HTML', async () => {
  render(<MarkdownEditor />)
  const data = { files: [], items: [], types: ['text/html'], getData: (type: string) => (type === 'text/html' ? '<img src="https://ejemplo.com/a.png?x=1&amp;y=2">' : '') }
  fireEvent.paste(screen.getByRole('textbox'), { clipboardData: data })
  await waitFor(() => expect(useWorkspaceStore.getState().markdownDraft).toContain('https://ejemplo.com/a.png?x=1&y=2'))
  expect(getClipboardImageUrl(data as unknown as DataTransfer)).toBe('https://ejemplo.com/a.png?x=1&y=2')
})

it('inserts images dropped on the editor', async () => {
  render(<MarkdownEditor />)
  fireEvent.drop(screen.getByRole('textbox'), { dataTransfer: { files: [new File(['drop'], 'drop.png', { type: 'image/png' })], items: [], types: ['Files'] } })
  await waitFor(() => expect(useWorkspaceStore.getState().markdownDraft).toMatch(/!\[drop\]\(asset:/))
})

it('queues a second paste instead of dropping it while the first one is still being read', async () => {
  render(<MarkdownEditor />)
  const editor = screen.getByRole('textbox')
  fireEvent.paste(editor, clipboard([new File(['a'], 'a.png', { type: 'image/png' })]))
  fireEvent.paste(editor, clipboard([new File(['b'], 'b.png', { type: 'image/png' })]))
  const { waitForEditorTasks } = await import('@/features/editor/pendingEditorTasks')
  await waitForEditorTasks()
  expect(useWorkspaceStore.getState().markdownDraft).toMatch(/!\[a\]\(asset:[a-f\d]{32}\)[\s\S]*!\[b\]\(asset:[a-f\d]{32}\)/)
  expect(Object.keys(useWorkspaceStore.getState().assetsDraft)).toHaveLength(2)
})

it('does not intercept plain text paste or allow executable data links', () => {
  render(<MarkdownEditor />)
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: { files: [], items: [], types: ['text/plain'], getData: () => 'normal text' } })
  fireEvent(screen.getByRole('textbox'), event)
  expect(event.defaultPrevented).toBe(false)
  render(<MarkdownRenderer markdown={'[unsafe](data:text/html;base64,PHNjcmlwdD4=) ![bad](javascript:alert)'} />)
  expect(screen.getByText('unsafe').getAttribute('href')).toBe('')
  expect(screen.getByRole('img', { name: 'bad' }).getAttribute('src')).toBeNull()
})

it('still renders notes written before images moved out of the Markdown', () => {
  render(<MarkdownRenderer markdown={'![old](data:image/png;base64,aW1hZ2Ux)'} />)
  expect(screen.getByRole('img', { name: 'old' }).getAttribute('src')).toBe('data:image/png;base64,aW1hZ2Ux')
})

it('lifts inline base64 images out of an old note without changing what it shows', () => {
  const extracted = extractInlineImages('# Nota\n![foto](data:image/jpeg;base64,aW1hZ2Ux)\nfin', {})!
  expect(extracted.markdown).toMatch(/^# Nota\n!\[foto\]\(asset:[a-f\d]{32}\)\nfin$/)
  const [asset] = Object.values(extracted.assets)
  expect(asset).toMatchObject({ name: 'foto', mimeType: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,aW1hZ2Ux' })
  render(<MarkdownRenderer assets={extracted.assets} markdown={extracted.markdown} />)
  expect(screen.getByRole('img', { name: 'foto' }).getAttribute('src')).toMatch(/^blob:/)
  expect(extractInlineImages(extracted.markdown, extracted.assets)).toBeNull()
})

it('drops assets no longer referenced by the text', () => {
  const assets = { aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: { id: 'a'.repeat(32), name: 'a', mimeType: 'image/png', byteSize: 1, createdAt: '2026-01-01T00:00:00.000Z' as never, dataUrl: 'data:image/png;base64,aa' } }
  expect(pruneUnreferencedAssets('sin imagenes', assets)).toEqual({})
  expect(pruneUnreferencedAssets(`![x](asset:${'a'.repeat(32)})`, assets)).toEqual(assets)
})

it('does not insert into a different note while the clipboard image is being read', async () => {
  const { unmount } = render(<MarkdownEditor />)
  fireEvent.paste(screen.getByRole('textbox'), clipboard([new File(['test'], 'one.png', { type: 'image/png' })]))
  const note = createNote({ title: 'Other', folderId: null })
  act(() => useWorkspaceStore.setState({ activeNoteId: note.id, loadedContentNoteId: note.id, markdownDraft: 'Other content' }))
  unmount()
  const { waitForEditorTasks } = await import('@/features/editor/pendingEditorTasks')
  await waitForEditorTasks()
  expect(useWorkspaceStore.getState().markdownDraft).toBe('Other content')
})
