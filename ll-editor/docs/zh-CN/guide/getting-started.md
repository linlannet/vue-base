# 快速开始

## 安装

```bash
npm install ll-editor
# 或
pnpm add ll-editor
```

`ll-editor` 的运行时依赖 `monaco-editor`，宿主需自行提供（package 已将 `monaco-editor` 与 `vue` external）。

## 最小示例（原生 / 框架无关核心）

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

// 监听事件
editor.bus.on('doc:opened', (doc) => console.log('opened', doc.name))
editor.bus.on('doc:saved', (doc) => console.log('saved', doc.name))

// 保存当前文档
await editor.save()
```

## 静态产物冒烟测试

构建后 `public/index.html`（引用 `./ll-editor.js` + `./style.css`）会被 Vite 拷贝到 `dist/index.html`，可直接用静态服务器打开：

```bash
cd ll-editor
npm run build:lib
npx serve dist          # 浏览器打开 http://localhost:3000/  （即为 dist/index.html）
# 或预览构建产物（统一使用 3000 端口）：
npm run preview         # = npx vite preview --port 3000 --strictPort
```

> 注意：
> - 根目录 `index.html` 是 **Vite 开发入口**（引用 `/src/demo/main.ts`），需用 `npm run dev` 打开，不能用 `npx serve .` 直接静态服务，否则 TS/Vue 未编译导致页面空白。
> - 必须通过本地 HTTP 服务访问（`serve` / `vite preview` / `npm run dev`），不能用 `file://` 直接打开，否则 ES Module 有 CORS 问题；且剪贴板能力需 `localhost` / `https` 安全上下文。
> - 不要用 JetBrains 内置浏览器预览（`localhost:63342`），其注入脚本会拦截 Monaco 的 Ctrl+C/V/Z。

## 验证

```bash
npm install --include=dev
npm run build:lib   # vue-tsc 类型检查 + vite 库构建
npm run dev         # 开发服务器（Monaco 完整打包，体验最佳）
```

下一步：[框架集成](/zh-CN/guide/integration) · [配置参考](/zh-CN/guide/configuration)
