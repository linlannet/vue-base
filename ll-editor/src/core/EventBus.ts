type Handler<T = unknown> = (payload: T) => void

/**
 * 极简类型化事件总线（框架无关）
 */
export class EventBus<Events = Record<string, unknown>> {
  private readonly handlers = new Map<keyof Events, Set<Handler>>()

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler as Handler)
    return () => this.off(event, handler)
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler)
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.handlers.get(event)?.forEach((h) => h(payload))
  }

  dispose(): void {
    this.handlers.clear()
  }
}

/** LLEditor 对外事件表 */
export interface LLEditorEvents {
  'doc:opened': EditorDoc
  'doc:changed': EditorDoc
  'doc:saved': EditorDoc
  'doc:closed': { id: string }
  'tab:switched': { id: string }
  'theme:changed': string
  'language:registered': string
  'breakpoint:changed': Breakpoint[]
  // P2+ 预留
  'run:started': { docId: string }
  'run:output': string
  'run:ended': RunResult
}

import type { EditorDoc, Breakpoint, RunResult } from './types'
