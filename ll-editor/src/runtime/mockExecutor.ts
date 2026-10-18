import type { RuntimeExecutor } from './sandbox'

/**
 * 非 JS/TS 语言（如 python）的"模拟调试"执行器。
 *
 * 不调用真实解释器，仅回放源码作为模拟输出，便于在无运行时环境下演示调试流程。
 * 识别 `print(...)` 回显其字符串参数内容；以 [模拟执行] 标注非真实运行。
 * 真实多语言运行时（pyodide / 后端通道）留待 P3。
 */
export const pythonMockExecutor: RuntimeExecutor = (input, cb) => {
  const lines = (input.code ?? '').split('\n')
  cb.onOutput?.('info', `[模拟执行] ${input.language}（非真实运行时，仅回放源码）`)
  let i = 0
  const tick = (): void => {
    if (i >= lines.length) {
      cb.onEnd?.({ exitCode: 0, vars: { __simulated__: true, lines: lines.length } })
      return
    }
    const raw = lines[i]
    const trimmed = raw.trim()
    if (trimmed) {
      const m = trimmed.match(/^print\s*\((.*)\)\s*;?\s*$/)
      if (m) {
        let arg = m[1].trim()
        if (
          (arg.startsWith("'") && arg.endsWith("'")) ||
          (arg.startsWith('"') && arg.endsWith('"'))
        ) {
          arg = arg.slice(1, -1)
        }
        cb.onOutput?.('log', arg)
      } else {
        cb.onOutput?.('log', raw)
      }
    }
    i += 1
    // 模拟异步逐行回放，避免阻塞主线程
    setTimeout(tick, 8)
  }
  setTimeout(tick, 8)
}
