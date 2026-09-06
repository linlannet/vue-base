---
layout: home

hero:
  name: ll-editor
  text: 插件化代码编辑器内核
  tagline: 基于 Monaco 的可插拔代码编辑内核 + 运行时 + 插件市场
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: API 参考
      link: /api/ll-editor

features:
  - title: 插件化内核
    details: core / editor / languages / storage / runtime / plugin-api 分层，依赖方向由单测强制守护。
  - title: Monaco 驱动
    details: 复用 VS Code 编辑器内核：语法高亮、多光标、断点 glyph margin、Worker 语言服务。
  - title: 多标签 + 存储
    details: 多文档标签，LocalStorage / IndexedDB / REST 三种存储后端，全部通过 config 注入。
  - title: 中英双语
    details: 文档站内置 i18n（本页右上角切换）；编辑器界面 locale 支持 zh-CN / en。
  - title: 框架无关核心
    details: LLEditor 编排器为纯 TS 类，不依赖 Vue；UI 与宿主框架解耦。
  - title: 类型安全
    details: 公共出口白名单导出，配套 vue-tsc 类型检查与 .d.ts（见仓库构建）。

footer: MIT License © 2026 ll-editor
---
