import { EventBus, type LLEditorEvents } from './EventBus'
import type { EditorDoc, LLEditorOptions, Breakpoint, DebugAdapter } from './types'
import { LanguageRegistry } from '../languages/registry'
import { registerBuiltinLanguages } from '../languages/builtin'
import { createStorage, type StorageProvider } from '../storage'
import { EditorHost, TabManager, BreakpointManager } from '../editor'
import { createPluginApi, type LLEditorAPI } from '../plugin-api/api'

/**
 * ll-editor 引擎编排器（框架无关，类似 aieditor 的 AiEditor）。
 * 组合：languages + storage + editor host + tabs + 事件总线；不依赖 Vue/UI。
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

  constructor(container: HTMLElement, options: LLEditorOptions = {}) {
    registerBuiltinLanguages(this.languages)
    this.storage = createStorage(options.storage)
    this.host = new EditorHost(container, {
      theme: options.defaultTheme === 'dark' ? 'vs-dark' : 'vs'
    })
    this.tabs = new TabManager(this.host)
    this.breakpoints = new BreakpointManager(this.host)
    this.api = createPluginApi({
      languages: this.languages,
      bus: this.bus,
      tabs: this.tabs,
      registerDebugAdapter: (a) => this.debugAdapters.set(a.language, a)
    })
    this.host.onContentChange((doc) => {
      this.tabs.update(doc)
      this.bus.emit('doc:changed', doc)
    })
    for (const doc of options.initialDocs ?? []) this.open(doc)
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

  registerLanguage(info: EditorDoc extends never ? never : Parameters<LLEditorAPI['registerLanguage']>[0]): void {
    this.languages.register(info)
    this.bus.emit('language:registered', info.id)
  }

  registerDebugAdapter(adapter: DebugAdapter): void {
    this.debugAdapters.set(adapter.language, adapter)
  }

  setBreakpoints(bps: Breakpoint[]): void {
    this.breakpoints.set(bps)
    this.bus.emit('breakpoint:changed', bps)
  }

  /** 供插件获取稳定 API（P3 插件系统入口） */
  getPluginApi(): LLEditorAPI {
    return this.api
  }

  dispose(): void {
    this.bus.dispose()
    this.host.dispose()
  }
}
