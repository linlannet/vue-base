/**
 * magic-api 运行时引导（自 LLEditor.vue 抽离，对齐 magic-editor.vue 的 script 职责）：
 * - Monaco worker 环境配置
 * - BASE_URL / SERVER_URL / contants 初始化与请求拦截器
 * - loadConfig（/config.json）、login、checkUpdate、open（恢复 URL 定位）
 * - 快捷键绑定、bus 事件订阅、WebSocket（登录成功后创建）
 *
 * 用法：LLEditor.vue 在 onBeforeMount 调 init()、onMounted 调 mount()、
 * onBeforeUnmount 调 dispose()；loading / showLogin / onLogin 交给模板与登录组件。
 */
import { ref, shallowRef, type Ref } from 'vue'
// magic-api 运行时样式（含 --background 主题变量与 .ma-container 基础样式）
import '@/assets/index.css'
import '@/assets/iconfont/iconfont.css'
import bus from '@/scripts/bus'
import request from '@/api/request'
import contants from '@/scripts/contants'
import LinlanWebSocket from '@/scripts/websocket'
import store from '@/scripts/store'
import Key from '@/scripts/hotkey'
import { getQueryVariable, replaceURL } from '@/scripts/utils'
import { defineTheme } from '@/scripts/editor/theme'
import defaultTheme from '@/scripts/editor/default-theme'
import darkTheme from '@/scripts/editor/dark-theme'
import JavaClass from '@/scripts/editor/java-class'
import { modal } from '@/components/common/modal/index'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Monaco worker 环境（与 magic-editor 的 worker-loader 等价，Vite 下用 ?worker）
;(self as any).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    switch (label) {
      case 'json':
        return new JsonWorker()
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker()
      case 'html':
      case 'handlebars':
      case 'razor':
        return new HtmlWorker()
      case 'typescript':
      case 'javascript':
        return new TsWorker()
      default:
        return new EditorWorker()
    }
  }
}

export interface MagicRuntimeDeps {
  /** 宿主配置（props.Config），与 URL 查询参数合并 */
  config: Record<string, any>
  containerRef: Ref<HTMLElement | null>
  scriptRef: Ref<any>
  apiListRef: Ref<any>
  functionListRef: Ref<any>
  datasourceListRef: Ref<any>
  toolbarIndex: Ref<number>
  editorMode: Ref<number>
  /** Ctrl+Q 测试 / F8 恢复断点 / F6 单步 / Ctrl+S 保存（由 useApiActions 提供） */
  onRun: () => void | Promise<void>
  onSave: () => void | Promise<void>
  onContinue: () => void
  onStep: () => void
}

