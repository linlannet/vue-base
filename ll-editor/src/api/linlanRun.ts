import { ref } from 'vue'
import { API_RUNTIME_BASE } from './linlanApi'
import type { LinlanApiEntity } from './linlanApi'

export interface RunLogEntry {
  id: number
  ts: number
  level: 'info' | 'error' | 'success'
  text: string
}
export interface RunHistoryEntry {
  ts: number
  method: string
  path: string
  ok: boolean
  status?: number
  duration?: number
}
export interface RunRequestInfo {
  method: string
  url: string
  headers: Record<string, string>
  body: string
}

// 接口模式底部面板共享状态（与顶部运行/调试按钮共用）
export const apiTab = ref<'request' | 'params' | 'logs' | 'history'>('request')
export const requestBody = ref('')
export const runLogs = ref<RunLogEntry[]>([])
export const runHistory = ref<RunHistoryEntry[]>([])
export const lastRequest = ref<RunRequestInfo | null>(null)

let seq = 0
function pushLog(level: RunLogEntry['level'], text: string): void {
  runLogs.value.push({ id: ++seq, ts: Date.now(), level, text })
}
export function clearRunLogs(): void {
  runLogs.value = []
}

export interface RunOptions {
  debug?: boolean
  headers?: Record<string, string>
}

// 运行/调试：直接请求已部署的接口端点（context-path + /{method}/{path}）
export async function runApi(api: LinlanApiEntity, opts: RunOptions = {}): Promise<void> {
  const path = api.path && api.path.startsWith('/') ? api.path : '/' + (api.path || '')
  const method = (api.method || 'GET').toUpperCase()
  const url = API_RUNTIME_BASE + path
  const bodyText = requestBody.value.trim()
  const headers: Record<string, string> = { ...(opts.headers || {}) }
  let body: string | undefined = undefined
  if (bodyText && method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = 'application/json'
    body = bodyText
  }
  lastRequest.value = { method, url, headers, body: bodyText }
  pushLog('info', `▶ 运行 ${method} ${path}`)
  const start = Date.now()
  try {
    const resp = await fetch(url, {
      method,
      headers,
      body,
      credentials: 'include'
    })
    const duration = Date.now() - start
    const status = resp.status
    const text = await resp.text()
    let pretty = text
    try {
      pretty = JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      pretty = text
    }
    const ok = status >= 200 && status < 300
    pushLog(ok ? 'success' : 'error', `◀ ${status} (${duration}ms)\n${pretty}`)
    runHistory.value.unshift({ ts: Date.now(), method, path, ok, status, duration })
  } catch (e) {
    const duration = Date.now() - start
    const msg = (e as Error).message
    pushLog('error', `请求失败 (${duration}ms): ${msg}`)
    runHistory.value.unshift({ ts: Date.now(), method, path, ok: false, duration })
  }
}
