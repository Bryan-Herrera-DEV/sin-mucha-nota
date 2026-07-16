import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownPreviewProps = {
  markdown: string
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <div className="editor-prose h-full overflow-auto rounded-[1.5rem] border border-line bg-paper p-5 font-serif text-base shadow-inner">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown || ' '}</ReactMarkdown>
    </div>
  )
}
