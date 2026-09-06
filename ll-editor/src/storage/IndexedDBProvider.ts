import type { EditorDoc, DocSummary } from '../core/types'
import type { StorageProvider } from './StorageProvider'

const DB_NAME = 'll-editor'
const STORE = 'docs'

/**
 * 基于 IndexedDB 的存储（适合较多/较大文档）
 */
export class IndexedDBProvider implements StorageProvider {
  private dbPromise?: Promise<IDBDatabase>

  constructor(private readonly namespace = 'default') {}

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(`${DB_NAME}:${this.namespace}`, 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: 'id' })
          }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    }
    return this.dbPromise
  }

  private tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return this.open().then((db) => db.transaction(STORE, mode).objectStore(STORE))
  }

  async load(id: string): Promise<EditorDoc | null> {
    const store = await this.tx('readonly')
    return new Promise((resolve, reject) => {
      const req = store.get(id)
      req.onsuccess = () => resolve((req.result as EditorDoc) ?? null)
      req.onerror = () => reject(req.error)
    })
  }

  async save(doc: EditorDoc): Promise<void> {
    const store = await this.tx('readwrite')
    return new Promise((resolve, reject) => {
      const req = store.put(doc)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async list(): Promise<DocSummary[]> {
    const store = await this.tx('readonly')
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () =>
        resolve(
          (req.result as EditorDoc[]).map((d) => ({
            id: d.id,
            name: d.name,
            language: d.language,
            updatedAt: d.updatedAt
          }))
        )
      req.onerror = () => reject(req.error)
    })
  }

  async remove(id: string): Promise<void> {
    const store = await this.tx('readwrite')
    return new Promise((resolve, reject) => {
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }
}
