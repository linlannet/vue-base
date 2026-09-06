# Events (LLEditorEvents)

Subscribe via `editor.bus.on(event, handler)`, unsubscribe via `bus.off`. The handler's return value is an unsubscribe function.

## Event table

| Event | Payload type | Fired when |
|---|---|---|
| `doc:opened` | `EditorDoc` | A document is opened / focused |
| `doc:changed` | `EditorDoc` | Document content changes |
| `doc:saved` | `EditorDoc` | Document save completes |
| `doc:closed` | `{ id: string }` | A document is closed |
| `tab:switched` | `{ id: string }` | Tab switches |
| `theme:changed` | `string` | Theme switches (`'light'` / `'dark'`) |
| `language:registered` | `string` | A new language is registered (payload is the language id) |
| `breakpoint:changed` | `Breakpoint[]` | Breakpoints change |
| `run:started` | `{ docId: string }` | (P2 reserved) run starts |
| `run:output` | `string` | (P2 reserved) run output |
| `run:ended` | `RunResult` | (P2 reserved) run ends |

## Example

```ts
const off = editor.bus.on('doc:saved', (doc) => {
  console.log(`saved: ${doc.name}`)
})

// remove the listener
off()
```

## Typed bus

`bus` is an `EventBus<LLEditorEvents>` instance providing type-safe `on` / `off` / `emit`:

```ts
editor.bus.emit('theme:changed', 'dark')
```
