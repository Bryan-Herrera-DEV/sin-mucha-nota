import { lazy, Suspense } from 'react'

const MarkdownRenderer = lazy(() => import('@/features/editor/MarkdownRenderer'))

type MarkdownPreviewProps = {
  markdown: string
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <div className="editor-prose h-full overflow-auto rounded-[1.35rem] border border-white/12 bg-[var(--app-panel-strong)] p-5 text-base text-[var(--app-text)]">
      <Suspense fallback={<div className="min-h-24 rounded-xl bg-white/5" aria-label="Cargando vista previa" />}>
        <MarkdownRenderer markdown={markdown} />
      </Suspense>
    </div>
  )
}
