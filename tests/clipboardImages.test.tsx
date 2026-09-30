import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { createNote } from '@/domain/notes/note'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { MarkdownEditor } from '@/features/editor/MarkdownEditor'
import MarkdownRenderer from '@/features/editor/MarkdownRenderer'
import { getClipboardImages } from '@/features/editor/clipboardImages'

beforeEach(() => {
  const note = createNote({ title: 'Paste', folderId: null })
  useWorkspaceStore.setState({ notes: [note], activeNoteId: note.id, loadedContentNoteId: note.id, markdownDraft: 'Before SELECT After', isDirty: false })
})

it('pastes multiple image files at the selection, keeps text, and renders the stored image', async () => {
  render(<MarkdownEditor />)
  const editor = screen.getByRole('textbox') as HTMLTextAreaElement
  editor.setSelectionRange(7, 13)
  fireEvent.paste(editor, { clipboardData: { files: [new File(['image1'], 'one.png', { type: 'image/png' }), new File(['image2'], 'two.jpg', { type: 'image/jpeg' })], items: [] } })
  await waitFor(() => expect(useWorkspaceStore.getState().markdownDraft).toContain('![two](data:image/jpeg;base64,'))
  expect(useWorkspaceStore.getState().markdownDraft).toMatch(/^Before \n!\[one\]/)
  expect(useWorkspaceStore.getState().markdownDraft).toMatch(/\n After$/)
  expect(useWorkspaceStore.getState().isDirty).toBe(true)
  render(<MarkdownRenderer markdown={useWorkspaceStore.getState().markdownDraft} />)
  expect(screen.getByRole('img', { name: 'one' }).getAttribute('src')).toBe('data:image/png;base64,aW1hZ2Ux')
})

it('does not intercept plain text paste or allow executable data links', () => {
  render(<MarkdownEditor />)
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: { files: [], items: [], getData: () => 'normal text' } })
  fireEvent(screen.getByRole('textbox'), event)
  expect(event.defaultPrevented).toBe(false)
  render(<MarkdownRenderer markdown={'[unsafe](data:text/html;base64,PHNjcmlwdD4=) ![bad](javascript:alert)'} />)
  expect(screen.getByText('unsafe').getAttribute('href')).toBe('')
  expect(screen.getByRole('img', { name: 'bad' }).getAttribute('src')).toBeNull()
})

it('does not insert into a different note while the clipboard image is being read', async () => {
  const { unmount } = render(<MarkdownEditor />)
  fireEvent.paste(screen.getByRole('textbox'), { clipboardData: { files: [new File(['test'], 'one.png', { type: 'image/png' })], items: [] } })
  const note = createNote({ title: 'Other', folderId: null })
  act(() => useWorkspaceStore.setState({ activeNoteId: note.id, loadedContentNoteId: note.id, markdownDraft: 'Other content' }))
  unmount()
  const { waitForEditorTasks } = await import('@/features/editor/pendingEditorTasks')
  await waitForEditorTasks()
  expect(useWorkspaceStore.getState().markdownDraft).toBe('Other content')
})

it('supports browsers exposing image files only through clipboard items', () => {
  const file = new File(['image'], 'clipboard.png', { type: 'image/png' })
  expect(getClipboardImages({ files: [], items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }] } as unknown as DataTransfer)).toEqual([file])
})
