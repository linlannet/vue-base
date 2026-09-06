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
}

/** 存储后端配置 */
export interface StorageOptions {
  type: 'local' | 'indexeddb' | 'rest'
  /** rest 类型时的基址（通过 config 注入，不硬编码） */
  baseURL?: string
}
