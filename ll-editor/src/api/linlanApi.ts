// magic-api 后端 REST 客户端（契约来自 third-magic-api / MagicResourceController）。
// 路径前缀说明：java-magic-api 工程 server.servlet.context-path=/magic-api。
// 由于 magic-api.web=/rest/web，管理接口实际前缀为 /magic-api/rest/web。
// 可用 VITE_MAGIC_API_PREFIX 覆盖（如后端改了 web 配置）。
import type { Ref } from 'vue'

const BASE = (import.meta.env.VITE_MAGIC_API_PREFIX as string) || '/magic-api/rest/web'
// 运行接口时访问的是已部署的接口端点（context-path 下），不走 /rest/web 管理前缀
export const API_WEB_BASE = BASE
export const API_RUNTIME_BASE = BASE.replace(/\/rest\/web\/?$/, '') || '/magic-api'

export interface LinlanGroup {
  id?: string
  parentId?: string | null
  name: string
  type?: string
  path?: string
  options?: Record<string, unknown>
  [key: string]: unknown
}

export interface LinlanParameter {
  name: string
  dataType?: string
  value?: unknown
  description?: string
  required?: boolean
  [key: string]: unknown
}

export interface LinlanApiEntity {
  id: string
  groupId?: string | null
  name: string
  path?: string
  method?: string
  script?: string
  parameters?: LinlanParameter[]
  options?: Record<string, unknown>
  [key: string]: unknown
}

// 数据源 SQL 查询：id/key 二选一定位数据源，sql 为待执行语句，page/size 控制分页
export interface SqlQueryRequest {
  id?: string
  key?: string
  sql: string
  page?: number
  size?: number
}

// 查询结果：columns 为列名顺序，rows 为 { 列名: 值 } 数组
export interface SqlQueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  total?: number
  cost?: number
}

export interface LinlanTreeNode {
  id: string
  name: string
  path?: string
  type?: string
  method?: string
  // 分组节点无 groupId（只有 type/parentId）；文件节点（接口/函数）带 groupId
  groupId?: string | null
  leaf?: boolean
  children?: LinlanTreeNode[]
  attribute?: Record<string, unknown>
}

// GET /todo、POST /search 的返回项
export interface LinlanTodoItem {
  id: string
  text: string
  line: number
}

export type LinlanSearchResult = LinlanTodoItem

// GET /backups、GET /backup/{id} 的返回项（列表接口不带 content）
export interface LinlanBackup {
  id: string
  createDate: number
  tag?: string
  type?: string
  name?: string
  createBy?: string
}

// POST /download、POST /push 的请求体项
export interface LinlanSelectedResource {
  id: string
  type?: string
}

interface JsonBean<T> {
  code: number
  message?: string
  data?: T
}

function mergeHeaders(init?: RequestInit): Record<string, string> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) }
  // FormData 由浏览器补全 multipart 边界，手动设置 Content-Type 反而会破坏上传
  if (!(init?.body instanceof FormData) && headers['Content-Type'] === undefined) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    ...init,
    headers: mergeHeaders(init)
  })
  // 后端不可用（代理 502、连接拒绝、空 body）时 res.json() 会抛 Unexpected end of JSON input。
  // 这里用 res.text() 兜底：解析失败时返回空对象，由调用方根据 data 形态自行处理。
  const text = await res.text()
  let json: JsonBean<T> = { code: 0, message: '' }
  if (text) {
    try {
      json = JSON.parse(text) as JsonBean<T>
    } catch {
      json = { code: 0, message: text.slice(0, 200) }
    }
  }
  if (json.code !== 1) {
    throw new Error(json.message || `请求失败 (${res.status})`)
  }
  return json.data as T
}

// /download 返回 zip 二进制流而非 JsonBean；
// 鉴权失败等异常场景后端会返回 application/json 的错误体，此处检测并转抛。
async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    ...init,
    headers: mergeHeaders(init)
  })
  const contentType = res.headers.get('content-type') || ''
  if (contentType.startsWith('application/json')) {
    const text = await res.text()
    let json: JsonBean<unknown>
    try {
      json = JSON.parse(text) as JsonBean<unknown>
    } catch {
      json = { code: 0, message: text.slice(0, 200) }
    }
    throw new Error(json.message || `请求失败 (${res.status})`)
  }
  return res.blob()
}

async function requestForm<T>(path: string, params: Record<string, unknown>): Promise<T> {
  // 后端形参无 @RequestBody 的端点（delete/move/lock/copy 等）走表单编码绑定
  const res = await fetch(BASE + path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    )
  })
  const text = await res.text()
  let json: JsonBean<T> = { code: 0, message: '' }
  if (text) {
    try {
      json = JSON.parse(text) as JsonBean<T>
    } catch {
      json = { code: 0, message: text.slice(0, 200) }
    }
  }
  if (json.code !== 1) {
    throw new Error(json.message || `请求失败 (${res.status})`)
  }
  return json.data as T
}

