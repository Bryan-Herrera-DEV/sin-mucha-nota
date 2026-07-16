import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownPreviewProps = {
  markdown: string
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <div className="editor-prose h-full overflow-auto rounded-[1.35rem] border border-white/12 bg-[var(--app-panel-strong)] p-5 text-base text-[var(--app-text)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown || ' '}</ReactMarkdown>
    </div>
  )
}
