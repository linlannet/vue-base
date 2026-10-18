import type { DebugAdapter, DebugEvent, EditorDoc, RunOptions, RunResult } from '../core/types'
import type { RuntimeExecutor } from './sandbox'
import { transpileToJs } from './transpile'

/**
 * 主线程模拟调试适配器。
 *
 * 直接运行 mock executor，事件经自身 EventBus 回传（不依赖 Web Worker）。
 * 用于非 JS/TS 语言（如 python）的"模拟调试"：在浏览器内无真实解释器时，
 * 仍可演示运行 / 输出 / 结束 的完整调试流程。
 */
export class MockDebugAdapter implements DebugAdapter {
  readonly language: string
  private readonly executor: RuntimeExecutor
  private readonly listeners = new Map<DebugEvent, Set<(payload: unknown) => void>>()
  private breakpoints: number[] = []

  constructor(language: string, executor: RuntimeExecutor) {
    this.language = language
    this.executor = executor
  }

  on(event: DebugEvent, cb: (payload: unknown) => void): () => void {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(cb)
    return () => set!.delete(cb)
  }

  private emit(event: DebugEvent, payload: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(payload))
  }

  setBreakpoints(_docId: string, lines: number[]): void {
    this.breakpoints = lines
  }

  async run(doc: EditorDoc, _opts?: RunOptions): Promise<RunResult> {
    const js = transpileToJs(doc.content, doc.language)
    let output = ''
    return new Promise<RunResult>((resolve) => {
      this.executor(
        { code: js, language: doc.language, breakpoints: this.breakpoints },
        {
          onOutput: (level, text) => {
            output += text + '\n'
            this.emit('output', { level, text })
          },
          onError: (text) => {
            output += text + '\n'
            this.emit('error', new Error(text))
          },
          onEnd: (result) => {
            const runResult: RunResult = {
              output: output + (result.exitCode ? `\n[exit code ${result.exitCode}]` : ''),
              exitCode: result.exitCode,
              vars: result.vars
            }
            this.emit('end', runResult)
            resolve(runResult)
          }
        }
      )
    })
  }
}
