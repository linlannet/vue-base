### 版本号：1.1.1
- 更新日期：2026-10-25
- 更新内容：
1. 知识库多级目录：KBFile 增加 parentId，新增 KBFolder 类型与 KnowledgeBase.folders，支持知识库内多级文件夹的新建、改名、删除与文件移动
2. 知识库导入导出：新增 kbZip.ts（基于 fflate，纯前端）支持知识库 zip 导出与导入（按顶层层级还原多个知识库，未知后缀自动跳过），并支持本地文件上传（类型与大小校验）
3. 知识库持久化与文件识别：新增 useKbStorage.ts 基于 localStorage 的版本化持久化（数据非法时回退默认，避免白屏），新增 kbFiles.ts 统一「后缀 → monaco language + 文件类别」映射
4. 知识库编辑器增强：md 与其他类型统一走 Monaco（md 以 markdown 语言编辑并开启软换行），支持右侧分屏预览（历史 HTML 内容直接渲染、markdown 源码走内置渲染）、面板开关状态记忆与 AI 面板宽度拖拽
5. AI 对话面板：新增 linlan-ai-chat.vue，支持多会话（新建/历史/删除）、BaseUrl / Model / ApiKey 配置、思考过程与回答展示，并可将回答保存回知识库
6. 资源树操作增强：接口/函数树增加关键字过滤（命中节点保留整棵子树）、名称升/降序、全部展开与折叠、定位当前文件与隐藏；新增右键菜单组件（linlan-tree-menu / treeMenu）与复制分组弹窗（linlan-copy-group）
7. 最近打开：新增最近打开弹窗（Ctrl+E 呼出），最多保留 30 条并持久化，打开时从资源树实时解析显示信息并自动清理已删除资源
8. 状态栏与在线用户：新增在线用户头像组与在线人数（WebSocket 事件 login_response / user_login / user_logout / online_users，ping-pong 保活），展示当前登录用户名与 IP，并提供 Gitee / Github / 帮助 / 注销彩色图标入口
9. 顶栏国际化与皮肤：新增中/英语言切换（store 持久化，切换后提示刷新生效）与皮肤选择器（default / dark / gray-new / dark-new，自动恢复上次皮肤）
10. 图标与样式：新增 ll-icons.css 蓝色线性图标集覆盖 iconfont 字形，并按 ma-* 命名规范重构工作台样式，贴近官方控制台视觉
11. 内核能力：LLEditorOptions 与 EditorHost 新增 editorOptions 透传 monaco.editor.create，主题名直接透传 Monaco（兼容 light / dark 与自定义皮肤）
12. 缺陷修复：修复事件总线 $emit / emit 多参被打包成数组导致的参数错位（update-response-body、WebSocket 消息），补充 formatJson 类型声明与 WebSocket 握手用的 CLIENT_ID 常量
13. 移除 aieditor 依赖：删除 AiEditor 富文本编辑器（含 aieditor/style.css 与其内部样式覆盖），知识库 md 编辑统一由 Monaco 承载（markdown 语言 + 软换行 + 右侧分屏预览），package.json 与 package-lock.json 同步移除 aieditor

### 版本号：1.1.0
- 更新日期：2026-10-22
- 更新内容：
1. 接口运行链路：linlanRun 直连已部署接口端点运行（context-path + 分组路径 + 接口路径），支持路径变量替换、请求 Header 与参数（GET/DELETE 走 query，其余按表单或 requestBody 提交 JSON），响应体格式化与响应 Header、响应结构展示，运行结果写回接口实体并刷新「执行结果」面板，同时记录运行日志与历史（状态码、大小、耗时）
2. 接口与函数资源树：基于 POST /resource 构建接口、函数资源树，支持分组与接口/函数的增删改、复制分组（/resource/folder/copy）、导出分组 zip、锁定/解锁与删除
3. 备份与历史：新增全量备份（POST /backup/full）与备份列表（GET /backups，含时间、类型、操作人、名称），支持脚本备份对比（Monaco DiffEditor）与回滚
4. 导出、推送与上传：支持接口/函数 zip 导出、远程增量与全量推送（magic-push-target / secret-key / mode 请求头）、zip 上传导入
5. 底部面板与工作模式：按知识库/接口/函数/数据源模式切换底部面板页签（知识库为预览、控制台、调试变量、问题；接口为请求、参数、日志、历史），支持面板折叠与最小化
6. 登录与用户：对接 /login 登录并回写 magic-token，支持当前用户查询（/user）与注销（/logout）
7. 全局搜索与 TODO：提供脚本内容全局搜索（POST /search，命中片段高亮）与全局 TODO 列表（GET /todo），支持点击定位并打开资源
8. 选项与数据源：提供全局选项元数据（GET /options）维护与数据源连通性测试（/datasource/jdbc/test）

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
