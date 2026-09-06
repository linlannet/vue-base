# Getting Started

## Install

```bash
npm install ll-editor
# or
pnpm add ll-editor
```

`ll-editor`'s runtime depends on `monaco-editor`, which the host must provide (the package externalizes `monaco-editor` and `vue`).

## Minimal example (vanilla / framework-agnostic core)

```ts
import { LLEditor } from 'll-editor'
import 'll-editor/style.css'

const editor = new LLEditor(document.getElementById('app')!, {
  storage: { type: 'local' },
  defaultTheme: 'light',
  initialDocs: [
    {
      id: 'demo',
      name: 'demo.ts',
      language: 'typescript',
      content: 'const greeting: string = "hello ll-editor"\nconsole.log(greeting)\n',
      updatedAt: Date.now()
    }
  ]
})

// Listen to events
editor.bus.on('doc:opened', (doc) => console.log('opened', doc.name))
editor.bus.on('doc:saved', (doc) => console.log('saved', doc.name))

// Save the active document
await editor.save()
```

## Static bundle smoke test

After the build, `public/index.html` (referencing `./ll-editor.js` + `./style.css`) is copied by Vite into `dist/index.html` and can be opened directly with a static server:

```bash
cd ll-editor
npm run build:lib
npx serve dist          # open http://localhost:3000/  (this serves dist/index.html)
# or preview the built output (unified on port 3000):
npm run preview         # = npx vite preview --port 3000 --strictPort
```

> Notes:
> - The root `index.html` is the **Vite dev entry** (it imports `/src/demo/main.ts`). Use `npm run dev` to open it; do NOT serve it statically via `npx serve .`, or the uncompiled TS/Vue will render a blank page.
> - Must be served over a local HTTP server (`serve` / `vite preview` / `npm run dev`) — do not open via `file://` (ES Module CORS). Clipboard requires a secure context (`localhost` / `https`).
> - Do not use the JetBrains built-in browser preview (`localhost:63342`); its injected scripts intercept Monaco's Ctrl+C/V/Z.

## Verify

```bash
npm install --include=dev
npm run build:lib   # vue-tsc type check + vite library build
npm run dev         # dev server (Monaco fully bundled, best experience)
```

Next: [Framework Integration](/en-US/guide/integration) · [Configuration](/en-US/guide/configuration)
