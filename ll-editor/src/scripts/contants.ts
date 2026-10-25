// @ts-nocheck
let MAGIC_API_VERSION_TEXT = (import.meta.env && import.meta.env.VITE_MA_VERSION) || '2.3.0'
let MAGIC_API_VERSION = 'V' + MAGIC_API_VERSION_TEXT.replace(/\./g, '_')

const contants = {
  BASE_URL: '', //UI 对应的接口路径
  WEBSOCKET_SERVER: '', //WebSocket服务地址
  SERVER_URL: '', //接口对应的路径
  AUTO_SAVE: true, // 是否自动保存
  DECORATION_TIMEOUT: 10000,
  API_DEFAULT_METHOD: 'GET',
  MAGIC_API_VERSION_TEXT,
  MAGIC_API_VERSION,
  HEADER_REQUEST_SESSION: 'Magic-Request-Session',
  HEADER_REQUEST_BREAKPOINTS: 'Magic-Request-Breakpoints',
  HEADER_RESPONSE_MAGIC_CONTENT_TYPE: 'ma-content-type',
  HEADER_APPLICATION_STREAM: 'application/octet-stream',
  HEADER_CONTENT_DISPOSITION: 'ma-content-disposition',
  HEADER_MAGIC_TOKEN: 'magic-token',
  HEADER_MAGIC_TOKEN_VALUE: 'unauthorization',
  CLIENT_ID: '', // WebSocket 登录握手使用的客户端标识（16 位十六进制随机串）
  IGNORE_VERSION: false, // 是否跳过后端版本一致性校验（宿主 Config.ignoreVersion 或后端 config.json 可开启）
  RECENT_OPENED_TAB: 'recent_opened_tab',
  RECENT_OPENED: 'recent_opened',
  RESPONSE_CODE_DEBUG: 1000,
  RESPONSE_CODE_SCRIPT_ERROR: -1000,
  RESPONSE_NO_PERMISSION: -10,
  LOG_MAX_ROWS: Infinity,
  DEFAULT_EXPAND: true,
  JDBC_DRIVERS: [],
  DATASOURCE_TYPES: [],
  OPTIONS: [],
  EDITOR_FONT_FAMILY: 'JetBrainsMono, Consolas, "Courier New",monospace, 微软雅黑',
  EDITOR_FONT_SIZE: 14,
  config: {}
}

export default contants
