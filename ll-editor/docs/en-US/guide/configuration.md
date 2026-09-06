# Configuration

All `LLEditor` behavior is injected via `LLEditorOptions` — **no hard-coded environment / URL**.

## LLEditorOptions

| Field | Type | Default | Description |
|---|---|---|---|
| `storage` | `StorageOptions` | `undefined` | Storage backend config |
| `defaultLanguage` | `string` | `undefined` | Default language |
| `defaultTheme` | `'light' \| 'dark'` | `'light'` | Default theme |
| `initialDocs` | `EditorDoc[]` | `[]` | Documents opened on init |
| `showSidebar` | `boolean` | `true` | Show left resource tree |
| `showBottomPanel` | `boolean` | `true` | Show bottom panel (P2 output/vars/problems) |
| `locale` | `'zh-CN' \| 'en'` | `'zh-CN'` | UI locale |
| `plugins` | `unknown[]` | `[]` | Host-injected extension points (P3 may register at runtime) |

### StorageOptions

| Field | Type | Description |
|---|---|---|
| `type` | `'local' \| 'indexeddb' \| 'rest'` | Storage type |
| `baseURL` | `string` | Base URL when `type` is `rest` (injected via config) |

## Themes

```ts
editor.setTheme('dark')   // switch to vs-dark
editor.setTheme('light') // switch to vs
```

Theme changes emit the `theme:changed` event.

## Tabs

```ts
editor.open(doc)        // open or focus a document
editor.switch(id)       // switch tab
editor.close(id)        // close document
editor.load(id)         // load from storage and open
```

## Storage backends

```ts
// LocalStorage (default, lightweight)
new LLEditor(el, { storage: { type: 'local' } })

// IndexedDB (better for large docs)
new LLEditor(el, { storage: { type: 'indexeddb' } })

// REST (requires a host backend; baseURL injected via config)
new LLEditor(el, { storage: { type: 'rest', baseURL: '/api/docs' } })
```

Save / list:

```ts
await editor.save()          // save the active document
const all = await editor.list() // list stored doc summaries
```

## Breakpoints (P2)

```ts
editor.setBreakpoints([
  { docId: 'demo', line: 3, enabled: true }
])
```

## Internationalization

Set the UI language via `locale`:

```ts
new LLEditor(el, { locale: 'en' }) // English UI
```