export function useMagicRuntime(deps: MagicRuntimeDeps) {
  const loading = ref(false)
  const showLogin = ref(false)
  const websocket = shallowRef<{ close: () => void } | null>(null)

  // ===== 加载遮罩 =====
  function hideLoading(): void {
    loading.value = false
    if (typeof (window as any).hideMaLoading === 'function') (window as any).hideMaLoading()
  }

  // ===== 登录成功：刷新三个资源列表并广播 login =====
  function onLogin(): void {
    showLogin.value = false
    Promise.all([
      deps.apiListRef.value?.initData?.() ?? Promise.resolve(),
      deps.functionListRef.value?.initData?.() ?? Promise.resolve(),
      deps.datasourceListRef.value?.initData?.() ?? Promise.resolve()
    ]).then(() => bus.$emit('login'))
  }

  // ===== 快捷键（对齐 magic-editor.vue L250-256：Ctrl+S 保存 / Ctrl+Q 测试 / F8 恢复断点 / F6 单步） =====
  function bindKey(): void {
    const el = deps.containerRef.value
    if (!el) return
    Key.bind(el, Key.Ctrl | Key.S, () => {
      const script = deps.scriptRef.value as any
      if (script && typeof script.save === 'function') script.save()
    })
    Key.bind(el, Key.Ctrl | Key.Q, () => {
      void deps.onRun()
    })
    Key.bind(el, Key.F8, () => {
      deps.onContinue()
    })
    Key.bind(el, Key.F6, () => {
      deps.onStep()
    })
  }

  // ===== 工作台配置（/config.json） =====
  function loadConfig(): Promise<void> {
    return request.execute({ url: '/config.json', method: 'get' }).then((res: any) => {
      const response = (res && res.data) || {}
      contants.config = Object.assign({}, contants.config, response)
      contants.OPTIONS = response.options || contants.OPTIONS
      if (response.title) document.title = response.title
      store.set(contants.RECENT_OPENED_TAB, response.recentOpenedTab)
      if (response.themes?.default) defineTheme(response.themes.default.name, response.themes.default)
      if (response.themes?.dark) defineTheme(response.themes.dark.name, response.themes.dark)
      // 后端 config.json 可显式开启/关闭版本校验；未提供时保留宿主 Config.ignoreVersion 设置
      if (response.ignoreVersion !== undefined) contants.IGNORE_VERSION = !!response.ignoreVersion
      if (response.version && !response.ignoreVersion && !contants.IGNORE_VERSION && response.version !== contants.MAGIC_API_VERSION_TEXT) {
        ;(modal as any).linlanAlert('检测到新版本\n' + response.version + '\n当前:' + contants.MAGIC_API_VERSION_TEXT)
      }
    }).catch((e: any) => {
      ;(modal as any).linlanAlert('加载配置失败' + (e?.response?.status ? ', HTTP ' + e.response.status : ''))
    })
  }

  function login(): void {
    request.send('/login').success((isLogin: any) => {
      if (isLogin) onLogin()
      else showLogin.value = true
    })
  }

  function checkUpdate(): void {
    const url = contants.SERVER_URL + '/api/check_update'
    fetch(url).then((r) => r.json()).then((json: any) => {
      if (json?.data?.version && json.data.version !== contants.MAGIC_API_VERSION_TEXT) {
        ;(modal as any).linlanConfirm('检测到新版本：' + json.data.version + '\n当前版本：' + contants.MAGIC_API_VERSION_TEXT + '\n是否刷新页面？', {
          confirm: () => { replaceURL('v', json.data.version); window.location.reload() },
          cancel: () => {}
        })
      }
    }).catch(() => {})
  }

  // ===== WebSocket：登录成功后创建（对齐 magic-editor.vue L108-118，console 由 BASE_URL 推导） =====
  function createWebSocket(): void {
    if (websocket.value || !contants.BASE_URL) return
    let link = `${location.protocol}//${location.host}${location.pathname}`.replace('/index.html', '')
    const baseURL = contants.BASE_URL as string
    if (baseURL.startsWith('http')) {
      link = baseURL
    } else if (baseURL.startsWith('/')) {
      link = `${location.protocol}//${location.host}${baseURL}`
    } else {
      link = `${link}/${baseURL}`
    }
    websocket.value = new LinlanWebSocket(replaceURL(link.replace(/^http/, 'ws') + '/console')) as any
  }

  // ===== URL 定位（?id=&type= 打开指定资源） =====
  function openByQuery(): void {
    const id = getQueryVariable('id')
    const type = getQueryVariable('type')
    if (!id) return
    if (type === '1' && deps.apiListRef.value?.openItemById) {
      deps.apiListRef.value.openItemById(id, getQueryVariable('group'))
    } else if (type === '2' && deps.functionListRef.value?.openItemById) {
      deps.functionListRef.value.openItemById(id, getQueryVariable('group'))
    }
  }

  // ===== bus 事件（搜索定位 / 登出） =====
  function searchOpen(item: any): void {
    if (item.type === 1) {
      deps.toolbarIndex.value = 0
      deps.editorMode.value = 1
      deps.apiListRef.value?.position?.(item.id)
    } else if (item.type === 2) {
      deps.toolbarIndex.value = 1
      deps.editorMode.value = 2
      deps.functionListRef.value?.position?.(item.id)
    }
  }
  function onLogout(): void { showLogin.value = true }
  function onShowLogin(): void { showLogin.value = true }
  function onPositionApi(id: any): void {
    deps.toolbarIndex.value = 0
    deps.editorMode.value = 1
    deps.apiListRef.value?.position?.(id)
  }
  function onPositionFunction(id: any): void {
    deps.toolbarIndex.value = 1
    deps.editorMode.value = 2
    deps.functionListRef.value?.position?.(id)
  }

  let onLoginBus = createWebSocket

  /** onBeforeMount 阶段：合并配置 + 请求拦截器 + 内置主题 */
  function init(): void {
    const llConfig = deps.config
    // 默认对齐 vite 代理：/magic-api -> http://localhost:8088（context-path=/magic-api，web=/rest/web）
    // 参考 magic-editor.vue L155：setBaseURL 直接使用 BASE_URL，无 /api 后缀
    const baseURL = getQueryVariable('baseURL') || llConfig.baseURL || '/magic-api/rest/web'
    // 运行接口（测试面板）访问部署端点：从工作台前缀推导 runtime 根（去掉 /rest/web）
    const serverURL = getQueryVariable('serverURL') || llConfig.serverURL || baseURL.replace(/\/rest\/web\/?$/, '')
    request.setBaseURL(baseURL)
    contants.BASE_URL = baseURL
    contants.SERVER_URL = serverURL
    contants.HEADER_MAGIC_TOKEN = llConfig.headerMagicToken || 'magic-api-token'
    contants.HEADER_MAGIC_TOKEN_VALUE = llConfig.headerMagicTokenValue || 'magic-api-token'
    contants.DEFAULT_EXPAND = llConfig.defaultExpand || false
    contants.JDBC_DRIVERS = llConfig.jdbcDrivers || ['com.mysql.jdbc.Driver', 'com.mysql.cj.jdbc.Driver', 'oracle.jdbc.driver.OracleDriver', 'org.postgresql.Driver', 'com.microsoft.sqlserver.jdbc.SQLServerDriver']
    contants.DATASOURCE_TYPES = llConfig.datasourceTypes || ['jdbc', 'es', 'mongo', 'redis', 'dubbo']
    contants.OPTIONS = llConfig.options || {}
    contants.EDITOR_FONT_FAMILY = llConfig.editorFontFamily || 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace'
    contants.EDITOR_FONT_SIZE = llConfig.editorFontSize || 14
    contants.LOG_MAX_ROWS = llConfig.logMaxRows || 300
    contants.MAGIC_API_VERSION_TEXT = llConfig.magicApiVersionText || '(v?)'
    contants.AUTO_SAVE = llConfig.autoSave === undefined ? true : llConfig.autoSave
    contants.DECORATION_TIMEOUT = llConfig.decorationTimeout || 5000
    contants.config = llConfig
    contants.IGNORE_VERSION = llConfig.ignoreVersion || false
    contants.RECENT_OPENED_TAB = llConfig.recentOpenedTab || 'recent-opened-tab'

    request.getAxios().interceptors.request.use((config: any) => {
      config.headers[contants.HEADER_MAGIC_TOKEN] = contants.HEADER_MAGIC_TOKEN_VALUE
      config.headers['X-Requested-With'] = 'XMLHttpRequest'
      return config
    })
    request.getAxios().interceptors.response.use((response: any) => response, (error: any) => Promise.reject(error))

    defineTheme('default', defaultTheme)
    defineTheme('dark', darkTheme)
  }

  /** onMounted 阶段：快捷键 / 配置加载 / 登录 / bus 订阅 / URL 定位 */
  function mount(): void {
    window.onbeforeunload = () => '系统可能不会保存您所做的更改'
    bindKey()
    if (contants.BASE_URL) {
      loading.value = true
      JavaClass.initClasses().then(() => JavaClass.initImportClass()).catch(() => {})
      loadConfig().then(() => { hideLoading(); login(); checkUpdate() })
    }
    onLoginBus = createWebSocket
    bus.$on('login', onLoginBus)
    bus.$on('search-open', searchOpen)
    bus.$on('logout', onLogout)
    bus.$on('showLogin', onShowLogin)
    bus.$on('position-api', onPositionApi)
    bus.$on('position-function', onPositionFunction)
    openByQuery()
  }

  /** onBeforeUnmount 阶段：解绑快捷键 / bus / WebSocket */
  function dispose(): void {
    bus.$off('login', onLoginBus)
    bus.$off('search-open', searchOpen)
    bus.$off('logout', onLogout)
    bus.$off('showLogin', onShowLogin)
    bus.$off('position-api', onPositionApi)
    bus.$off('position-function', onPositionFunction)
    Key.unbind()
    websocket.value?.close()
    websocket.value = null
  }

  return { loading, showLogin, init, mount, dispose, onLogin }
}
