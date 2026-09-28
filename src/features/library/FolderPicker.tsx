import { useMemo } from 'react'
import { Folder, CornerDownRight } from 'lucide-react'
import { useWorkspaceStore } from '@/app/state/workspace.store'
import { useI18n } from '@/app/i18n/useI18n'
import type { Folder as FolderEntity, FolderId } from '@/domain/folders/folder'
import { Cascader, type CascaderOption } from '@/shared/ui/shadcn/cascader'

export function getFolderPath(folders: FolderEntity[], folderId: FolderId | null): FolderEntity[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const path: FolderEntity[] = []
  const visited = new Set<FolderId>()
  let current = folderId
  while (current && !visited.has(current)) {
    visited.add(current)
    const folder = byId.get(current)
    if (!folder) break
    path.unshift(folder)
    current = folder.parentId
  }
  return path
}

export function FolderPicker({ value, onChange, topLevel = false, className, disabled }: {
  value: FolderId | null
  onChange(folderId: FolderId | null): void
  topLevel?: boolean
  className?: string
  disabled?: boolean
}) {
  const folders = useWorkspaceStore((state) => state.folders)
  const { t } = useI18n()
  const rootLabel = t(topLevel ? 'topLevel' : 'rootFolder')
  const { options, selected } = useMemo(() => {
    const childrenByParent = new Map<FolderId | null, FolderEntity[]>()
    for (const folder of folders) {
      const children = childrenByParent.get(folder.parentId) ?? []
      children.push(folder)
      childrenByParent.set(folder.parentId, children)
    }
    function branch(parentId: FolderId | null): CascaderOption[] {
      return (childrenByParent.get(parentId) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)).map((folder) => {
        const children = branch(folder.id)
        return {
          value: folder.id, textLabel: folder.name,
          label: <span className="flex min-w-0 items-center gap-2"><Folder className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{folder.name}</span></span>,
          children: children.length ? [{ value: `self:${folder.id}`, textLabel: folder.name, label: <span className="flex items-center gap-2"><CornerDownRight className="size-4 shrink-0" />{t('useFolder')}</span> }, ...children] : undefined,
        }
      })
    }
    const selected = getFolderPath(folders, value).map((folder) => String(folder.id))
    if (value && childrenByParent.get(value)?.length) selected.push(`self:${value}`)
    return { options: [{ value: 'root', label: rootLabel }, ...branch(null)], selected: value ? selected : ['root'] }
  }, [folders, value, rootLabel, t])

  return <Cascader options={options} value={selected} placeholder={t('location')} className={className} disabled={disabled}
    displayRender={(labels, selectedOptions) => labels.filter((_, index) => !selectedOptions[index].value.startsWith('self:')).join(' / ')}
    onChange={(path) => {
      const destination = path.at(-1)
      onChange(!destination || destination === 'root' ? null : destination.replace(/^self:/, '') as FolderId)
    }} />
}
