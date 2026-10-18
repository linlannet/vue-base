import type { EditorDoc, LanguageInfo, Breakpoint, DebugAdapter } from '../core/types'
import type { EventBus, LLEditorEvents } from '../core/EventBus'
import type { ConsoleModel } from '../runtime/console'

/**
 * 暴露给插件的稳定 API（白名单，仅依赖 core 类型，禁止依赖具体插件/UI 实现）。
 * P1 提供语言/存储/事件；P2+ 提供调试/命令/视图贡献点。
 */
export interface LLEditorAPI {
  registerLanguage(info: LanguageInfo): void
  registerDebugAdapter(adapter: DebugAdapter): void
  getActiveDoc(): EditorDoc | undefined
  listDocs(): EditorDoc[]
  openDoc?(doc: EditorDoc): void
  on(event: string, cb: (payload: unknown) => void): () => void
  off(event: string, cb: (payload: unknown) => void): void
  emit(event: string, payload: unknown): void
  // P3 贡献点（预留签名，P1 不强制实现）
  registerCommand?(id: string, handler: (...args: unknown[]) => unknown): void
  registerView?(id: string, mount: (el: HTMLElement) => void): void
  setBreakpoints?(bps: Breakpoint[]): void
  // P2 调试/运行
  run?(): void
  continueDebug?(): void
  stepDebug?(): void
  toggleBreakpoint?(line: number): void
  getConsole?(): ConsoleModel
}

/**
 * 从 LLEditor 内部实例构造插件可见 API（选择性暴露，避免插件触碰私有状态）
 */
export function createPluginApi(editor: {
  languages: { register: (i: LanguageInfo) => void }
  bus: EventBus<LLEditorEvents>
  tabs: { active: () => EditorDoc | undefined; list: () => EditorDoc[]; open: (doc: EditorDoc) => void }
  registerDebugAdapter: (a: DebugAdapter) => void
  run?: () => void
  continueDebug?: () => void
  stepDebug?: () => void
  toggleBreakpoint?: (line: number) => void
  getConsole?: () => ConsoleModel
}): LLEditorAPI {
  const bus = editor.bus as unknown as {
    on: (e: string, cb: (p: unknown) => void) => () => void
    off: (e: string, cb: (p: unknown) => void) => void
    emit: (e: string, p: unknown) => void
  }
  return {
    registerLanguage: (info) => editor.languages.register(info),
    registerDebugAdapter: (a) => editor.registerDebugAdapter(a),
    getActiveDoc: () => editor.tabs.active(),
    listDocs: () => editor.tabs.list(),
    openDoc: (doc) => editor.tabs.open(doc),
    on: (e, cb) => bus.on(e, cb),
    off: (e, cb) => bus.off(e, cb),
    emit: (e, p) => bus.emit(e, p),
    run: () => editor.run?.(),
    continueDebug: () => editor.continueDebug?.(),
    stepDebug: () => editor.stepDebug?.(),
    toggleBreakpoint: (line) => editor.toggleBreakpoint?.(line),
    getConsole: () => editor.getConsole?.() as ConsoleModel
  }
}
