import * as monaco from 'monaco-editor'
import type { Breakpoint } from '../core/types'
import type { EditorHost } from './EditorHost'

/**
 * 断点管理：维护每个文档的断点列表，并在 monaco glyph 边栏渲染红点装饰。
 * 断点变化通过 onChange 回调上抛，由 LLEditor 推送给调试适配器。
 */
export class BreakpointManager {
  private readonly host: EditorHost
  private readonly onChange?: (bps: Breakpoint[]) => void
  private breakpoints: Breakpoint[] = []
  private ids: string[] = []

  constructor(host: EditorHost, onChange?: (bps: Breakpoint[]) => void) {
    this.host = host
    this.onChange = onChange
  }

  /** 切换某行断点（存在则移除，否则新增） */
  toggle(docId: string, line: number): void {
    const idx = this.breakpoints.findIndex((b) => b.docId === docId && b.line === line)
    if (idx >= 0) this.breakpoints.splice(idx, 1)
    else this.breakpoints.push({ docId, line, enabled: true })
    this.apply(docId)
    this.onChange?.(this.list(docId))
  }

  /** 批量设置断点（用于初始配置加载） */
  setAll(docId: string, lines: number[]): void {
    this.breakpoints = this.breakpoints.filter((b) => b.docId !== docId)
    for (const line of lines) this.breakpoints.push({ docId, line, enabled: true })
    this.apply(docId)
    this.onChange?.(this.list(docId))
  }

  list(docId?: string): Breakpoint[] {
    return docId ? this.breakpoints.filter((b) => b.docId === docId) : [...this.breakpoints]
  }

  private apply(docId: string): void {
    const model = this.host.editor.getModel()
    if (!model) return
    this.ids = this.host.editor.deltaDecorations(
      this.ids,
      this.breakpoints
        .filter((b) => b.docId === docId)
        .map((b) => ({
          range: new monaco.Range(b.line, 1, b.line, 1),
          options: {
            glyphMarginClassName: 'll-editor-breakpoint',
            glyphMarginHoverMessage: { value: '断点' }
          }
        }))
    )
  }
}
