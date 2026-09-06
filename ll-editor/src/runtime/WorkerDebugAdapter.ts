import type { DebugAdapter, DebugEvent, EditorDoc, RunOptions, RunResult } from '../core/types'
import { Sandbox } from './sandbox'
import { transpileToJs } from './transpile'

export interface BreakpointPayload {
  line: number
  stack?: string
}

/**
 * 基于前端沙箱（Web Worker）的调试适配器（P2 默认实现）。
 * 通过 Sandbox 在隔离环境中执行 JS/TS，并将输出/断点/错误事件回传给订阅者。
 */
export class WorkerDebugAdapter implements DebugAdapter {
  readonly language: string
  private readonly sandbox: Sandbox
  private readonly listeners = new Map<DebugEvent, Set<(payload: unknown) => void>>()
  private breakpoints: number[] = []

  constructor(language: string, sandbox?: Sandbox) {
    this.language = language
    this.sandbox = sandbox ?? new Sandbox()
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

  resume(): void {
    this.sandbox.continue()
  }

  async run(doc: EditorDoc, _opts?: RunOptions): Promise<RunResult> {
    const js = transpileToJs(doc.content, doc.language)
    let output = ''

    return new Promise<RunResult>((resolve) => {
      this.sandbox.run(
        { code: js, language: doc.language, breakpoints: this.breakpoints },
        {
          onOutput: (level, text) => {
            output += text + '\n'
            this.emit('output', { level, text })
          },
          onBreakpoint: (line, stack) => {
            this.emit('breakpoint', { line, stack } as BreakpointPayload)
          },
          onError: (text) => {
            output += text + '\n'
            this.emit('error', new Error(text))
          },
          onEnd: (result) => {
            const finalOutput = output + (result.exitCode ? `\n[exit code ${result.exitCode}]` : '')
            const runResult: RunResult = {
              output: finalOutput,
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
