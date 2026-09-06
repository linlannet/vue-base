# 配置参考

`LLEditor` 的所有行为均通过 `LLEditorOptions` 注入，**禁止硬编码环境 / URL**。

## LLEditorOptions

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `storage` | `StorageOptions` | `undefined` | 存储后端配置 |
| `defaultLanguage` | `string` | `undefined` | 默认语言 |
| `defaultTheme` | `'light' \| 'dark'` | `'light'` | 默认主题 |
| `initialDocs` | `EditorDoc[]` | `[]` | 初始打开的文档 |
| `showSidebar` | `boolean` | `true` | 是否显示左侧资源树 |
| `showBottomPanel` | `boolean` | `true` | 是否显示底部面板（P2 输出/变量/问题） |
| `locale` | `'zh-CN' \| 'en'` | `'zh-CN'` | 界面区域语言 |
| `plugins` | `unknown[]` | `[]` | 宿主注入的扩展点（P3 也可运行时注册） |

### StorageOptions

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | `'local' \| 'indexeddb' \| 'rest'` | 存储类型 |
| `baseURL` | `string` | `rest` 类型时的基址（通过 config 注入） |

## 主题

```ts
editor.setTheme('dark')   // 切换为 vs-dark
editor.setTheme('light') // 切换为 vs
```

主题变化会发射 `theme:changed` 事件。

## 多标签

```ts
editor.open(doc)        // 打开或聚焦文档
editor.switch(id)       // 切换标签
editor.close(id)        // 关闭文档
editor.load(id)         // 从存储加载并打开
```

## 存储后端

```ts
// LocalStorage（默认轻量）
new LLEditor(el, { storage: { type: 'local' } })

// IndexedDB（大文档更稳）
new LLEditor(el, { storage: { type: 'indexeddb' } })

// REST（需宿主提供后端，baseURL 通过 config 注入）
new LLEditor(el, { storage: { type: 'rest', baseURL: '/api/docs' } })
```

保存 / 列出：

```ts
await editor.save()          // 保存当前活动文档
const all = await editor.list() // 列出已存储文档摘要
```

## 断点（P2 启用）

```ts
editor.setBreakpoints([
  { docId: 'demo', line: 3, enabled: true }
])
```

## 国际化

通过 `locale` 配置界面语言：

```ts
new LLEditor(el, { locale: 'en' }) // 英文界面
```
