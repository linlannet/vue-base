// @ts-nocheck
import contants from '@/scripts/contants'
import bus from '@/scripts/bus'
import { modal } from '@/components/common/modal/index'

// Vue3 移植版：用原生 fetch 替代 axios，保持原 linlan-editor 的 execute/send/setBaseURL API
const config = {
  // 与 linlanApi.ts 的 BASE 保持一致：context-path=/magic-api + web=/rest/web
  baseURL: (import.meta.env && import.meta.env.VITE_MAGIC_API_PREFIX) || '/magic-api/rest/web',
  getAxios: undefined,
  token: ''
}

const defaultConfig = {
  method: 'post',
  credentials: 'include'
}

function setBaseURL(url) {
  config.baseURL = url
}

function buildHeaders(headers) {
  // 对齐参考 request.js：默认 application/x-www-form-urlencoded（Qs.stringify），
  // JSON 提交需调用方显式传 {headers: {'Content-Type': 'application/json'}}
  const h = { 'Content-Type': 'application/x-www-form-urlencoded', ...(headers || {}) }
  let token = ''
  try {
    token = (typeof localStorage !== 'undefined' && localStorage.getItem(contants.HEADER_MAGIC_TOKEN)) || ''
  } catch (e) {
    token = ''
  }
  if (token) {
    h[contants.HEADER_MAGIC_TOKEN] = token
  }
  return h
}

// qs.stringify 的最小等价实现（arrayFormat:'repeat' + allowDots:true）：
// 支持基本类型、数组（重复键）、单层对象（a.b=c 点号展开）
function toFormString(data) {
  const parts = []
  const append = (prefix, value) => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((it) => append(prefix, it))
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      Object.keys(value).forEach((k) => append(prefix ? `${prefix}.${k}` : k, value[k]))
    } else {
      parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(value instanceof Date ? value.toISOString() : value)}`)
    }
  }
  Object.keys(data || {}).forEach((k) => append(k, data[k]))
  return parts.join('&')
}

function toHeadersObj(fetchHeaders) {
  const obj = {}
  fetchHeaders.forEach((v, k) => {
    obj[k.toLowerCase()] = v
  })
  return obj
}

async function doFetch(url, options) {
  let fullUrl = url
  if (!/^https?:\/\//.test(url) && config.baseURL) {
    fullUrl = config.baseURL + (url.startsWith('/') ? url : '/' + url)
  }
  const resp = await fetch(fullUrl, options)
  // 兼容 magic-api 运行接口的 execute，responseType: 'blob'）的 axios 语义：
  // 原始实现由 transformResponse 将 res.data 包成 Promise，调用方用 res.data.then(...) 取结果。
  // 这里在 blob 模式下把 data 包成 Promise（有 content-disposition 时为 Blob，否则读为文本），保持等价行为。
  if (options.__responseType === 'blob') {
    const blob = await resp.blob()
    const cd = resp.headers.get('content-disposition')
    const data = cd ? blob : await blob.text()
    return {
      data: Promise.resolve(data),
      status: resp.status,
      statusText: resp.statusText,
      headers: toHeadersObj(resp.headers),
      config: options.__config
    }
  }
  const contentType = resp.headers.get('content-type') || ''
  let data
  if (options.__responseType === 'stream' || contentType.indexOf('application/octet-stream') >= 0) {
    data = resp.body
  } else if (contentType.indexOf('application/json') >= 0) {
    data = await resp.json().catch(() => null)
  } else {
    data = await resp.text()
  }
  return {
    data,
    status: resp.status,
    statusText: resp.statusText,
    headers: toHeadersObj(resp.headers),
    config: options.__config
  }
}

function execute(cfg = {}) {
  const method = (cfg.method || defaultConfig.method).toUpperCase()
  const isBody = ['POST', 'PUT', 'PATCH', 'DELETE'].indexOf(method) >= 0
  const headers = buildHeaders(cfg.headers)
  let body = cfg.data
  let url = cfg.url || cfg.uri
  if (isBody) {
    if (typeof body === 'string' || body instanceof FormData) {
      // sendJson 模式：调用方已 JSON.stringify 并显式带 json 头；
      // FormData：必须删除手动 Content-Type，交由浏览器自动补全 multipart boundary，
      // 否则后端无法解析 multipart（官方 axios 版依赖浏览器默认行为，此处对齐）。
      if (body instanceof FormData) {
        delete headers['Content-Type']
      }
    } else if (body && typeof body === 'object') {
      const ct = (headers['Content-Type'] || '').toLowerCase()
      // 对齐参考 request.js：默认 Qs 表单编码；显式 json 头才走 JSON
      body = ct.indexOf('json') > -1 ? JSON.stringify(body) : toFormString(body)
    }
  } else if (body && typeof body === 'object') {
    // GET/HEAD：参数走查询串（axios params 语义）
    url = url + (url.indexOf('?') > -1 ? '&' : '?') + toFormString(body)
    body = undefined
  }
  const controller = new AbortController()
  const signal = controller.signal
  if (cfg.cancelToken && typeof cfg.cancelToken.cancel === 'function') {
    cfg.cancelToken.cancel = () => controller.abort()
  }
  return doFetch(url, {
    method,
    headers,
    body,
    credentials: 'include',
    signal,
    __responseType: cfg.responseType,
    __config: cfg
  })
}

function send(url, params, newConfig = {}) {
  const cfg = { ...defaultConfig, ...newConfig, url, data: params }
  const httpResponse = {
    successFns: [],
    exceptionFns: [],
    errorFns: [],
    endFns: [],
    success(fn) {
      this.successFns.push(fn)
      return this
    },
    exception(fn) {
      this.exceptionFns.push(fn)
      return this
    },
    error(fn) {
      this.errorFns.push(fn)
      return this
    },
    end(fn) {
      this.endFns.push(fn)
      return this
    }
  }
  execute(cfg)
    .then((response) => {
      const data = response.data
      if (data && data.code === 1) {
        httpResponse.successFns.forEach((fn) => fn(data.data, response))
      } else {
        if (httpResponse.exceptionFns.length === 0) {
          modal.linlanAlert(data && data.message ? data.message : '请求异常')
        }
        httpResponse.exceptionFns.forEach((fn) => fn(data, response))
      }
      httpResponse.endFns.forEach((fn) => fn(response))
    })
    .catch((err) => {
      modal.linlanAlert(err.message || '网络异常')
      httpResponse.errorFns.forEach((fn) => fn(err.message, err))
      httpResponse.endFns.forEach((fn) => fn(err))
    })
  return httpResponse
}

// 最小化 CancelToken（兼容 axios 用法）
function CancelToken(executor) {
  const token = { cancel() {} }
  executor((cancel) => {
    token.cancel = cancel
  })
  return token
}

const request = {
  execute,
  send,
  setBaseURL,
  getAxios() {
    return {
      CancelToken,
      // 兼容 linlan-editor 运行时在 beforeMount 注册的拦截器钩子（beforeSend/onSuccess）。
      // 迁移到 fetch 后，鉴权头由 buildHeaders 统一处理，这里提供 no-op 拦截器避免调用方崩溃。
      interceptors: {
        request: { use: () => {} },
        response: { use: () => {} }
      }
    }
  },
  CancelToken
}

export default request
