# ll-editor

> 插件化代码编辑器内核 + 可插拔运行时 + 插件市场（由 `ss-editor` 重命名而来）。

## 介绍

`ll-editor` 是一个基于 [Monaco Editor](https://github.com/microsoft/monaco-editor) 的**框架无关**代码编辑器内核：

- **内核**借鉴 linlan-editor 的 monaco 多标签编辑器（剥离业务）。
- **架构**采用分层（core / languages / editor / runtime / storage / plugin-api）+ 白名单导出 + 插件/工具注册表。
- **生态**借鉴 deepseek harness 的 Manifest + 插件市场分发模式。

核心 `LLEditor` 是一个纯 TypeScript 编排器（位于 `core/`），不依赖 Vue/UI，便于在任意宿主（RuoYi-AI 等）中嵌入。

## 软件架构

分层与依赖护栏（被单测 `tests/architecture/DirectoryBoundaries.test.ts` 强制）：

```
ll-editor/
├── core/           LLEditor 引擎、EventBus、生命周期（不依赖 UI）
├── languages/      语言注册 + monaco 高亮 grammar
├── editor/         monaco 封装：多标签、断点装饰、主题
├── runtime/        调试/执行引擎（P2 DebugAdapter）
├── storage/        存储 Provider（local / indexeddb / rest）
├── plugin-api/     暴露给插件的稳定 API（白名单）
├── plugins/        内置插件（P3）
├── plugin-runtime/ 插件宿主（P3）
├── plugin-market/  插件市场（P3）
└── ui/             Vue3 组件（演示用，未纳入 npm 导出白名单）
```

**Monaco 协议**：Monaco Editor 采用 **MIT 协议**（可商用/闭源，仅须保留版权声明）。本工程已将 `monaco-editor` 与 `vue` external，`dist/ll-editor.*` 仅约 11KB，宿主侧承担 Monaco 本身体积。详见 [技术设计](./ai-pilot/poc/TASK-20260906-01/design.md) §2.1。

## 安装

```bash
npm install ll-editor
# 或
pnpm add ll-editor
```

> 运行时依赖 `monaco-editor`，宿主需自行提供（包已将其 external）。

## 使用（最小示例）

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

完整 API 见 [文档站](./docs/)（中英双语）：`LLEditor` / 插件 API / 事件。

## 开发与构建

| 命令 | 说明 |
|---|---|
| `npm run dev` | Vite 开发服务器（Monaco 完整打包，体验最佳，默认 `http://localhost:5173/`） |
| `npm run build:lib` | 库构建（vue-tsc 类型检查 + Vite 产出 `dist/ll-editor.{js,cjs}` + `style.css`） |
| `npm run docs` / `docs:build` | VitePress 中英双语文档站开发 / 构建 |
| `npx vite preview --port 4173` | 预览构建产物（干净 localhost，复制/粘贴/剪贴板正常） |

### 静态冒烟页

`public/index.html`（引用 `./ll-editor.js` + `./style.css`）会被 Vite 自动拷贝到 `dist/index.html`，可直接用静态服务器打开：

```bash
npm run build:lib
npx serve dist            # 打开 http://localhost:3000/
# 或 npx vite preview --port 4173
```

> **验证须知**
> - 根目录 `index.html` 是 Vite 开发入口（引用 `/src/demo/main.ts`），不能用 `npx serve .` 直接静态服务，否则 TS/Vue 未编译导致空白。
> - 必须通过本地 HTTP 服务访问，不能用 `file://`（ES Module 有 CORS 问题）。
> - 剪贴板/快捷键需 `localhost` / `https` 安全上下文；**勿用 JetBrains 内置浏览器预览 `localhost:63342`**，其注入脚本会拦截 Monaco 的 Ctrl+C/V/Z。

## 参与贡献

1. Fork 本仓库
2. 新建 `Feat_xxx` 分支
3. 提交代码（建议先跑 `npm run build:lib` 与 `npm test`）
4. 新建 Pull Request

## 相关文档

- 技术设计：`ai-pilot/poc/TASK-20260906-01/design.md`
- 测试执行记录：`ai-pilot/poc/TASK-20260906-01/test-execution-log.md`
- 文档站源码：`docs/`（VitePress，中英双语）

## 许可证

MIT © 2026 ll-editor
