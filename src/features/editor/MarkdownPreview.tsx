import { lazy, Suspense } from 'react'
import type { NoteAssets } from '@/domain/notes/note'

const MarkdownRenderer = lazy(() => import('@/features/editor/MarkdownRenderer'))

type MarkdownPreviewProps = {
  markdown: string
  assets: NoteAssets
}

export function MarkdownPreview({ markdown, assets }: MarkdownPreviewProps) {
  return (
    <div className="editor-prose h-full overflow-auto rounded-[1.35rem] border border-white/12 bg-[var(--app-panel-strong)] p-5 text-base text-[var(--app-text)]">
      <Suspense fallback={<div className="min-h-24 rounded-xl bg-white/5" aria-label="Cargando vista previa" />}>
        <MarkdownRenderer assets={assets} markdown={markdown} />
      </Suspense>
    </div>
  )
}
