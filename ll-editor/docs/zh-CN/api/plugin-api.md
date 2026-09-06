# 插件 API（LLEditorAPI）

向插件暴露的**稳定白名单 API**（位于 `plugin-api/api.ts`）。仅依赖 `core` 类型，禁止依赖具体插件 / UI 实现，避免插件触碰私有状态。

通过 `editor.getPluginApi()` 获取。

## 接口

| 方法 | 签名 | 说明 |
|---|---|---|
| `registerLanguage` | `(info: LanguageInfo) => void` | 注册语言 |
| `registerDebugAdapter` | `(adapter: DebugAdapter) => void` | 注册调试适配器 |
| `getActiveDoc` | `() => EditorDoc \| undefined` | 获取当前活动文档 |
| `listDocs` | `() => EditorDoc[]` | 列出已打开文档 |
| `on` | `(event: string, cb: (payload: unknown) => void) => () => void` | 订阅事件，返回取消函数 |
| `off` | `(event: string, cb: (payload: unknown) => void) => void` | 取消订阅 |
| `emit` | `(event: string, payload: unknown) => void` | 发射事件 |
| `registerCommand?` | `(id: string, handler: (...args: unknown[]) => unknown) => void` | 预留：注册命令（P3） |
| `registerView?` | `(id: string, mount: (el: HTMLElement) => void) => void` | 预留：注册视图（P3） |
| `setBreakpoints?` | `(bps: Breakpoint[]) => void` | 预留：设置断点 |

## 示例

```ts
export function activate(ctx: { api: LLEditorAPI }) {
  ctx.api.registerLanguage({ id: 'python', label: 'Python', monacoLanguage: 'python' })
  const off = ctx.api.on('doc:saved', (doc) => {
    console.log('plugin got saved:', (doc as { name: string }).name)
  })
  // 卸载时调用 off()
}
```

> 注：P3 插件系统（`PluginHost` / `PluginManifest`）将在此 API 之上构建，提供 `activate` / `deactivate` 生命周期与贡献点声明。
