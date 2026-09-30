import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { NoteImageAsset } from '@/domain/notes/note'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import type { TranslationKey } from '@/app/i18n/translations'
import { useI18n } from '@/app/i18n/useI18n'
import { getClipboardImages, getClipboardImageUrl, isImageFile, isRenderableImageMime } from './clipboardImages'
import { assetUrl, createNoteAsset, formatBytes, imageMarkdown, readBlobAsDataUrl } from './imageAssets'
import { COMPRESS_OVER_BYTES, MAX_STORED_BYTES, prepareImage } from './imageCompression'
import { trackEditorTask } from './pendingEditorTasks'

export function MarkdownEditor() {
  const { t } = useI18n()
  const markdown = useWorkspaceStore((state) => state.markdownDraft)
  const updateMarkdown = useWorkspaceStore((state) => state.updateMarkdownDraft)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const lastInsertRef = useRef<{ markdown: string; caret: number } | null>(null)
  const [busyImages, setBusyImages] = useState(0)
  const [dragging, setDragging] = useState(false)

  // Selection is captured before the async work so a slow image never lands in the
  // wrong place, and never in a different note.
  const insertImages = async (files: File[], selection: { start: number; end: number } | null) => {
    const editor = editorRef.current

    if (!editor || !files.length) return

    const { activeNoteId, markdownDraft } = useWorkspaceStore.getState()
    const start = selection?.start ?? editor.selectionStart
    const end = selection?.end ?? editor.selectionEnd

    setBusyImages((count) => count + files.length)

    try {
      const assets: NoteImageAsset[] = []
      const snippets: string[] = []

      for (const file of files) {
        const asset = await createAssetFromFile(file, t)

        assets.push(asset)
        snippets.push(imageMarkdown(file.name, assetUrl(asset.id)))
      }

      const state = useWorkspaceStore.getState()

      if (state.activeNoteId !== activeNoteId || !editor.isConnected) return

      // A queued paste continues after the previous one; otherwise the caret decides.
      const chained = lastInsertRef.current?.markdown === state.markdownDraft ? lastInsertRef.current : null
      const unchanged = state.markdownDraft === markdownDraft
      const from = chained?.caret ?? (unchanged ? start : editor.selectionStart)
      const to = chained?.caret ?? (unchanged ? end : editor.selectionEnd)
      const insertion = `\n${snippets.join('\n')}\n`
      const nextMarkdown = state.markdownDraft.slice(0, from) + insertion + state.markdownDraft.slice(to)

      lastInsertRef.current = { markdown: nextMarkdown, caret: from + insertion.length }
      state.updateMarkdownDraft(nextMarkdown, assets)
      requestAnimationFrame(() => {
        if (editorRef.current !== editor) return
        editor.focus()
        editor.setSelectionRange(from + insertion.length, from + insertion.length)
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('imagePasteFailed'))
    } finally {
      setBusyImages((count) => Math.max(0, count - files.length))
    }
  }

  // Pastes are queued instead of dropped, so a second screenshot while the first one
  // is still being compressed is never lost.
  const enqueue = (files: File[], selection: { start: number; end: number } | null) => {
    queueRef.current = queueRef.current.then(() => insertImages(files, selection)).catch(() => undefined)
    trackEditorTask(queueRef.current)
  }

  const insertText = (snippet: string) => {
    const editor = editorRef.current

    if (!editor) return

    const state = useWorkspaceStore.getState()
    const from = editor.selectionStart
    const to = editor.selectionEnd
    const insertion = `\n${snippet}\n`

    state.updateMarkdownDraft(state.markdownDraft.slice(0, from) + insertion + state.markdownDraft.slice(to))
    requestAnimationFrame(() => {
      editor.focus()
      editor.setSelectionRange(from + insertion.length, from + insertion.length)
    })
  }

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const editor = event.currentTarget
    const images = getClipboardImages(event.clipboardData)

    if (images.length) {
      event.preventDefault()
      event.stopPropagation()
      enqueue(images, { start: editor.selectionStart, end: editor.selectionEnd })
      return
    }

    const remoteUrl = getClipboardImageUrl(event.clipboardData)

    if (remoteUrl) {
      event.preventDefault()
      event.stopPropagation()
      insertText(imageMarkdown('Imagen', remoteUrl))
    }
  }

  const handleDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    const images = getClipboardImages(event.dataTransfer)

    setDragging(false)

    if (!images.length) return

    event.preventDefault()
    event.stopPropagation()
    enqueue(images, null)
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-black text-[var(--app-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-white"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <ImagePlus size={14} />
          {t('insertImage')}
        </button>
        {busyImages > 0 ? (
          <span className="flex items-center gap-2 text-xs font-bold text-[var(--app-muted)]">
            <Loader2 className="animate-spin" size={14} />
            {t('imageProcessing')}
          </span>
        ) : null}
        <input
          accept="image/*"
          className="hidden"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []).filter(isImageFile)
            event.target.value = ''
            if (files.length) enqueue(files, null)
          }}
          ref={fileInputRef}
          type="file"
        />
      </div>
      <textarea
        ref={editorRef}
        className={`markdown-editor min-h-[22rem] flex-1 resize-none rounded-[1.1rem] border bg-[var(--app-panel-strong)] p-4 text-sm leading-7 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] ${dragging ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]' : 'border-white/12'}`}
        aria-label={t('markdown')}
        aria-busy={busyImages > 0}
        placeholder={t('editorPlaceholder')}
        value={markdown}
        onChange={(event) => updateMarkdown(event.target.value)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => {
          if (!Array.from(event.dataTransfer.types).includes('Files')) return
          event.preventDefault()
          setDragging(true)
        }}
        onDrop={handleDrop}
        onPaste={handlePaste}
      />
    </div>
  )
}

async function createAssetFromFile(file: File, t: (key: TranslationKey) => string): Promise<NoteImageAsset> {
  // Formats Markdown cannot show (HEIC, TIFF...) are re-encoded whatever their size.
  const renderable = isRenderableImageMime(file.type || 'image/png')
  const prepared = await prepareImage(file, renderable ? COMPRESS_OVER_BYTES : 0)

  if (prepared.blob.size > MAX_STORED_BYTES) {
    throw new Error(`${t('imageTooLarge')} (${formatBytes(prepared.blob.size)})`)
  }

  const dataUrl = await readBlobAsDataUrl(prepared.blob)
  const mimeType = prepared.blob.type || prepared.mimeType

  if (prepared.compressed) {
    toast.success(`${file.name}: ${formatBytes(file.size)} → ${formatBytes(prepared.blob.size)}`)
  }

  return createNoteAsset({ name: file.name, mimeType, byteSize: prepared.blob.size, dataUrl })
}
