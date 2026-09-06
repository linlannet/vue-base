# ll-editor

> A plugin-based code editor core + pluggable runtime + plugin marketplace (renamed from `ss-editor`).

## Description

`ll-editor` is a **framework-agnostic** code editor core built on [Monaco Editor](https://github.com/microsoft/monaco-editor):

- The **core** borrows magic-editor's Monaco multi-tab editor (business logic stripped out).
- The **architecture** borrows aieditor's layering + whitelisted exports + plugin/tool registry.
- The **ecosystem** borrows deepseek harness's Manifest + plugin marketplace distribution model.

The core `LLEditor` is a plain TypeScript orchestrator (in `core/`) with no Vue/UI dependency, making it easy to embed in any host (e.g. RuoYi-AI).

## Software Architecture

Layers and dependency guards (enforced by `tests/architecture/DirectoryBoundaries.test.ts`):

```
ll-editor/
├── core/           LLEditor engine, EventBus, lifecycle (no UI dependency)
├── languages/      Language registry + Monaco highlight grammars
├── editor/         Monaco wrapper: tabs, breakpoint decorations, themes
├── runtime/        Debug/run engine (P2 DebugAdapter)
├── storage/        Storage providers (local / indexeddb / rest)
├── plugin-api/     Stable API exposed to plugins (whitelist)
├── plugins/        Built-in plugins (P3)
├── plugin-runtime/ Plugin host (P3)
├── plugin-market/  Plugin marketplace (P3)
└── ui/             Vue3 components (demo only, not in the npm export whitelist)
```

**Monaco license**: Monaco Editor is released under the **MIT License** (free for commercial / closed-source use, only the copyright notice must be retained). This project externalizes `monaco-editor` and `vue`; `dist/ll-editor.*` is only ~11KB, while the host bears Monaco's own size. See [Technical Design](./ai-pilot/poc/TASK-20260906-01/design.md) §2.1.

## Installation

```bash
npm install ll-editor
# or
pnpm add ll-editor
```

> The runtime depends on `monaco-editor`, which the host must provide (the package externalizes it).

## Usage (minimal example)

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

editor.bus.on('doc:saved', (doc) => console.log('saved', doc.name))
await editor.save()
```

Full API in the [docs site](./docs/) (bilingual zh/en): `LLEditor` / Plugin API / Events.

## Development & Build

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (Monaco fully bundled, best experience, `http://localhost:5173/`) |
| `npm run build:lib` | Library build (vue-tsc type check + Vite output `dist/ll-editor.{js,cjs}` + `style.css`) |
| `npm run docs` / `docs:build` | VitePress bilingual docs site dev / build |
| `npx vite preview --port 4173` | Preview the built output (clean localhost; copy/paste/clipboard work) |

### Static smoke page

`public/index.html` (referencing `./ll-editor.js` + `./style.css`) is copied by Vite into `dist/index.html` and can be opened with a static server:

```bash
npm run build:lib
npx serve dist            # open http://localhost:3000/
# or npx vite preview --port 4173
```

> **Verification notes**
> - The root `index.html` is the Vite dev entry (imports `/src/demo/main.ts`); do NOT serve it statically via `npx serve .`, or the uncompiled TS/Vue renders a blank page.
> - Must be served over a local HTTP server — do not open via `file://` (ES Module CORS).
> - Clipboard/shortcuts require a secure context (`localhost` / `https`); **do not use the JetBrains built-in browser preview `localhost:63342`**, whose injected scripts intercept Monaco's Ctrl+C/V/Z.

## Contribution

1. Fork the repository
2. Create a `Feat_xxx` branch
3. Commit your code (run `npm run build:lib` and `npm test` first is recommended)
4. Create a Pull Request

## Related docs

- Technical design: `ai-pilot/poc/TASK-20260906-01/design.md`
- Test execution log: `ai-pilot/poc/TASK-20260906-01/test-execution-log.md`
- Docs source: `docs/` (VitePress, bilingual zh/en)

## License

MIT © 2026 ll-editor
