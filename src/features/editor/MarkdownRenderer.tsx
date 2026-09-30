import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isImageDataUrl } from './clipboardImages'

type MarkdownRendererProps = {
  markdown: string
}

const remarkPlugins = [remarkGfm]

export default function MarkdownRenderer({ markdown }: MarkdownRendererProps) {
  return <ReactMarkdown remarkPlugins={remarkPlugins} urlTransform={(url, key) =>
    key === 'src' && isImageDataUrl(url) ? url : defaultUrlTransform(url)
  }>{markdown || ' '}</ReactMarkdown>
}
