import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownRendererProps = {
  markdown: string
}

const remarkPlugins = [remarkGfm]

export default function MarkdownRenderer({ markdown }: MarkdownRendererProps) {
  return <ReactMarkdown remarkPlugins={remarkPlugins}>{markdown || ' '}</ReactMarkdown>
}
