import * as monaco from 'monaco-editor'
import type { Breakpoint } from '../core/types'
import type { EditorHost } from './EditorHost'

/**
 * 断点管理（P1 仅数据结构 + glyph margin 装饰；P2 与 DebugAdapter 联动生效）
 */
export class BreakpointManager {
  private breakpoints: Breakpoint[] = []

  constructor(private readonly host: EditorHost) {}

  toggle(docId: string, line: number): void {
    const idx = this.breakpoints.findIndex((b) => b.docId === docId && b.line === line)
    if (idx >= 0) this.breakpoints.splice(idx, 1)
    else this.breakpoints.push({ docId, line, enabled: true })
    this.apply(docId)
  }

  set(bps: Breakpoint[]): void {
    this.breakpoints = bps
  }

  list(): Breakpoint[] {
    return [...this.breakpoints]
  }

  private apply(docId: string): void {
    const model = this.host.editor.getModel()
    if (!model) return
    const ids = this.breakpoints
      .filter((b) => b.docId === docId && b.enabled)
      .map((b) => ({
        range: new monaco.Range(b.line, 1, b.line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'll-editor-breakpoint',
          glyphMarginHoverMessage: { value: `断点 @ ${b.line}` }
        }
      }))
    this.host.editor.deltaDecorations([], ids)
  }
}
