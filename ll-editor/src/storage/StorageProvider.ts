import type { EditorDoc, DocSummary } from '../core/types'

/**
 * 存储后端抽象（可插拔）。P1 内置 localStorage / IndexedDB；P3 可由插件贡献 REST/远程实现。
 */
export interface StorageProvider {
  load(id: string): Promise<EditorDoc | null>
  save(doc: EditorDoc): Promise<void>
  list(): Promise<DocSummary[]>
  remove(id: string): Promise<void>
}
