import { EventBus, type LLEditorEvents } from './EventBus'
import type { EditorDoc, LLEditorOptions, Breakpoint, DebugAdapter, Diagnostic } from './types'
import { LanguageRegistry } from '../languages/registry'
import { registerBuiltinLanguages } from '../languages/builtin'
import { createStorage, type StorageProvider } from '../storage'
import { EditorHost, TabManager, BreakpointManager } from '../editor'
import { createPluginApi, type LLEditorAPI } from '../plugin-api/api'
import { ConsoleModel, type ConsoleLevel } from '../runtime/console'
import { WorkerDebugAdapter } from '../runtime/WorkerDebugAdapter'
import { MockDebugAdapter, pythonMockExecutor } from '../runtime'
import { lintCode } from '../runtime/lint'

/**
 * ll-editor 引擎编排器（框架无关，类似 aieditor 的 AiEditor）。
 * 组合：languages + storage + editor host + tabs + 事件总线；不依赖 Vue/UI。
 * P2 起内置基于前端沙箱（Web Worker）的调试/运行能力。
 */
export class LLEditor {
  readonly bus = new EventBus<LLEditorEvents>()
  readonly languages = new LanguageRegistry()
  private readonly host: EditorHost
  private readonly tabs: TabManager
  private readonly breakpoints: BreakpointManager
  private readonly storage: StorageProvider
  private readonly debugAdapters = new Map<string, DebugAdapter>()
  private readonly api: LLEditorAPI

  // P2 调试/运行运行时状态
  private readonly consoleModel = new ConsoleModel()
  private readonly lintDiags: Diagnostic[] = []
  private readonly runtimeDiags: Diagnostic[] = []
  private diagnostics: Diagnostic[] = []
  private readonly debugState = { running: false, paused: false }
  private variables: Record<string, unknown> = {}

  constructor(container: HTMLElement, options: LLEditorOptions = {}) {
    registerBuiltinLanguages(this.languages)
    this.storage = createStorage(options.storage)
    this.host = new EditorHost(container, {
      theme: options.defaultTheme === 'dark' ? 'vs-dark' : 'vs'
    })
    this.tabs = new TabManager(this.host)
    this.breakpoints = new BreakpointManager(this.host, (bps) => this.onBreakpointsChanged(bps))
    this.api = createPluginApi({
      languages: this.languages,
      bus: this.bus,
      tabs: this.tabs,
      registerDebugAdapter: (a) => this.debugAdapters.set(a.language, a),
      run: () => this.run(),
      continueDebug: () => this.continueDebug(),
      stepDebug: () => this.stepDebug(),
      toggleBreakpoint: (line) => this.toggleBreakpoint(line),
      getConsole: () => this.consoleModel
    })
    this.host.onContentChange((doc) => {
      this.tabs.update(doc)
      this.bus.emit('doc:changed', doc)
      this.runLint(doc)
    })
    this.host.onGlyphMarginClick((line) => this.toggleBreakpoint(line))
    for (const doc of options.initialDocs ?? []) this.open(doc)
    if (options.breakpoints?.length) this.setBreakpoints(options.breakpoints)
  }

  /** 打开（或聚焦）一份文档 */
  open(doc: EditorDoc): void {
    this.tabs.open(doc)
    this.bus.emit('doc:opened', doc)
    this.bus.emit('tab:switched', { id: doc.id })
  }

  async load(id: string): Promise<EditorDoc | null> {
    const doc = await this.storage.load(id)
    if (doc) this.open(doc)
    return doc
  }

  async save(): Promise<void> {
    const active = this.tabs.active()
    if (!active) return
    const doc: EditorDoc = { ...active, content: this.host.getValue(active.id) ?? active.content, updatedAt: Date.now() }
    await this.storage.save(doc)
    this.tabs.update(doc)
    this.bus.emit('doc:saved', doc)
  }

  async saveAs(doc: EditorDoc): Promise<void> {
    await this.storage.save(doc)
    this.tabs.update(doc)
    this.bus.emit('doc:saved', doc)
  }

