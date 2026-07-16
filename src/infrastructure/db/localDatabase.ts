import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Folder } from '@/domain/folders/folder'
import type { Note } from '@/domain/notes/note'
import type { ThemeId, UserPreferences } from '@/domain/preferences/preferences'
import { nowIso, type ISODate } from '@/domain/shared/valueObjects'

const DATABASE_NAME = 'notas-crema'
const DATABASE_VERSION = 1
const ACTIVE_PREFERENCES_ID = 'active'

type StoredPreferences = Omit<UserPreferences, 'themeId'> & { themeId?: ThemeId; id: typeof ACTIVE_PREFERENCES_ID }

export type StoredFile = {
  path: string
  content: string
  kind: 'text' | 'json'
  updatedAt: ISODate
}

interface NotasCremaDatabase extends DBSchema {
  folders: {
    key: string
    value: Folder
  }
  notes: {
    key: string
    value: Note
  }
  preferences: {
    key: typeof ACTIVE_PREFERENCES_ID
    value: StoredPreferences
  }
  files: {
    key: string
    value: StoredFile
  }
}

let databasePromise: Promise<IDBPDatabase<NotasCremaDatabase>> | null = null

export function getLocalDatabase(): Promise<IDBPDatabase<NotasCremaDatabase>> {
  databasePromise ??= openDB<NotasCremaDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('folders')) {
        database.createObjectStore('folders', { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains('notes')) {
        database.createObjectStore('notes', { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains('preferences')) {
        database.createObjectStore('preferences', { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains('files')) {
        database.createObjectStore('files', { keyPath: 'path' })
      }
    },
  })

  return databasePromise
}

export async function listFolders(): Promise<Folder[]> {
  const database = await getLocalDatabase()
  const folders = await database.getAll('folders')

  return folders.map(normalizeFolder).sort((first, second) => first.name.localeCompare(second.name))
}

export async function saveFolder(folder: Folder): Promise<void> {
  const database = await getLocalDatabase()
  await database.put('folders', folder)
}

export async function deleteFolderById(folderId: string): Promise<void> {
  const database = await getLocalDatabase()
  await database.delete('folders', folderId)
}

export async function listNotes(): Promise<Note[]> {
  const database = await getLocalDatabase()
  const notes = await database.getAll('notes')

  return notes.sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
}

export async function saveNote(note: Note): Promise<void> {
  const database = await getLocalDatabase()
  await database.put('notes', note)
}

export async function deleteNoteById(noteId: string): Promise<void> {
  const database = await getLocalDatabase()
  await database.delete('notes', noteId)
}

export async function loadPreferences(): Promise<UserPreferences | null> {
  const database = await getLocalDatabase()
  const preferences = await database.get('preferences', ACTIVE_PREFERENCES_ID)

  if (!preferences) {
    return null
  }

  return {
    displayName: preferences.displayName,
    accentColor: preferences.accentColor,
    themeId: preferences.themeId ?? 'forest',
    fontFamily: preferences.fontFamily,
    locale: preferences.locale,
    soundEnabled: preferences.soundEnabled,
    onboardedAt: preferences.onboardedAt,
    updatedAt: preferences.updatedAt,
  }
}

export async function savePreferences(preferences: UserPreferences): Promise<void> {
  const database = await getLocalDatabase()

  await database.put('preferences', {
    ...preferences,
    id: ACTIVE_PREFERENCES_ID,
  })
}

export async function loadStoredFile(path: string): Promise<StoredFile | null> {
  const database = await getLocalDatabase()
  const file = await database.get('files', path)

  return file ?? null
}

export async function saveStoredFile(file: Omit<StoredFile, 'updatedAt'>): Promise<void> {
  const database = await getLocalDatabase()

  await database.put('files', {
    ...file,
    updatedAt: nowIso(),
  })
}

export async function deleteStoredFile(path: string): Promise<void> {
  const database = await getLocalDatabase()
  await database.delete('files', path)
}

function normalizeFolder(folder: Folder): Folder {
  return {
    ...folder,
    icon: folder.icon ?? 'folder',
  }
}
