import { deleteStoredFile, loadStoredFile, saveStoredFile } from '@/infrastructure/db/localDatabase'

export type FileStorageMode = 'opfs' | 'indexeddb-files'

export type FileStorage = {
  mode: FileStorageMode
  readText(path: string): Promise<string | null>
  writeText(path: string, content: string): Promise<void>
  readJson<T>(path: string): Promise<T | null>
  writeJson<T>(path: string, content: T): Promise<void>
  deleteFile(path: string): Promise<void>
}

type OpfsWritable = {
  write(content: string): Promise<void>
  close(): Promise<void>
}

type OpfsFileHandle = {
  getFile(): Promise<File>
  createWritable(): Promise<OpfsWritable>
}

type OpfsDirectoryHandle = {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<OpfsDirectoryHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<OpfsFileHandle>
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
}

type StorageManagerWithOpfs = StorageManager & {
  getDirectory?: () => Promise<OpfsDirectoryHandle>
}

class OriginPrivateFileStorage implements FileStorage {
  readonly mode = 'opfs'

  async readText(path: string): Promise<string | null> {
    const indexedFile = await loadStoredFile(path)

    try {
      const fileHandle = await this.getFileHandle(path, false)
      const file = await fileHandle.getFile()
      const indexedUpdatedAt = indexedFile ? new Date(indexedFile.updatedAt).getTime() : 0

      if (indexedFile && indexedUpdatedAt >= file.lastModified) {
        return indexedFile.content
      }

      const content = await file.text()

      await saveStoredFile({ path, content, kind: 'text' })

      return content
    } catch {
      return indexedFile?.content ?? null
    }
  }

  async writeText(path: string, content: string): Promise<void> {
    const fileHandle = await this.getFileHandle(path, true)
    const writable = await fileHandle.createWritable()

    await writable.write(content)
    await writable.close()
    await saveStoredFile({ path, content, kind: 'text' })
  }

  async readJson<T>(path: string): Promise<T | null> {
    const content = await this.readText(path)

    if (!content) {
      return null
    }

    return JSON.parse(content) as T
  }

  async writeJson<T>(path: string, content: T): Promise<void> {
    await this.writeText(path, JSON.stringify(content))
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const pathParts = path.split('/').filter(Boolean)
      const fileName = pathParts.at(-1)

      if (!fileName) {
        return
      }

      const directory = await this.getDirectory(pathParts.slice(0, -1), false)
      await directory.removeEntry(fileName)
    } catch {
      return
    }
  }

  private async getFileHandle(path: string, create: boolean): Promise<OpfsFileHandle> {
    const pathParts = path.split('/').filter(Boolean)
    const fileName = pathParts.at(-1)

    if (!fileName) {
      throw new Error('Ruta de archivo invalida')
    }

    const directory = await this.getDirectory(pathParts.slice(0, -1), create)

    return directory.getFileHandle(fileName, { create })
  }

  private async getDirectory(pathParts: string[], create: boolean): Promise<OpfsDirectoryHandle> {
    const root = await getOpfsRoot()
    let directory = root

    for (const pathPart of pathParts) {
      directory = await directory.getDirectoryHandle(pathPart, { create })
    }

    return directory
  }
}

class IndexedDbFileStorage implements FileStorage {
  readonly mode = 'indexeddb-files'

  async readText(path: string): Promise<string | null> {
    const file = await loadStoredFile(path)

    return file?.content ?? null
  }

  async writeText(path: string, content: string): Promise<void> {
    await saveStoredFile({ path, content, kind: 'text' })
  }

  async readJson<T>(path: string): Promise<T | null> {
    const content = await this.readText(path)

    if (!content) {
      return null
    }

    return JSON.parse(content) as T
  }

  async writeJson<T>(path: string, content: T): Promise<void> {
    await saveStoredFile({ path, content: JSON.stringify(content), kind: 'json' })
  }

  async deleteFile(path: string): Promise<void> {
    await deleteStoredFile(path)
  }
}

export function createFileStorage(): FileStorage {
  return hasOpfsSupport() ? new OriginPrivateFileStorage() : new IndexedDbFileStorage()
}

function hasOpfsSupport(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }

  return typeof (navigator.storage as StorageManagerWithOpfs | undefined)?.getDirectory === 'function'
}

async function getOpfsRoot(): Promise<OpfsDirectoryHandle> {
  const storage = navigator.storage as StorageManagerWithOpfs
  const root = await storage.getDirectory?.()

  if (!root) {
    throw new Error('OPFS no esta disponible')
  }

  return root
}
