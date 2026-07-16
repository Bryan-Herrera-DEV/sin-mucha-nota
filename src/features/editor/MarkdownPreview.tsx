import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownPreviewProps = {
  markdown: string
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <div className="editor-prose h-full overflow-auto rounded-[1.35rem] border border-white/12 bg-[#0d1d17] p-5 font-serif text-base text-[#e8efe5]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown || ' '}</ReactMarkdown>
    </div>
  )
}
