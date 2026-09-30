import { strFromU8, strToU8, unzip, zip } from 'fflate'
import type { Folder } from '@/domain/folders/folder'
import type { Note } from '@/domain/notes/note'
import { fontOptions, themeOptions, type UserPreferences } from '@/domain/preferences/preferences'
import type { GithubSyncConfig } from '@/infrastructure/db/localDatabase'
import type { GameScores } from '@/features/dashboard/gameScores'

export type SessionView = {
  activeFolderId: string | null
  activeNoteId: string | null
  editorMode: 'markdown' | 'preview' | 'drawing' | 'split'
  sidebarCollapsed: boolean
  workspaceView: 'dashboard' | 'notes'
  search: string
}

export type SessionData = {
  preferences: UserPreferences | null
  folders: Folder[]
  notes: Note[]
  files: Record<string, string>
  view: SessionView
  gameScores: GameScores
  githubConfig: GithubSyncConfig | null
}

const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024
const MAX_ARCHIVE_ENTRIES = 50_000
const MANIFEST = 'session.json'

export async function encodeSession(data: SessionData): Promise<Uint8Array> {
  const { files, ...metadata } = data
  const entries: Record<string, Uint8Array> = Object.create(null)
  entries[MANIFEST] = strToU8(JSON.stringify({ app: 'sin-mucha-nota', version: 1, exportedAt: new Date().toISOString(), ...metadata }, null, 2))
  for (const [path, content] of Object.entries(files)) entries[`content/${path}`] = strToU8(content)
  return new Promise((resolve, reject) => zip(entries, { level: 6 }, (error, result) => error ? reject(error) : resolve(result)))
}

export async function decodeSession(bytes: Uint8Array): Promise<SessionData> {
  check(bytes.byteLength <= MAX_ARCHIVE_BYTES, 'El ZIP supera el límite de 512 MB.')
  let size = 0
  let count = 0
  let oversized = false
  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => unzip(bytes, {
    filter: (file) => {
      size += file.originalSize
      count++
      oversized ||= size > MAX_ARCHIVE_BYTES || count > MAX_ARCHIVE_ENTRIES
      return !oversized
    },
  }, (error, result) => error ? reject(error) : resolve(result)))
  check(!oversized, 'El contenido del ZIP es demasiado grande.')
  check(Object.hasOwn(entries, MANIFEST), 'Este ZIP no contiene una sesión de sin mucha nota.')
  const data: unknown = JSON.parse(strFromU8(entries[MANIFEST]))
  check(isRecord(data) && data.app === 'sin-mucha-nota' && data.version === 1, 'Formato de sesión no compatible.')
  check(Array.isArray(data.folders) && Array.isArray(data.notes), 'Faltan las notas o carpetas.')
  validatePreferences(data.preferences)
  const folders = data.folders as Folder[]
  const notes = data.notes as Note[]
  const folderIds = new Set<string>()
  for (const folder of folders) {
    check(isRecord(folder) && nonempty(folder.id) && nonempty(folder.name) && nullableId(folder.parentId)
      && ['folder', 'project', 'book', 'idea', 'travel', 'meeting', 'recipe', 'personal'].includes(folder.icon)
      && validDate(folder.createdAt) && validDate(folder.updatedAt) && !folderIds.has(folder.id), 'Carpeta inválida o duplicada.')
    folderIds.add(folder.id)
  }
  const parents = new Map(folders.map((folder) => [folder.id, folder.parentId]))
  const visited = new Set<string>()
  for (const folder of folders) {
    const branch = new Set<string>()
    let id: string | null = folder.id
    while (id !== null && !visited.has(id)) {
      check(folderIds.has(id) && !branch.has(id), 'La estructura de carpetas es inválida.')
      branch.add(id)
      id = parents.get(id as Folder['id']) ?? null
    }
    for (const id of branch) visited.add(id)
  }
  const noteIds = new Set<string>()
  const files: Record<string, string> = Object.create(null)
  for (const note of notes) {
    check(isRecord(note) && nonempty(note.id) && nonempty(note.title) && nullableId(note.folderId)
      && (note.folderId === null || folderIds.has(note.folderId)) && isRecord(note.contentRef)
      && validDate(note.createdAt) && validDate(note.updatedAt) && !noteIds.has(note.id), 'Nota inválida o duplicada.')
    noteIds.add(note.id)
    for (const path of [note.contentRef.markdownPath, note.contentRef.drawingPath]) {
      check(validPath(path) && !Object.hasOwn(files, path) && Object.hasOwn(entries, `content/${path}`), 'Falta un archivo de la sesión o su ruta es inválida.')
      files[path] = strFromU8(entries[`content/${path}`])
    }
    validateDrawing(JSON.parse(files[note.contentRef.drawingPath]))
  }
  const view = data.view
  check(isRecord(view) && nullableId(view.activeNoteId) && nullableId(view.activeFolderId)
    && (view.activeNoteId === null || noteIds.has(view.activeNoteId as string))
    && (view.activeFolderId === null || folderIds.has(view.activeFolderId as string))
    && ['markdown', 'preview', 'drawing', 'split'].includes(view.editorMode as string)
    && ['dashboard', 'notes'].includes(view.workspaceView as string)
    && typeof view.sidebarCollapsed === 'boolean' && typeof view.search === 'string', 'Vista de sesión inválida.')
  const scores = data.gameScores
  check(isRecord(scores) && Number.isInteger(scores.best) && Number(scores.best) >= 0 && Array.isArray(scores.history)
    && scores.history.every((score) => isRecord(score) && nonempty(score.id) && Number.isInteger(score.score)
      && Number(score.score) >= 0 && validDate(score.playedAt)), 'Historial de partidas inválido.')
  const config = data.githubConfig
  check(config === null || isRecord(config) && ['owner', 'repo', 'repoFullName', 'branch', 'basePath'].every((key) => typeof config[key] === 'string')
    && validDate(config.selectedAt) && validDate(config.updatedAt), 'Configuración de GitHub inválida.')
  return { preferences: data.preferences as UserPreferences | null, folders, notes, files,
    view: view as SessionView, gameScores: scores as GameScores,
    githubConfig: config === null ? null : {
      id: 'config', owner: config.owner as string, repo: config.repo as string, repoFullName: config.repoFullName as string,
      branch: config.branch as string, basePath: config.basePath as string, selectedAt: config.selectedAt as GithubSyncConfig['selectedAt'],
      updatedAt: config.updatedAt as GithubSyncConfig['updatedAt'], enabled: false, initialSyncStrategy: null,
    },
  }
}

