import { useMemo } from 'react'
import { ArrowRight, Clock3, FilePlus2, FileText, FolderPlus, Folder } from 'lucide-react'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { useI18n } from '@/app/i18n/useI18n'
import { useLibraryUi } from '@/features/library/libraryUi.store'
import { getFolderPath } from '@/features/library/FolderPicker'
import { NoteMenu } from '@/features/library/EntityMenus'
import { Button } from '@/shared/ui/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/shadcn/card'
import { StarGame } from './StarGame'

export function Dashboard() {
  const { t } = useI18n()
  const notes = useWorkspaceStore((state) => state.notes)
  const folders = useWorkspaceStore((state) => state.folders)
  const name = useWorkspaceStore((state) => state.preferences?.displayName ?? '')
  const locale = useWorkspaceStore((state) => state.preferences?.locale ?? 'es')
  const open = useLibraryUi((state) => state.open)
  const recent = useMemo(() => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8), [notes])

  return (
    <main className="app-workspace min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8">
        <p className="text-xs font-medium capitalize text-muted-foreground">{new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</p>
        <h1 className="mt-3 break-words text-2xl font-bold tracking-tight sm:text-3xl">{t('dashboardGreeting')} {name}.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('dashboardBody')}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={() => open({ type: 'create-note', folderId: null })}><FilePlus2 />{t('newNote')}</Button>
          <Button type="button" variant="outline" onClick={() => open({ type: 'create-folder', folderId: null })}><FolderPlus />{t('newFolder')}</Button>
          <div className="flex items-center gap-4 px-2 text-xs text-muted-foreground"><span>{notes.length} {t('notes').toLowerCase()}</span><span>{folders.length} {t('folders').toLowerCase()}</span></div>
        </div>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <Card className="min-w-0 gap-3 border-border shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="min-w-0 space-y-2"><CardTitle role="heading" aria-level={2} className="flex items-center gap-2 text-base"><Clock3 className="size-4 text-primary" />{t('recentNotes')}</CardTitle><CardDescription>{t('recentNotesBody')}</CardDescription></div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t('allNotes')} title={t('allNotes')} onClick={() => { const store = useWorkspaceStore.getState(); store.setSearch(''); store.selectFolder(null) }}><ArrowRight /></Button>
          </CardHeader>
          <CardContent>
            {recent.length ? <div className="divide-y divide-border">{recent.map((note) => {
              const path = getFolderPath(folders, note.folderId).map((folder) => folder.name).join(' / ') || t('rootFolder')
              return <NoteMenu key={note.id} note={note}><div className="flex min-w-0 items-center gap-2 rounded-md py-2 hover:bg-secondary/50">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-3 text-left" onClick={() => {
                  const store = useWorkspaceStore.getState()
                  store.setSearch(''); store.selectFolder(note.folderId); void store.selectNote(note.id)
                }}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary"><FileText className="size-4 text-primary" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium" title={note.title}>{note.title}</span>
                    <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><Folder className="size-3 shrink-0" /><span className="truncate" title={path}>{path}</span></span>
                    <time className="mt-1 block text-xs text-muted-foreground sm:hidden" dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString(locale)}</time>
                  </span>
                  <time className="hidden shrink-0 text-xs text-muted-foreground sm:block" dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</time>
                </button>
                <NoteMenu note={note} />
              </div></NoteMenu>
            })}</div> : <div className="py-12 text-center"><FileText className="mx-auto size-8 text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">{t('noRecentNotes')}</p><Button className="mt-4" type="button" onClick={() => open({ type: 'create-note', folderId: null })}><FilePlus2 />{t('newNote')}</Button></div>}
          </CardContent>
        </Card>
        <StarGame />
      </div>
    </main>
  )
}
