import { describe, it, expect } from 'vitest'
import { transpileToJs, lintCode, ConsoleModel, Sandbox, WorkerDebugAdapter } from '../../src/runtime'
import type { EditorDoc, Diagnostic } from '../../src/core/types'
import type { RuntimeExecutor } from '../../src/runtime'

function makeDoc(content: string, language = 'javascript'): EditorDoc {
  return { id: 'd1', name: 'd.ts', language, content, updatedAt: 0 }
}

describe('runtime: transpile', () => {
  it('转译 TS 时去除类型注解', () => {
    const out = transpileToJs('const a: number = 1\nconsole.log(a)', 'typescript')
    expect(out).not.toContain(': number')
    expect(out).toContain('console.log(a)')
  })

  it('JS 原样返回', () => {
    const code = 'const a = 1'
    expect(transpileToJs(code, 'javascript')).toBe(code)
  })
})

describe('runtime: lint', () => {
  it('语法错误返回诊断', () => {
    const diags = lintCode('const a = ', 'javascript', 'd1')
    expect(diags.length).toBeGreaterThan(0)
    expect(diags[0].severity).toBe('error')
  })

  it('合法代码无诊断', () => {
    const diags = lintCode('const a = 1\nconsole.log(a)', 'javascript', 'd1')
    expect(diags).toHaveLength(0)
  })

  it('TS 语法错误产生诊断', () => {
    const diags: Diagnostic[] = lintCode('const a: number =', 'typescript', 'd1')
    expect(diags.length).toBeGreaterThan(0)
  })
})

describe('runtime: ConsoleModel', () => {
  it('add / subscribe / clear', () => {
    const model = new ConsoleModel()
    const seen: string[] = []
    model.subscribe(() => seen.push('changed'))
    model.add('log', 'hi')
    model.add('error', 'boom')
    expect(model.getEntries()).toHaveLength(2)
    expect(model.getEntries()[0].text).toBe('hi')
    expect(seen).toHaveLength(2)
    model.clear()
    expect(model.getEntries()).toHaveLength(0)
  })
})

describe('runtime: WorkerDebugAdapter (with mock executor)', () => {
  it('运行并回传输出与结果', async () => {
    const executor: RuntimeExecutor = (input, cb) => {
      cb.onOutput?.('log', 'hello')
      cb.onEnd?.({ exitCode: 0, vars: { x: 1 } })
    }
    const adapter = new WorkerDebugAdapter('javascript', new Sandbox(executor))
    const result = await adapter.run(makeDoc('console.log("hi")'))
    expect(result.output).toContain('hello')
    expect(result.exitCode).toBe(0)
    expect(result.vars).toEqual({ x: 1 })
  })

  it('断点命中事件回传行号', async () => {
    const executor: RuntimeExecutor = (input, cb) => {
      cb.onBreakpoint?.(3, 'stack-trace')
      cb.onEnd?.({ exitCode: 0, vars: {} })
    }
    const adapter = new WorkerDebugAdapter('javascript', new Sandbox(executor))
    const events: unknown[] = []
    adapter.on('breakpoint', (p) => events.push(p))
    await adapter.run(makeDoc('x=1'))
    expect(events).toHaveLength(1)
    expect((events[0] as { line: number }).line).toBe(3)
  })

  it('registerDebugAdapter 后断点暂停可被恢复', async () => {
    let continued = false
    const executor: RuntimeExecutor = (input, cb) => {
      cb.onBreakpoint?.(2)
      // 模拟暂停：未收到 continue 前不应 onEnd
      setTimeout(() => {
        if (continued) cb.onEnd?.({ exitCode: 0, vars: {} })
      }, 10)
    }
    const sandbox = new Sandbox(executor)
    const adapter = new WorkerDebugAdapter('javascript', sandbox)
    let paused = false
    adapter.on('breakpoint', () => {
      paused = true
      adapter.resume?.()
      continued = true
    })
    await adapter.run(makeDoc('a=1\nb=2'))
    expect(paused).toBe(true)
  })
})
