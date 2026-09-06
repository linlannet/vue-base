# 事件（LLEditorEvents）

通过 `editor.bus.on(event, handler)` 订阅，`bus.off` 取消，返回值为取消函数。

## 事件表

| 事件 | 载荷类型 | 触发时机 |
|---|---|---|
| `doc:opened` | `EditorDoc` | 打开 / 聚焦文档 |
| `doc:changed` | `EditorDoc` | 文档内容变化 |
| `doc:saved` | `EditorDoc` | 文档保存完成 |
| `doc:closed` | `{ id: string }` | 文档关闭 |
| `tab:switched` | `{ id: string }` | 标签切换 |
| `theme:changed` | `string` | 主题切换（`'light'` / `'dark'`） |
| `language:registered` | `string` | 新语言注册（载荷为语言 id） |
| `breakpoint:changed` | `Breakpoint[]` | 断点变化 |
| `run:started` | `{ docId: string }` | （P2 预留）运行开始 |
| `run:output` | `string` | （P2 预留）运行输出 |
| `run:ended` | `RunResult` | （P2 预留）运行结束 |

## 示例

```ts
const off = editor.bus.on('doc:saved', (doc) => {
  console.log(`已保存：${doc.name}`)
})

// 卸载监听
off()
```

## 类型化总线

`bus` 是 `EventBus<LLEditorEvents>` 实例，提供类型安全的 `on` / `off` / `emit`：

```ts
editor.bus.emit('theme:changed', 'dark')
```
