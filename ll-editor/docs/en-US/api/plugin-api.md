# Plugin API (LLEditorAPI)

The **stable whitelist API** exposed to plugins (in `plugin-api/api.ts`). It depends only on `core` types and must not depend on concrete plugin / UI implementations, preventing plugins from touching private state.

Obtain it via `editor.getPluginApi()`.

## Interface

| Method | Signature | Description |
|---|---|---|
| `registerLanguage` | `(info: LanguageInfo) => void` | Register a language |
| `registerDebugAdapter` | `(adapter: DebugAdapter) => void` | Register a debug adapter |
| `getActiveDoc` | `() => EditorDoc \| undefined` | Get the active document |
| `listDocs` | `() => EditorDoc[]` | List opened documents |
| `on` | `(event: string, cb: (payload: unknown) => void) => () => void` | Subscribe; returns an unsubscribe fn |
| `off` | `(event: string, cb: (payload: unknown) => void) => void` | Unsubscribe |
| `emit` | `(event: string, payload: unknown) => void` | Emit an event |
| `registerCommand?` | `(id: string, handler: (...args: unknown[]) => unknown) => void` | Reserved: register command (P3) |
| `registerView?` | `(id: string, mount: (el: HTMLElement) => void) => void` | Reserved: register view (P3) |
| `setBreakpoints?` | `(bps: Breakpoint[]) => void` | Reserved: set breakpoints |

## Example

```ts
export function activate(ctx: { api: LLEditorAPI }) {
  ctx.api.registerLanguage({ id: 'python', label: 'Python', monacoLanguage: 'python' })
  const off = ctx.api.on('doc:saved', (doc) => {
    console.log('plugin got saved:', (doc as { name: string }).name)
  })
  // call off() on deactivate
}
```

> Note: the P3 plugin system (`PluginHost` / `PluginManifest`) will be built on top of this API, providing `activate` / `deactivate` lifecycle and contribution-point declarations.
