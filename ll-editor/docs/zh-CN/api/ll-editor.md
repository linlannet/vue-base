# LLEditor

框架无关的编辑器编排器（位于 `core/LLEditor.ts`）。组合 `languages` + `storage` + `editor host` + `tabs` + 事件总线，不依赖 Vue/UI。

## 构造

```ts
new LLEditor(container: HTMLElement, options?: LLEditorOptions)
```

| 参数 | 说明 |
|---|---|
| `container` | 挂载编辑器 DOM 容器 |
| `options` | 见 [配置参考](/zh-CN/guide/configuration) |

构造时会注册内置语言并执行 `options.initialDocs` 的打开。

## 实例属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `bus` | `EventBus<LLEditorEvents>` | 类型化事件总线 |
| `languages` | `LanguageRegistry` | 语言注册表 |

## 方法

| 方法 | 签名 | 说明 |
|---|---|---|
| `open` | `(doc: EditorDoc) => void` | 打开或聚焦文档，发射 `doc:opened` / `tab:switched` |
| `load` | `(id: string) => Promise<EditorDoc \| null>` | 从存储加载并打开 |
| `save` | `() => Promise<void>` | 保存当前活动文档，发射 `doc:saved` |
| `saveAs` | `(doc: EditorDoc) => Promise<void>` | 另存为指定文档 |
| `list` | `() => Promise<DocSummary[]>` | 列出已存储文档摘要 |
| `close` | `(id: string) => void` | 关闭文档，发射 `doc:closed` |
| `switch` | `(id: string) => void` | 切换标签，发射 `tab:switched` |
| `setTheme` | `(theme: 'light' \| 'dark') => void` | 切换主题，发射 `theme:changed` |
| `registerLanguage` | `(info: LanguageInfo) => void` | 注册语言，发射 `language:registered` |
| `registerDebugAdapter` | `(adapter: DebugAdapter) => void` | 注册调试适配器（P2） |
| `setBreakpoints` | `(bps: Breakpoint[]) => void` | 设置断点，发射 `breakpoint:changed` |
| `getPluginApi` | `() => LLEditorAPI` | 获取插件稳定 API（P3 入口） |
| `dispose` | `() => void` | 释放编辑器与总线 |

## 示例

```ts
const editor = new LLEditor(el, { storage: { type: 'local' } })
editor.open({ id: 'a', name: 'a.ts', language: 'typescript', content: 'const x=1', updatedAt: Date.now() })
editor.setTheme('dark')
await editor.save()
editor.dispose()
```
