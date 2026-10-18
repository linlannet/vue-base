export type RunInput = { code: string; language: string; breakpoints: number[] }

export interface SandboxCallbacks {
  onOutput?: (level: string, text: string) => void
  onBreakpoint?: (line: number, stack?: string, vars?: Record<string, unknown>) => void
  onError?: (text: string) => void
  onEnd?: (result: { exitCode: number; vars: Record<string, unknown> }) => void
}

export type RuntimeExecutor = (input: RunInput, cb: SandboxCallbacks) => void

/**
 * Web Worker 沙箱执行体（字符串源码，避免打包器依赖）。
 * 职责：
 * - 接管 console.* 并流式回传输出；
 * - 在断点行注入 `__bp__(line)` 实现暂停，等待宿主 'continue' 后恢复；
 * - 运行结束后回传 exitCode 与全局变量快照（vars）。
 */
const WORKER_SOURCE = `
const orig = {}
const LEVELS = ['log', 'info', 'warn', 'error', 'debug']
let resolver = null
self.onmessage = function (e) {
  const d = e.data
  if (d.kind === 'continue') { const r = resolver; resolver = null; if (r) r(); return }
  if (d.kind !== 'run') return
  LEVELS.forEach(function (l) { orig[l] = console[l] })
  function stringify(v) {
    if (typeof v === 'string') return v
    try { return JSON.stringify(v) } catch (err) { return String(v) }
  }
  function make(level) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var text = args.map(stringify).join(' ')
      self.postMessage({ type: 'output', level: level, text: text })
    }
  }
  LEVELS.forEach(function (l) { console[l] = make(l) })
  var bpSet = {}
  ;(d.breakpoints || []).forEach(function (n) { bpSet[n] = true })
  function snapshotVars() {
    var vars = {}
    Object.keys(globalThis).forEach(function (k) {
      if (before.indexOf(k) === -1 && k !== 'self' && k !== 'globalThis' && k !== 'postMessage' && k !== 'onmessage' && k !== 'addEventListener' && k !== 'removeEventListener') {
        try { vars[k] = globalThis[k] } catch (err) {}
      }
    })
    return vars
  }
  function __bp__(line) {
    return new Promise(function (resolve) {
      var stack = new Error().stack
      self.postMessage({ type: 'breakpoint', line: line, stack: stack, vars: snapshotVars() })
      resolver = resolve
    })
  }
  var before = Object.keys(globalThis)
  var exitCode = 0
  var code = d.code
  var lines = code.split('\\n')
  lines = lines.map(function (ln, i) {
    var L = i + 1
    return bpSet[L] ? ('__bp__(' + L + ');' + ln) : ln
  })
  var instrumented = lines.join('\\n')
  var asyncFn = new Function('__bp__', 'return (async function () {\\n' + instrumented + '\\n})()')
  asyncFn(__bp__).then(function () {
    LEVELS.forEach(function (l) { console[l] = orig[l] })
    var vars = {}
    Object.keys(globalThis).forEach(function (k) {
      if (before.indexOf(k) === -1 && k !== 'self' && k !== 'globalThis' && k !== 'postMessage' && k !== 'onmessage' && k !== 'addEventListener' && k !== 'removeEventListener') {
        try { vars[k] = globalThis[k] } catch (err) {}
      }
    })
    self.postMessage({ type: 'end', result: { exitCode: exitCode, vars: vars } })
  }).catch(function (err) {
    exitCode = 1
    self.postMessage({ type: 'error', text: String(err && err.stack ? err.stack : err) })
    LEVELS.forEach(function (l) { console[l] = orig[l] })
    self.postMessage({ type: 'end', result: { exitCode: exitCode, vars: {} } })
  })
}
`

let activeWorker: Worker | null = null

function getWorker(): Worker {
  if (activeWorker) return activeWorker
  const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' })
  activeWorker = new Worker(URL.createObjectURL(blob))
  return activeWorker
}

function defaultExecutor(input: RunInput, cb: SandboxCallbacks): void {
  const worker = getWorker()
  const handler = (e: MessageEvent) => {
    const msg = e.data
    if (msg.type === 'output') cb.onOutput?.(msg.level, msg.text)
    else if (msg.type === 'breakpoint') cb.onBreakpoint?.(msg.line, msg.stack, msg.vars)
    else if (msg.type === 'error') cb.onError?.(msg.text)
    else if (msg.type === 'end') {
      cb.onEnd?.(msg.result)
      worker.removeEventListener('message', handler)
    }
  }
  worker.addEventListener('message', handler)
  worker.postMessage({ kind: 'run', code: input.code, language: input.language, breakpoints: input.breakpoints })
}

/**
 * 沙箱执行器。默认使用 Web Worker；可通过构造函数注入自定义 executor（便于测试）。
 */
export class Sandbox {
  constructor(private readonly executor: RuntimeExecutor = defaultExecutor) {}

  run(
    input: { code: string; language: string; breakpoints?: number[] },
    cb: SandboxCallbacks
  ): void {
    this.executor({ code: input.code, language: input.language, breakpoints: input.breakpoints ?? [] }, cb)
  }

  /** 断点暂停后，通知 Worker 恢复执行 */
  continue(): void {
    activeWorker?.postMessage({ kind: 'continue' })
  }
}
