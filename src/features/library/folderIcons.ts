import type { ComponentType } from 'react'
import { BookOpen, Briefcase, CalendarDays, Folder, Lightbulb, Plane, UserRound, Utensils } from 'lucide-react'
import type { FolderIcon } from '@/domain/folders/folder'

export const folderIconMap: Record<FolderIcon, ComponentType<{ size?: number; className?: string }>> = {
  folder: Folder, project: Briefcase, book: BookOpen, idea: Lightbulb,
  travel: Plane, meeting: CalendarDays, recipe: Utensils, personal: UserRound,
}
