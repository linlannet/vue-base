

### 版本号：1.0.0
- 更新日期：2026-10-18
- 更新内容：
1. 内核 core：提供框架无关的 LLEditor 编排器（纯 TypeScript，不依赖 Vue/UI），统一管理文档打开/加载/保存/另存/列表/关闭/切换、主题切换、语言与调试适配器注册，并内置类型化事件总线 EventBus（doc:opened/changed/saved/closed、tab:switched、theme:changed、language:registered、breakpoint:changed、run:*、debug:*、problems:changed）
2. 核心类型 types：定义 EditorDoc、DocSummary、LanguageInfo、ThemeInfo、Breakpoint、Diagnostic、DebugAdapter、LLEditorOptions、StorageOptions、KnowledgeBase 等稳定对外类型
3. 语言 languages：增加 LanguageRegistry 注册中心，内置 JavaScript、TypeScript、JSON、HTML、CSS、Markdown 六种语言及默认模板，支持宿主或插件注册扩展语言
4. 编辑器 editor：基于 Monaco 封装 EditorHost（明暗主题、内容变更回调、诊断 markers、调试行高亮、glyph 边栏点击），并提供 TabManager 多标签管理与 BreakpointManager 断点装饰管理
5. 存储 storage：抽象 StorageProvider 接口，提供 LocalStorageProvider 与 IndexedDBProvider 两种实现，由 createStorage 按配置创建（rest 后端存储留待插件提供）
6. 运行/调试 runtime：内置 Web Worker 沙箱 Sandbox（接管 console 输出、断点行注入暂停与恢复、运行结束回传 exitCode 与变量快照）；提供 WorkerDebugAdapter（JS/TS）、MockDebugAdapter + pythonMockExecutor（非 JS 语言模拟执行）、transpileToJs（TS 转译）、lintCode（基于 TypeScript 编译器的语法诊断）与 ConsoleModel 控制台模型，支持运行/继续/单步、断点联动与 Problems 面板
7. 插件 API plugin-api：以白名单方式对外暴露稳定插件接口（语言注册、调试适配器注册、文档读写、事件订阅与派发、运行与调试控制），并预留 registerCommand / registerView 贡献点
8. 分层架构与依赖护栏：按 core / languages / editor / runtime / storage / plugin-api 分层，由架构测试 DirectoryBoundaries.test.ts 强制目录依赖边界，内核不反向依赖 UI 与插件实现
9. 构建与导出：src/index.ts 作为唯一公共出口（白名单导出 core、languages、storage、editor、plugin-api、runtime）；采用 vue-tsc 类型检查 + Vite 库模式构建，产出 dist/ll-editor.js、ll-editor.cjs 与 style.css，monaco-editor 与 vue 均设为 external（产物仅约 11KB）
10. 测试：基于 vitest 增加 runtime 单元测试（转译、语法诊断、控制台模型、沙箱运行/断点/恢复）与目录边界架构测试
11. Vue3 工作台 UI（演示层，未纳入 npm 导出白名单）：实现完整编辑器工作台布局——顶部工具栏、资源侧栏、多标签编辑器、底部面板与状态栏，支持侧栏与底部面板拖拽调整、面板折叠与明暗主题切换；底部面板提供预览、控制台、调试变量与问题列表四页
12. 资源与业务面板：提供接口/函数/数据源/知识库资源树，接口信息（请求参数/Header/路径变量/Body/描述）、接口选项、分组与函数信息、执行结果（Body/响应 Header/响应结构）、调试信息、运行日志（WebSocket 实时日志，级别着色与异常栈高亮）、全局搜索、历史记录（Monaco DiffEditor 对比备份）、TODO、事件、全局参数设置与登录等面板，并提供树/JSON 结构编辑/右键菜单/模态框等通用组件
13. magic-api 后端对接：增加 linlanApi.ts（资源树与分组/接口/函数/数据源 CRUD、备份与回滚、zip 导出与上传、远程增量与全量推送、TODO、脚本搜索、选项元数据、数据源连通测试）、linlanRun.ts（接口运行调试、请求日志与历史）与 request.ts（fetch 请求封装，自动携带 magic-token，支持表单/JSON/blob）
14. 脚本与语言能力 scripts：移植 JS/JSON 代码美化器 Beautifier 与 magic-script 词法/语法解析器（Tokenizer、Parser、AST），提供 Monaco 补全、悬浮、签名帮助、折叠、高亮、mybatis 语言注册、Java 类元数据、明暗主题与环境变量注入，并内置事件总线、快捷键绑定、localStorage Store、可重连 WebSocket（/console 运行日志）等基础设施
15. 国际化与文档：内置 zh-CN / en 双语字典（i18n），提供 VitePress 中英双语文档站（docs/）说明 LLEditor / 插件 API / 事件，并提供 src/demo 本地演示入口与 public/index.html 打包产物冒烟页
