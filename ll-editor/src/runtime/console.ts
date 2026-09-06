export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

export interface ConsoleEntry {
  id: number
  level: ConsoleLevel
  text: string
  ts: number
}

/**
 * 控制台输出模型（运行时）。解耦于 UI 框架，UI 通过 subscribe 获取变更通知。
 */
export class ConsoleModel {
  private seq = 0
  private entries: ConsoleEntry[] = []
  private readonly listeners = new Set<() => void>()

  add(level: ConsoleLevel, text: string): void {
    this.entries.push({ id: ++this.seq, level, text, ts: Date.now() })
    this.notify()
  }

  clear(): void {
    this.entries = []
    this.notify()
  }

  getEntries(): readonly ConsoleEntry[] {
    return this.entries
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb())
  }
}
