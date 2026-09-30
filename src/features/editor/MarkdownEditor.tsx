import { useRef, useState, type ClipboardEvent } from 'react'
import { toast } from 'sonner'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { useI18n } from '@/app/i18n/useI18n'
import { getClipboardImages, imageMarkdown, readImageDataUrl } from './clipboardImages'
import { trackEditorTask } from './pendingEditorTasks'

export function MarkdownEditor() {
  const { t } = useI18n()
  const markdown = useWorkspaceStore((state) => state.markdownDraft)
  const updateMarkdown = useWorkspaceStore((state) => state.updateMarkdownDraft)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const pastingRef = useRef(false)
  const [pasting, setPasting] = useState(false)

  const pasteImages = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const images = getClipboardImages(event.clipboardData)
    if (!images.length) return
    event.preventDefault()
    event.stopPropagation()
    if (pastingRef.current) return
    pastingRef.current = true
    setPasting(true)
    const editor = event.currentTarget
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const { activeNoteId, markdownDraft } = useWorkspaceStore.getState()
    try {
      const snippets = await Promise.all(images.map(async (file) => imageMarkdown(file.name, await readImageDataUrl(file))))
      const state = useWorkspaceStore.getState()
      if (state.activeNoteId !== activeNoteId || !editor.isConnected) return
      const unchanged = state.markdownDraft === markdownDraft
      const from = unchanged ? start : editor.selectionStart
      const to = unchanged ? end : editor.selectionEnd
      const insertion = `\n${snippets.join('\n')}\n`
      state.updateMarkdownDraft(state.markdownDraft.slice(0, from) + insertion + state.markdownDraft.slice(to))
      requestAnimationFrame(() => {
        if (editorRef.current !== editor) return
        editor.focus()
        editor.setSelectionRange(from + insertion.length, from + insertion.length)
      })
    } catch {
      toast.error(t('imagePasteFailed'))
    } finally {
      pastingRef.current = false
      setPasting(false)
    }
  }

  return <textarea
    ref={editorRef}
    className="markdown-editor min-h-[22rem] resize-none rounded-[1.1rem] border border-white/12 bg-[var(--app-panel-strong)] p-4 text-sm leading-7 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
    aria-label={t('markdown')}
    aria-busy={pasting}
    readOnly={pasting}
    placeholder={t('editorPlaceholder')}
    value={markdown}
    onChange={(event) => updateMarkdown(event.target.value)}
    onPaste={(event) => trackEditorTask(pasteImages(event))}
  />
}
