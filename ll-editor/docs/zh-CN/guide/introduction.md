# 产品介绍

`ll-editor` = **纯插件化代码编辑器内核 + 可插拔运行时 + 插件市场**。

- 内核借鉴 magic-editor 的 monaco 多标签编辑器（剥离业务）。
- 架构采用 **分层（core / languages / editor / runtime / storage / plugin-api）+ 白名单导出 + 插件/工具注册表**。
- 生态借鉴 deepseek harness 的 **Manifest + 插件市场** 分发模式。

## 核心特性

| 特性 | 说明 |
|---|---|
| 语法高亮 | 基于 Monaco，内置 JS/TS/JSON/HTML/CSS/Markdown |
| 多标签 | 多文档标签切换，内容独立模型 |
| 存储 | `StorageProvider` 抽象，默认 LocalStorage / IndexedDB |
| 主题 | 亮 / 暗（`vs` / `vs-dark`），运行时切换 |
| 断点 | glyph margin 断点装饰（P2 调试联动） |
| 国际化 | 编辑器界面 `locale` 支持 `zh-CN` / `en` |
| 插件 | `LLEditorAPI` 白名单暴露，预留贡献点（P3） |

## 架构分层

```
ll-editor/
├── core/          LLEditor 引擎、EventBus、生命周期（不依赖 UI）
├── languages/     语言注册 + monaco 高亮 grammar
├── editor/        monaco 封装：多标签、断点装饰、主题
├── runtime/       调试/执行引擎（P2 DebugAdapter）
├── storage/       存储 Provider（local / indexeddb / rest）
├── plugin-api/    暴露给插件的稳定 API（白名单）
└── ui/            Vue3 组件（演示用，未纳入 npm 包导出白名单）
```

**依赖方向（被单测强制）**：`ui`/`plugin-runtime` 可依赖 `core/editor/languages/storage/runtime/plugin-api`；`plugin-api` 仅依赖 `core` 类型。

## 与 Monaco 的关系

`ll-editor` 将 Monaco 关在 `editor/` 与 `languages/` 内部：Monaco 负责"编辑器"本身（输入、高亮、补全、诊断），而文件树、标签、存储、调试、插件体系由 `ll-editor` 的分层自搭。如需替换为 CodeMirror，理论上只动这两层。

> Monaco Editor 采用 **MIT 协议**（与本项目许可兼容），可商用 / 闭源，仅须保留版权声明。

## 许可证

MIT。详见仓库根目录 `LICENSE`。
