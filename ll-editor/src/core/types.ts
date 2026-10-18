/**
 * 核心类型定义（稳定白名单的一部分，禁止依赖 UI / 插件内部实现）
 */

/** 编辑器文档模型 */
export interface EditorDoc {
  id: string
  name: string
  language: string
  content: string
  updatedAt: number
  meta?: Record<string, unknown>
}

/** 文档列表项（用于资源树/列表展示，避免回传全量 content） */
export type DocSummary = Pick<EditorDoc, 'id' | 'name' | 'language' | 'updatedAt'>

/** 语言注册信息 */
export interface LanguageInfo {
  id: string
  label: string
  /** monaco 内置 languageId 或自定义 grammar 标识 */
  monacoLanguage?: string
  extensions?: string[]
  defaultContent?: string
}

/** 主题信息（P1 内置 light/dark，P3 可插件扩展） */
export interface ThemeInfo {
  id: string
  label: string
  /** monaco 内置主题名 或 'vs'/'vs-dark' 等价物 */
  monacoTheme: string
}

/** 断点（P2 实际启用，P1 仅数据结构与装饰） */
export interface Breakpoint {
  docId: string
  line: number
  enabled: boolean
}

/** 运行选项（P2 使用，P1 预留） */
export interface RunOptions {
  entryDocId?: string
  args?: Record<string, unknown>
}

/** 运行结果（P2 使用，P1 预留） */
export interface RunResult {
  exitCode: number
  output: string
  vars?: Record<string, unknown>
}

/** 诊断严重级别（语法/类型纠错扩展点） */
export type DiagnosticSeverity = 'error' | 'warning' | 'info'

/** 编辑器内问题诊断（Problems 面板 + monaco markers） */
export interface Diagnostic {
  docId: string
  line: number
  column: number
  severity: DiagnosticSeverity
  message: string
  source?: string
}

/** 知识库存储方式（P3：本地文件 / 数据库后端；当前仅作为元数据保存） */
export type KBStorageType = 'file' | 'database'

/** 知识库文件类型 */
export type KBFileKind = 'text' | 'code' | 'md'

/** 知识库文件（可为普通文本、markdown 或代码，如 python） */
export interface KBFile {
  id: string
  name: string
  /** monaco languageId，如 markdown / python / plaintext */
  language: string
  kind: KBFileKind
  content: string
}

/** 知识库（类似 d1/d2/d3；可配置多个，并选择保存方式） */
export interface KnowledgeBase {
  id: string
  name: string
  storage: KBStorageType
  files: KBFile[]
}

/** 调试事件类型（P2 沙箱/断点联动） */
export type DebugEvent = 'output' | 'breakpoint' | 'error' | 'end' | 'paused' | 'resumed'

/** 调试适配器抽象（P2 实现 WorkerDebugAdapter；P3 真实后端通道以插件提供） */
export interface DebugAdapter {
  readonly language: string
  run(doc: EditorDoc, opts?: RunOptions): Promise<RunResult>
  on(event: DebugEvent, cb: (payload: unknown) => void): () => void
  setBreakpoints?(docId: string, lines: number[]): void
  resume?(): void
}

/** LLEditor 配置（全部通过 config 注入，禁止硬编码环境/URL） */
export interface LLEditorOptions {
  /** 存储后端配置 */
  storage?: StorageOptions
  /** 默认语言 */
  defaultLanguage?: string
  /** 默认主题 */
  defaultTheme?: string
  /** 初始打开的文档 */
  initialDocs?: EditorDoc[]
  /** 是否显示左侧资源树 */
  showSidebar?: boolean
  /** 是否显示底部面板（P2 输出/变量/问题） */
  showBottomPanel?: boolean
  /** 区域语言 */
  locale?: 'zh-CN' | 'en'
  /** 宿主注入的扩展点（P3 也可运行时注册） */
  plugins?: unknown[]
  /** 初始断点配置（P2 调试） */
  breakpoints?: Breakpoint[]
  /** 初始知识库（P3 模式，知识库/接口/函数三者之一） */
  knowledgeBases?: KnowledgeBase[]
  /** magic-api 工作台后端前缀（默认 /magic-api/rest/web，dev 走 vite 代理） */
  baseURL?: string
  /** 运行接口的后端根（默认由 baseURL 去掉 /rest/web 推导） */
  serverURL?: string
  /** 前端版本号文本（用于前后端版本一致性校验） */
  magicApiVersionText?: string
  /** 跳过后端版本校验 */
  ignoreVersion?: boolean
}

/** 存储后端配置 */
export interface StorageOptions {
  type: 'local' | 'indexeddb' | 'rest'
  /** rest 类型时的基址（通过 config 注入，不硬编码） */
  baseURL?: string
}
