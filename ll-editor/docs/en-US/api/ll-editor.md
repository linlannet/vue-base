# LLEditor

The framework-agnostic editor orchestrator (in `core/LLEditor.ts`). It composes `languages` + `storage` + `editor host` + `tabs` + the event bus, with no Vue/UI dependency.

## Constructor

```ts
new LLEditor(container: HTMLElement, options?: LLEditorOptions)
```

| Param | Description |
|---|---|
| `container` | DOM container to mount the editor |
| `options` | See [Configuration](/en-US/guide/configuration) |

On construction it registers built-in languages and opens every `options.initialDocs`.

## Instance properties

| Property | Type | Description |
|---|---|---|
| `bus` | `EventBus<LLEditorEvents>` | Typed event bus |
| `languages` | `LanguageRegistry` | Language registry |

## Methods

| Method | Signature | Description |
|---|---|---|
| `open` | `(doc: EditorDoc) => void` | Open or focus a doc; emits `doc:opened` / `tab:switched` |
| `load` | `(id: string) => Promise<EditorDoc \| null>` | Load from storage and open |
| `save` | `() => Promise<void>` | Save active doc; emits `doc:saved` |
| `saveAs` | `(doc: EditorDoc) => Promise<void>` | Save as the given document |
| `list` | `() => Promise<DocSummary[]>` | List stored doc summaries |
| `close` | `(id: string) => void` | Close a doc; emits `doc:closed` |
| `switch` | `(id: string) => void` | Switch tab; emits `tab:switched` |
| `setTheme` | `(theme: 'light' \| 'dark') => void` | Switch theme; emits `theme:changed` |
| `registerLanguage` | `(info: LanguageInfo) => void` | Register a language; emits `language:registered` |
| `registerDebugAdapter` | `(adapter: DebugAdapter) => void` | Register a debug adapter (P2) |
| `setBreakpoints` | `(bps: Breakpoint[]) => void` | Set breakpoints; emits `breakpoint:changed` |
| `getPluginApi` | `() => LLEditorAPI` | Get the stable plugin API (P3 entry) |
| `dispose` | `() => void` | Dispose editor and bus |

## Example

```ts
const editor = new LLEditor(el, { storage: { type: 'local' } })
editor.open({ id: 'a', name: 'a.ts', language: 'typescript', content: 'const x=1', updatedAt: Date.now() })
editor.setTheme('dark')
await editor.save()
editor.dispose()
```
