# Introduction

`ll-editor` = **a plugin-based code editor core + pluggable runtime + plugin marketplace**.

- The core borrows magic-editor's Monaco multi-tab editor (business logic stripped out).
- The architecture uses **layering (core / languages / editor / runtime / storage / plugin-api) + whitelisted exports + plugin/tool registry**.
- The ecosystem borrows deepseek harness's **Manifest + plugin marketplace** distribution model.

## Core features

| Feature | Description |
|---|---|
| Syntax highlight | Monaco-based, built-in JS/TS/JSON/HTML/CSS/Markdown |
| Multi-tab | Multiple document tabs with independent models |
| Storage | `StorageProvider` abstraction; LocalStorage / IndexedDB by default |
| Themes | Light / dark (`vs` / `vs-dark`), switchable at runtime |
| Breakpoints | Glyph margin breakpoint decorations (P2 debug linkage) |
| i18n | Editor UI `locale` supports `zh-CN` / `en` |
| Plugins | `LLEditorAPI` whitelisted surface, contribution points reserved (P3) |

## Layered architecture

```
ll-editor/
├── core/          LLEditor engine, EventBus, lifecycle (no UI dependency)
├── languages/     Language registry + Monaco highlight grammars
├── editor/        Monaco wrapper: tabs, breakpoint decorations, themes
├── runtime/       Debug/run engine (P2 DebugAdapter)
├── storage/       Storage providers (local / indexeddb / rest)
├── plugin-api/    Stable API exposed to plugins (whitelist)
└── ui/            Vue3 components (demo only, not in the npm export whitelist)
```

**Dependency direction (enforced by tests)**: `ui`/`plugin-runtime` may depend on `core/editor/languages/storage/runtime/plugin-api`; `plugin-api` depends only on `core` types.

## Relationship with Monaco

`ll-editor` keeps Monaco inside `editor/` and `languages/`. Monaco handles the "editor" itself (input, highlight, completion, diagnostics); file tree, tabs, storage, debugging and the plugin system are built by `ll-editor`'s layers. Swapping to CodeMirror would, in theory, only touch those two layers.

> Monaco Editor is released under the **MIT License** (compatible with this project) — free for commercial / closed-source use, only the copyright notice must be retained.

## License

MIT. See `LICENSE` at the repository root.
