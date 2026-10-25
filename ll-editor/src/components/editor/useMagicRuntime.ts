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
// magic-api 运行时样式（含 --background 主题变量与 .ll-container 基础样式）
import '@/assets/index.css'
import '@/assets/iconfont/iconfont.css'
import bus from '@/scripts/bus'
import request from '@/api/request'
import contants from '@/scripts/contants'
import LinlanWebSocket from '@/scripts/websocket'
import store from '@/scripts/store'
import Key from '@/scripts/hotkey'
import { getQueryVariable, replaceURL } from '@/scripts/utils'
import { defineTheme } from '@/scripts/monaco/theme'
import defaultTheme from '@/scripts/monaco/default-theme'
import darkTheme from '@/scripts/monaco/dark-theme'
import grayNewTheme from '@/scripts/monaco/gray-new-theme'
import darkNewTheme from '@/scripts/monaco/dark-new-theme'
import JavaClass from '@/scripts/monaco/java-class'
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
      // 后端版本号写入 constants：顶栏展示与「版本检测」均以此为准（对齐官方 D.MAGIC_API_VERSION_TEXT）
      // contants 非响应式，另发 bus 事件通知顶栏刷新版本显示
      if (response.version) {
        contants.MAGIC_API_VERSION_TEXT = String(response.version)
        contants.MAGIC_API_VERSION = 'V' + String(response.version).replace(/\./g, '_')
        bus.$emit('version', contants.MAGIC_API_VERSION_TEXT)
      }
      // 后端 config.json 可注入自定义主题（对齐官方：Object.keys(config.themes).forEach(defineTheme)）
      if (response.themes) Object.keys(response.themes).forEach((name) => defineTheme(name, response.themes[name]))
      // 后端 config.json 可显式开启/关闭版本校验；未提供时保留宿主 Config.ignoreVersion 设置
      if (response.ignoreVersion !== undefined) contants.IGNORE_VERSION = !!response.ignoreVersion
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

  // ===== 版本检测（对齐官方 magic-editor checkUpdate）：查询官方最新版本，非最新则提示 =====
  // const IGNORE_VERSION = 'ignore_version'
  // function checkUpdate(): void {
  //   const cfg = contants.config as any
  //   if (cfg?.checkUpdate === false) return
  //   const url =
  //     'https://linlan.net/ll_editor_api/latest?group=net.linlan&artifactId=java-magic-api&from=' + contants.MAGIC_API_VERSION_TEXT
  //   fetch(url)
  //     .then((r) => (r.status === 200 ? r.json() : null))
  //     .then((json: any) => {
  //       if (!json) return
  //       if (json.version && json.version !== 'unknown' && cfg?.version !== json.version) {
  //         bus.$emit('status', '版本检测完毕，最新版本为：' + json.version + ',建议更新！！')
  //         if (json.version !== store.get(IGNORE_VERSION)) {
  //           ;(modal as any).linlanConfirm('检测到已有新版本' + json.version + '，是否更新？', {
  //             title: '提示',
  //             ok: '更新日志',
  //             cancel: '不再提醒',
  //             onOk: () => window.open('http://www.ssssssss.org/magic-api/changelog.html'),
  //             onCancel: () => store.set(IGNORE_VERSION, json.version)
  //           })
  //         }
  //       } else {
  //         bus.$emit('status', '版本检测完毕，当前已是最新版')
  //       }
  //     })
  //     .catch(() => {})
  // }

  // ===== WebSocket：登录成功后创建（对齐 magic-editor.vue L108-118，console 由 BASE_URL 推导） =====
  // 16 位十六进制随机串（对应官方 zi(16)，用于 WS 登录握手的 CLIENT_ID）
  function randomHex(len: number): string {
    let s = ''
    while (s.length < len) s += Math.floor(Math.random() * 16).toString(16)
    return s.slice(0, len)
  }
  // WS 连接建立后发送登录握手 login,<token>,<clientId>（对齐官方 Se.OPEN -> T.send(Se.LOGIN, ...)）
  // 缺少该握手时后端不会把客户端登记进在线列表，也就收不到 online_users / user_login 广播
  function onWsOpen(): void {
    contants.CLIENT_ID = randomHex(16)
    bus.$emit('message', 'login', [contants.HEADER_MAGIC_TOKEN_VALUE, contants.CLIENT_ID].join(','))
  }
  function onRefreshToken(token: string): void {
    if (token) contants.HEADER_MAGIC_TOKEN_VALUE = token
  }

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
    bus.$on('ws_open', onWsOpen)
    bus.$on('ws_refresh_token', onRefreshToken)
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
  // 左侧工具栏索引：0 文件 / 1 接口 / 2 函数 / 3 数据源（对齐 LLEditor toolbars 定义）
  function searchOpen(item: any): void {
    if (item.type === 1) {
      deps.toolbarIndex.value = 1
      deps.editorMode.value = 1
      deps.apiListRef.value?.position?.(item.id)
    } else if (item.type === 2) {
      deps.toolbarIndex.value = 2
      deps.editorMode.value = 2
      deps.functionListRef.value?.position?.(item.id)
    }
  }
  function onLogout(): void { showLogin.value = true }
  function onShowLogin(): void { showLogin.value = true }
  function onPositionApi(id: any): void {
    deps.toolbarIndex.value = 1
    deps.editorMode.value = 1
    deps.apiListRef.value?.position?.(id)
  }
  function onPositionFunction(id: any): void {
    deps.toolbarIndex.value = 2
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
    defineTheme('gray-new', grayNewTheme)
    defineTheme('dark-new', darkNewTheme)
  }

  /** onMounted 阶段：快捷键 / 配置加载 / 登录 / bus 订阅 / URL 定位 */
  function mount(): void {
    window.onbeforeunload = () => '系统可能不会保存您所做的更改'
    bindKey()
    if (contants.BASE_URL) {
      loading.value = true
      JavaClass.initClasses().then(() => JavaClass.initImportClass()).catch(() => {})
      loadConfig().then(() => { 
        hideLoading(); 
        login(); 
        //checkUpdate() 
      })
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
    bus.$off('ws_open', onWsOpen)
    bus.$off('ws_refresh_token', onRefreshToken)
    websocket.value?.close()
    websocket.value = null
  }

  return { loading, showLogin, init, mount, dispose, onLogin }
}