export const linlanApi = {
  // 整棵资源树：Map<资源类型, TreeNode<Group>>，分支 key 通常为 "api"/"function"/"datasource"
  fetchTree(): Promise<Record<string, LinlanTreeNode>> {
    return request('/resource', { method: 'POST' })
  },
  fetchApi(id: string): Promise<LinlanApiEntity> {
    return request(`/resource/file/${id}`, { method: 'GET' })
  },
  saveGroup(group: LinlanGroup): Promise<string> {
    return request('/resource/folder/save', { method: 'POST', body: JSON.stringify(group) })
  },
  // 复制分组：src 源分组 id，target 目标父分组 id
  folderCopy(src: string, target: string): Promise<string> {
    return requestForm('/resource/folder/copy', { src, target })
  },
  // 保存资源实体：folder 为资源类型（api/function/datasource）
  saveEntity(folder: string, entity: LinlanApiEntity, auto = '0'): Promise<string> {
    return request(`/resource/file/${folder}/save?auto=${auto}`, {
      method: 'POST',
      body: JSON.stringify(entity)
    })
  },
  // 兼容旧名：保存接口（后端 folder 固定为 api）
  saveApi(entity: LinlanApiEntity, auto = '0'): Promise<string> {
    return this.saveEntity('api', entity, auto)
  },
  deleteResource(id: string): Promise<boolean> {
    return requestForm('/resource/delete', { id })
  },
  moveResource(src: string, groupId: string): Promise<boolean> {
    return requestForm('/resource/move', { src, groupId })
  },
  lock(id: string): Promise<boolean> {
    return requestForm('/resource/lock', { id })
  },
  unlock(id: string): Promise<boolean> {
    return requestForm('/resource/unlock', { id })
  },
  // 测试数据源连接：后端返回 "ok" 表示连通
  testDatasource(entity: Record<string, unknown>): Promise<string> {
    return request('/datasource/jdbc/test', { method: 'POST', body: JSON.stringify(entity) })
  },
  // 基于数据源执行 SQL：需要后端提供 POST {BASE}/datasource/jdbc/query
  // 请求体 { id, key, sql, page, size }（id/key 二选一定位数据源，sql 为待执行语句）
  // 响应体 { columns, rows, total, cost }：columns 为列名，rows 为 { 列名: 值 } 数组
  executeSql(req: SqlQueryRequest): Promise<SqlQueryResult> {
    return request('/datasource/jdbc/query', { method: 'POST', body: JSON.stringify(req) })
  },

  // ---- 工作台（MagicWorkbenchController）----
  // 全局 TODO 列表：扫描所有接口/函数脚本中的 TODO、FIXME 注释
  fetchTodo(): Promise<LinlanTodoItem[]> {
    return request('/todo', { method: 'GET' })
  },
  // 接口选项键值元数据：[[value, name, defaultValue], ...]
  fetchOptions(): Promise<string[][]> {
    return request('/options', { method: 'GET' })
  },
  // 按关键字搜索接口/函数脚本内容
  search(keyword: string): Promise<LinlanSearchResult[]> {
    const q = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
    return request(`/search${q}`, { method: 'POST' })
  },
  // 刷新所有资源（重新从存储加载）
  reload(): Promise<boolean> {
    return request('/reload', { method: 'GET' })
  },

  // ---- 备份（MagicBackupController）----
  // 全量备份时间线（timestamp 为空取当前时间）
  fetchBackups(timestamp?: number): Promise<LinlanBackup[]> {
    const q = timestamp ? `?timestamp=${timestamp}` : ''
    return request(`/backups${q}`, { method: 'GET' })
  },
  // 单个资源（接口/函数/分组）的备份历史
  fetchBackupsById(id: string): Promise<LinlanBackup[]> {
    return request(`/backup/${encodeURIComponent(id)}`, { method: 'GET' })
  },
  // 读取某次备份的脚本内容（用于历史 diff）
  fetchBackupScript(id: string, timestamp: number): Promise<string> {
    return request(`/backup?id=${encodeURIComponent(id)}&timestamp=${timestamp}`, { method: 'GET' })
  },
  // 回滚到某次备份
  rollbackBackup(id: string, timestamp: number): Promise<boolean> {
    return request(`/backup/rollback?id=${encodeURIComponent(id)}&timestamp=${timestamp}`, {
      method: 'POST'
    })
  },
  // 主动创建全量备份
  createFullBackup(): Promise<boolean> {
    return request('/backup/full', { method: 'POST' })
  },

  // ---- 导出/推送/上传 ----
  // 导出选中资源为 zip；传 groupId 时导出单个分组
  downloadZip(resources: LinlanSelectedResource[], groupId?: string): Promise<Blob> {
    const q = groupId ? `?groupId=${encodeURIComponent(groupId)}` : ''
    return requestBlob(`/download${q}`, { method: 'POST', body: JSON.stringify(resources) })
  },
  // 推送选中资源到远程实例（全量模式传空列表）
  push(
    target: string,
    secretKey: string,
    mode: 'full' | 'increment',
    resources: LinlanSelectedResource[]
  ): Promise<unknown> {
    return request('/push', {
      method: 'POST',
      headers: {
        'magic-push-target': target,
        'magic-push-secret-key': secretKey,
        'magic-push-mode': mode
      },
      body: JSON.stringify(resources)
    })
  },
  // 上传 zip（增量/全量覆盖）
  upload(file: File, mode: 'full' | 'increment'): Promise<boolean> {
    const form = new FormData()
    form.append('file', file, file.name)
    form.append('mode', mode)
    return request('/upload', { method: 'POST', body: form })
  }
}

export type { Ref }
