import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { DrawingDocument, NoteId } from '@/domain/notes/note'

const mocks = vi.hoisted(() => ({ props: null as any, api: null as any }))
vi.mock('@excalidraw/excalidraw', () => ({
  CaptureUpdateAction: { IMMEDIATELY: 'IMMEDIATELY' },
  convertToExcalidrawElements: (elements: any[]) => elements.map((element, index) => ({ ...element, id: `new-${index}` })),
  Excalidraw: (props: any) => {
    mocks.props = props
    props.excalidrawAPI(mocks.api)
    return <div><input type="radio" aria-label="Selection" /><textarea aria-label="Shape text" /><div tabIndex={0} data-testid="canvas" /></div>
  },
}))

import ExcalidrawCanvas from '@/features/editor/ExcalidrawCanvas'
import { ExcalidrawPanel } from '@/features/editor/ExcalidrawPanel'

beforeEach(() => {
  mocks.api = {
    getAppState: () => ({ width: 1000, height: 600, zoom: { value: 2 }, scrollX: 10, scrollY: 20 }),
    getSceneElementsIncludingDeleted: () => [{ id: 'old', type: 'rectangle' }],
    addFiles: vi.fn(), updateScene: vi.fn(),
  }
  vi.stubGlobal('Image', class {
    naturalWidth = 160
    naturalHeight = 100
    onload = () => {}
    set src(_value: string) { queueMicrotask(() => this.onload()) }
  })
})
afterEach(() => vi.unstubAllGlobals())

it('pastes an image while a toolbar radio has focus, registers its binary file and supports undo', async () => {
  render(<ExcalidrawCanvas />)
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: { files: [new File(['image'], 'screen.png', { type: 'image/png' })], items: [] } })
  fireEvent(screen.getByRole('radio'), event)
  expect(event.defaultPrevented).toBe(true)
  await waitFor(() => expect(mocks.api.updateScene).toHaveBeenCalledOnce())
  const file = mocks.api.addFiles.mock.calls[0][0][0]
  expect(file.dataURL).toBe('data:image/png;base64,aW1hZ2U=')
  expect(mocks.api.updateScene.mock.calls[0][0]).toMatchObject({ captureUpdate: 'IMMEDIATELY', elements: [
    { id: 'old' }, { type: 'image', fileId: file.id, status: 'saved', x: 160, y: 80, width: 160, height: 100 },
  ] })
})

it('leaves text editing and normal text/scene clipboard handling to Excalidraw', () => {
  render(<ExcalidrawCanvas />)
  fireEvent.paste(screen.getByRole('textbox'), { clipboardData: { files: [new File(['image'], 'screen.png', { type: 'image/png' })], items: [] } })
  fireEvent.paste(screen.getByTestId('canvas'), { clipboardData: { files: [], items: [] } })
  expect(mocks.api.addFiles).not.toHaveBeenCalled()
})

it('publishes rapid image and file updates before unmounting, without a delayed save window', async () => {
  const onChange = vi.fn()
  const drawing: DrawingDocument = { elements: [], appState: {}, files: {} }
  const { unmount } = render(<ExcalidrawPanel drawing={drawing} noteId={'note-test' as NoteId} onChange={onChange} />)
  await screen.findByTestId('canvas')
  act(() => mocks.props.onChange([{ id: 'first', type: 'rectangle' }], {}, {}))
  const files = { file: { id: 'file', dataURL: 'data:image/png;base64,aW1hZ2U=' } }
  act(() => mocks.props.onChange([{ id: 'second', type: 'image', fileId: 'file' }], {}, files))
  unmount()
  expect(onChange.mock.calls.at(-1)?.[1].files).toEqual(files)
  expect(onChange.mock.calls.at(-1)?.[1].elements[0].id).toBe('second')
})
