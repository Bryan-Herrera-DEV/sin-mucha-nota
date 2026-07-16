import { openDB, type DBSchema } from 'idb'
import type { StateStorage } from 'zustand/middleware'

const STATE_DATABASE_NAME = 'notas-crema-zustand'
const STATE_DATABASE_VERSION = 1

type StateRecord = {
  key: string
  value: string
}

interface ZustandStateDatabase extends DBSchema {
  state: {
    key: string
    value: StateRecord
  }
}

const stateDatabasePromise = openDB<ZustandStateDatabase>(STATE_DATABASE_NAME, STATE_DATABASE_VERSION, {
  upgrade(database) {
    if (!database.objectStoreNames.contains('state')) {
      database.createObjectStore('state', { keyPath: 'key' })
    }
  },
})

export const zustandIndexedDbStorage: StateStorage = {
  async getItem(name) {
    const database = await stateDatabasePromise
    const record = await database.get('state', name)

    return record?.value ?? null
  },
  async setItem(name, value) {
    const database = await stateDatabasePromise

    await database.put('state', { key: name, value })
  },
  async removeItem(name) {
    const database = await stateDatabasePromise

    await database.delete('state', name)
  },
}
