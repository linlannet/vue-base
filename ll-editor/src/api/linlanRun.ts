import { ref } from 'vue'
import { API_RUNTIME_BASE } from './linlanApi'
import type { LinlanApiEntity } from './linlanApi'
import bus from '@/scripts/bus'
import contants from '@/scripts/contants'

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

// 拼接运行地址：context-path + 分组路径 + 接口路径（对齐官方 internalTest）
// 官方用例：groupPath=/ops/rs/fjfl、path=/fj/wd/fjwd3 → /ops/rs/fjfl/fj/wd/fjwd3
function buildUrl(api: LinlanApiEntity): string {
  const groupPath = String(api.groupPath || '').trim()
  const path = String(api.path || '').trim()
  const joined = [groupPath, path]
    .filter(Boolean)
    .join('/')
    .replace(/\/{2,}/g, '/')
  return API_RUNTIME_BASE + '/' + joined.replace(/^\/+/, '')
}

interface NameValue {
  name?: string
  value?: unknown
  required?: boolean
}

// 运行/调试：直接请求已部署的接口端点（与官方「运行」一致，执行的是后端已保存的脚本）
export async function runApi(api: LinlanApiEntity, opts: RunOptions = {}): Promise<void> {
  let url = buildUrl(api)
  // 路径变量替换（{name} → 值）
  const paths = (api.paths as NameValue[] | undefined) || []
  paths.forEach((p) => {
    if (p && p.name && p.value !== undefined && p.value !== null && String(p.value).trim() !== '') {
      url = url.split('{' + p.name + '}').join(String(p.value).trim())
    }
  })
  if (url.indexOf('{') > -1) {
    pushLog('error', '请填写路径变量后再运行')
    bus.$emit('switch-tab', 'log')
    return
  }

  const method = (api.method || 'GET').toUpperCase()
  const headers: Record<string, string> = { ...(opts.headers || {}) }
  const apiHeaders = (api.headers as NameValue[] | undefined) || []
  apiHeaders
    .filter((h) => h && h.name)
    .forEach((h) => {
      headers[h.name as string] = h.value === undefined || h.value === null ? '' : String(h.value)
    })
  if (contants.HEADER_MAGIC_TOKEN_VALUE) {
    headers[contants.HEADER_MAGIC_TOKEN] = contants.HEADER_MAGIC_TOKEN_VALUE
  }

  // 请求参数：GET/DELETE 走 query；其余默认表单，接口配置了 requestBody 时用 JSON
  const params: Record<string, unknown> = {}
  const parameters = (api.parameters as NameValue[] | undefined) || []
  parameters
    .filter((p) => p && p.name)
    .forEach((p) => {
      params[p.name as string] = p.value
    })
  let body: string | undefined
  const requestBodyText = String(api.requestBody || '').trim()
  if (method === 'GET' || method === 'DELETE') {
    const query = new URLSearchParams()
    Object.keys(params).forEach((k) => {
      const v = params[k]
      if (v !== undefined && v !== null) query.append(k, String(v))
    })
    const qs = query.toString()
    if (qs) url += (url.indexOf('?') > -1 ? '&' : '?') + qs
  } else if (requestBodyText) {
    headers['Content-Type'] = 'application/json'
    body = requestBodyText
  } else if (Object.keys(params).length) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(
      Object.keys(params)
        .filter((k) => params[k] !== undefined && params[k] !== null)
        .map((k) => [k, String(params[k])])
    ).toString()
  }

  lastRequest.value = { method, url, headers, body: body || '' }
  const displayPath = url.replace(API_RUNTIME_BASE, '')
  pushLog('info', `▶ 运行 ${method} ${displayPath}`)
  bus.$emit('status', `开始测试「${api.name || displayPath}」`)
  const start = Date.now()
  try {
    const resp = await fetch(url, { method, headers, body, credentials: 'include' })
    const duration = Date.now() - start
    const status = resp.status
    const text = await resp.text()
    // 对齐官方 transformResponse：可解析为 JSON 时格式化为 4 空格缩进
    let pretty = text
    try {
      pretty = JSON.stringify(JSON.parse(text), null, 4)
    } catch {
      pretty = text
    }
    const responseHeaders: Record<string, string> = {}
    resp.headers.forEach((v, k) => {
      responseHeaders[k] = v
    })
    const ok = status >= 200 && status < 300
    pushLog(ok ? 'success' : 'error', `◀ ${status} (${duration}ms)\n${pretty}`)
    runHistory.value.unshift({ ts: Date.now(), method, path: displayPath, ok, status, duration })
    const size = new Blob([text]).size
    const sizeText = size >= 1024 ? `${(size / 1024).toFixed(2)} KB` : `${size} B`
    bus.$emit(
      'status',
      `「${api.name || displayPath}」测试完毕，状态：<em>${status}</em> 大小：<em>${sizeText}</em> 耗时：<em>${duration} ms</em>`
    )
    // 与官方一致：把结果写回接口实体（responseBody），
    // 这样切换接口再打开、或保存后再打开时「执行结果」仍有上次运行的记录
    api.responseBody = pretty
    // 结果同时刷新到「执行结果」的 Body / 响应Header / 响应结构
    bus.$emit('update-response-body-definition', api.responseBodyDefinition)
    bus.$emit('update-response-body', pretty, responseHeaders)
    bus.$emit('switch-tab', 'result')
  } catch (e) {
    const duration = Date.now() - start
    pushLog('error', `请求失败 (${duration}ms): ${(e as Error).message}`)
    runHistory.value.unshift({ ts: Date.now(), method, path: displayPath, ok: false, duration })
    bus.$emit('status', `请求出错：「${api.name || displayPath}」`)
    bus.$emit('switch-tab', 'log')
  }
}