  async list(): ReturnType<StorageProvider['list']> {
    return this.storage.list()
  }

  close(id: string): void {
    this.tabs.close(id)
    this.bus.emit('doc:closed', { id })
  }

  switch(id: string): void {
    this.tabs.switch(id)
    this.bus.emit('tab:switched', { id })
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.host.setTheme(theme === 'dark' ? 'vs-dark' : 'vs')
    this.bus.emit('theme:changed', theme)
  }

  registerLanguage(info: Parameters<LLEditorAPI['registerLanguage']>[0]): void {
    this.languages.register(info)
    this.bus.emit('language:registered', info.id)
  }

  registerDebugAdapter(adapter: DebugAdapter): void {
    this.debugAdapters.set(adapter.language, adapter)
  }

  setBreakpoints(bps: Breakpoint[]): void {
    const byDoc = new Map<string, number[]>()
    for (const b of bps) {
      if (!b.enabled) continue
      const arr = byDoc.get(b.docId) ?? []
      arr.push(b.line)
      byDoc.set(b.docId, arr)
    }
    byDoc.forEach((lines, docId) => this.breakpoints.setAll(docId, lines))
    this.bus.emit('breakpoint:changed', this.breakpoints.list())
  }

  // ---- 调试/运行（P2） ----

  /** 当前激活文档 */
  getActiveDoc(): EditorDoc | undefined {
    return this.tabs.active()
  }

  private langKey(language: string): string {
    if (language === 'typescript' || language === 'ts') return 'typescript'
    if (language === 'javascript' || language === 'js') return 'javascript'
    // 非 JS/TS（如 python）：走主线程模拟适配器（P3 可换真实后端通道）
    return 'mock:' + language
  }

  /** 取（按需懒创建）调试适配器；js/ts 走 Web Worker 沙箱，其余走主线程模拟执行器 */
  private getAdapter(language: string): DebugAdapter {
    const key = this.langKey(language)
    let adapter = this.debugAdapters.get(key)
    if (!adapter) {
      if (key.startsWith('mock:')) {
        const lang = language
        adapter = new MockDebugAdapter(lang, pythonMockExecutor)
      } else {
        adapter = new WorkerDebugAdapter(key)
      }
      this.debugAdapters.set(key, adapter)
      this.wireAdapter(adapter)
    }
    return adapter
  }

  private wireAdapter(adapter: DebugAdapter): void {
    adapter.on('output', (raw) => {
      const e = raw as { level: string; text: string }
      const level = (['log', 'info', 'warn', 'error', 'debug'].includes(e.level) ? e.level : 'log') as ConsoleLevel
      this.consoleModel.add(level, e.text)
      this.bus.emit('run:output', e.text)
    })
    adapter.on('breakpoint', (raw) => {
      const e = raw as { line: number; vars?: Record<string, unknown> }
      this.debugState.running = true
      this.debugState.paused = true
      this.variables = e.vars ?? {}
      this.host.setDebugLine(e.line)
      this.bus.emit('debug:breakpoint', { line: e.line, vars: e.vars ?? {}, stack: (raw as { stack?: string }).stack })
    })
    adapter.on('error', (raw) => {
      const e = raw as Error & { line?: number }
      this.consoleModel.add('error', e.message)
      this.addRuntimeDiagnostic(e.message, e.line)
      this.bus.emit('run:error', { message: e.message, line: e.line })
    })
    adapter.on('end', (raw) => {
      const e = raw as { durationMs?: number; exitCode: number; vars?: Record<string, unknown> }
      this.debugState.running = false
      this.debugState.paused = false
      this.variables = e.vars ?? {}
      this.host.setDebugLine(undefined)
      this.consoleModel.add('info', `运行结束，exitCode=${e.exitCode}`)
      this.bus.emit('run:ended', raw as never)
    })
  }

