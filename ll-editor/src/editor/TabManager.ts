import type { EditorDoc } from '../core/types'
import type { EditorHost } from './EditorHost'

/**
 * 多标签管理（复用 linlan-editor 多标签思路，但数据模型与 monaco model 一一对应）
 */
export class TabManager {
  private readonly tabs = new Map<string, EditorDoc>()
  private activeId?: string

  constructor(private readonly host: EditorHost) {}

  open(doc: EditorDoc): void {
    if (!this.tabs.has(doc.id)) this.tabs.set(doc.id, doc)
    this.switch(doc.id)
  }

  switch(id: string): void {
    const doc = this.tabs.get(id)
    if (!doc) return
    this.activeId = id
    this.host.setActive(doc)
  }

  close(id: string): void {
    this.tabs.delete(id)
    this.host.removeModel(id)
    if (this.activeId === id) {
      const next = [...this.tabs.keys()][0]
      this.activeId = next
      if (next) this.switch(next)
    }
  }

  update(doc: EditorDoc): void {
    if (this.tabs.has(doc.id)) this.tabs.set(doc.id, doc)
  }

  active(): EditorDoc | undefined {
    return this.activeId ? this.tabs.get(this.activeId) : undefined
  }

  list(): EditorDoc[] {
    return [...this.tabs.values()]
  }
}
