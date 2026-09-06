import type { EditorDoc, DocSummary } from '../core/types'
import type { StorageProvider } from './StorageProvider'

const PREFIX = 'll-editor:doc:'

/**
 * 基于 localStorage 的轻量存储（默认实现，适合少量文档/演示）
 */
export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly namespace = 'default') {}

  private key(id: string): string {
    return `${PREFIX}${this.namespace}:${id}`
  }

  private nsKey(): string {
    return `${PREFIX}${this.namespace}:__index__`
  }

  private index(): string[] {
    try {
      return JSON.parse(localStorage.getItem(this.nsKey()) || '[]')
    } catch {
      return []
    }
  }

  private writeIndex(ids: string[]): void {
    localStorage.setItem(this.nsKey(), JSON.stringify(ids))
  }

  async load(id: string): Promise<EditorDoc | null> {
    const raw = localStorage.getItem(this.key(id))
    return raw ? (JSON.parse(raw) as EditorDoc) : null
  }

  async save(doc: EditorDoc): Promise<void> {
    localStorage.setItem(this.key(doc.id), JSON.stringify(doc))
    const ids = this.index()
    if (!ids.includes(doc.id)) {
      ids.push(doc.id)
      this.writeIndex(ids)
    }
  }

  async list(): Promise<DocSummary[]> {
    return this.index()
      .map((id) => localStorage.getItem(this.key(id)))
      .filter((r): r is string => !!r)
      .map((r) => {
        const d = JSON.parse(r) as EditorDoc
        return { id: d.id, name: d.name, language: d.language, updatedAt: d.updatedAt }
      })
  }

  async remove(id: string): Promise<void> {
    localStorage.removeItem(this.key(id))
    this.writeIndex(this.index().filter((x) => x !== id))
  }
}