  /** 运行当前文档 */
  run(): void {
    const doc = this.getActiveDoc()
    if (!doc) return
    const adapter = this.getAdapter(doc.language)
    const code = this.host.getValue(doc.id) ?? doc.content
    const lines = this.breakpoints.list(doc.id).map((b) => b.line)
    adapter.setBreakpoints?.(doc.id, lines)
    this.debugState.running = true
    this.debugState.paused = false
    this.consoleModel.add('info', `运行：${doc.name}`)
    this.bus.emit('run:started', { docId: doc.id })
    void adapter.run({ id: doc.id, name: doc.name, language: doc.language, content: code, updatedAt: Date.now() })
  }

  /** 断点命中后继续（F8，等价于 linlan-editor 的"继续"） */
  continueDebug(): void {
    const doc = this.getActiveDoc()
    if (!doc || !this.debugState.paused) return
    const adapter = this.debugAdapters.get(this.langKey(doc.language))
    if (!adapter) return
    this.debugState.paused = false
    this.host.setDebugLine(undefined)
    adapter.resume?.()
    this.bus.emit('debug:resumed', undefined as never)
  }

  /** 单步（前端沙箱无真实步进行，P2 退化为"继续"；P3 真实后端通道可区分） */
  stepDebug(): void {
    this.continueDebug()
  }

  /** 切换某行断点（点击左侧 glyph 边栏触发） */
  toggleBreakpoint(line: number): void {
    const doc = this.getActiveDoc()
    if (!doc) return
    this.breakpoints.toggle(doc.id, line)
  }

  private onBreakpointsChanged(bps: Breakpoint[]): void {
    const doc = this.getActiveDoc()
    if (!doc) return
    const adapter = this.getAdapter(doc.language)
    const lines = bps.map((b) => b.line)
    adapter.setBreakpoints?.(doc.id, lines)
    this.bus.emit('breakpoint:changed', this.breakpoints.list())
  }

  // ---- 诊断（Problems 面板） ----

  private runLint(doc: EditorDoc): void {
    if (doc.language !== 'javascript' && doc.language !== 'js' && doc.language !== 'typescript' && doc.language !== 'ts') {
      return
    }
    const code = this.host.getValue(doc.id) ?? doc.content
    this.lintDiags.length = 0
    for (const d of lintCode(code, doc.language, doc.id)) this.lintDiags.push(d)
    this.syncDiagnostics()
  }

  private addRuntimeDiagnostic(message: string, line?: number): void {
    const docId = this.getActiveDoc()?.id ?? ''
    this.runtimeDiags.length = 0
    this.runtimeDiags.push({ docId, line: line ?? 1, column: 1, severity: 'error', message, source: 'runtime' })
    this.syncDiagnostics()
  }

  private syncDiagnostics(): void {
    this.diagnostics = [...this.lintDiags, ...this.runtimeDiags]
    this.host.setDiagnostics(this.diagnostics)
    this.bus.emit('problems:changed', this.diagnostics)
  }

  // ---- 对外只读访问（供 UI / 插件） ----

  getConsole(): ConsoleModel {
    return this.consoleModel
  }

  getVariables(): Record<string, unknown> {
    return this.variables
  }

  getDebugState(): { running: boolean; paused: boolean } {
    return this.debugState
  }

  getDiagnostics(): Diagnostic[] {
    return this.diagnostics
  }

  /** 供插件获取稳定 API（P3 插件系统入口） */
  getPluginApi(): LLEditorAPI {
    return this.api
  }

  /** 当前激活文档的编辑器内容（供历史记录 diff 等场景） */
  getActiveValue(): string {
    const doc = this.getActiveDoc()
    if (!doc) return ''
    return this.host.getValue(doc.id) ?? doc.content ?? ''
  }

  /** 写回当前激活文档的编辑器内容（供历史记录"恢复"等场景） */
  setActiveValue(content: string): void {
    const doc = this.getActiveDoc()
    if (!doc) return
    this.host.setValue(doc.id, content)
  }

  dispose(): void {
    this.bus.dispose()
    this.host.dispose()
  }
}