function validatePreferences(value: unknown): void {
  if (value === null) return
  check(isRecord(value) && nonempty(value.displayName) && /^#[0-9a-f]{6}$/i.test(String(value.accentColor))
    && themeOptions.some((theme) => theme.value === value.themeId) && fontOptions.some((font) => font.value === value.fontFamily)
    && ['es', 'en'].includes(value.locale as string) && typeof value.soundEnabled === 'boolean'
    && typeof value.soundVolume === 'number' && value.soundVolume >= 0 && value.soundVolume <= 1
    && validDate(value.onboardedAt) && validDate(value.updatedAt), 'Preferencias inválidas.')
}

function validateDrawing(value: unknown): void {
  check(isRecord(value) && Array.isArray(value.elements) && isRecord(value.appState) && isRecord(value.files), 'Dibujo inválido.')
  for (const element of value.elements) {
    check(isRecord(element) && nonempty(element.id) && nonempty(element.type), 'Elemento de dibujo inválido.')
    if (element.type === 'image' && !element.isDeleted) {
      check(typeof element.fileId === 'string' && Object.hasOwn(value.files, element.fileId), 'Falta una imagen del dibujo.')
    }
  }
  for (const [id, file] of Object.entries(value.files)) {
    check(isRecord(file) && file.id === id && typeof file.dataURL === 'string' && file.dataURL.startsWith('data:image/')
      && typeof file.mimeType === 'string' && typeof file.created === 'number', 'Archivo de imagen inválido.')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) }
function nonempty(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 }
function nullableId(value: unknown): boolean { return value === null || nonempty(value) }
function validDate(value: unknown): boolean { return typeof value === 'string' && Number.isFinite(Date.parse(value)) }
function validPath(value: unknown): value is string {
  return nonempty(value) && !/[\\:]/.test(value) && !Array.from(value).some((character) => character.charCodeAt(0) < 32)
    && value.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
}
function check(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message) }
