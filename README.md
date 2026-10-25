# vue-base

[![License](https://img.shields.io/badge/license-Apache%202-green.svg)](https://www.apache.org/licenses/LICENSE-2.0)
![java version](https://img.shields.io/badge/JAVA-1.8-green.svg)
![gitee star](https://gitee.com/linlannet/vue-base/badge/star.svg)

简体中文 | [English](./README.en.md)

## 简介

企业级前端公共组件库，对前端通用支撑组件进行封装和统一管理，降低每个前端工程的共性开发成本，统一访问控制、安全加密、基础工具类等资源。

## 仓库组成

本仓库以子包（package）形式统一维护各类前端公共组件/插件，各子包独立管理版本、依赖与发布。点击下表中的子包名称即可跳转到对应说明文档。

| 子包 | 当前版本 | 说明 | 技术栈 |
| ---- | ---- | ---- | ---- |
| [lib-vue-base](./lib-vue-base/README.md) | 1.1.1 | 企业级前端框架基础支撑组件：统一访问控制、安全加密、请求封装、基础工具类等 | Vue3 + Pinia + TypeScript + Vite |
| [ll-editor](./ll-editor/README.md) | 1.1.1 | 插件化代码编辑器内核（基于 Monaco）：可插拔运行时与调试、插件 API，内置 magic-api 工作台 | TypeScript + Vue3 + Monaco Editor + Vite |

> 说明：后续将持续沉淀、增加更多公共组件/插件，统一在本仓库中以子包形式维护与发布。

---

### [lib-vue-base](./lib-vue-base/README.md)

企业级前端框架基础支撑组件，对前端通用支撑能力进行封装和统一管理，降低每个前端工程的共性开发，统一访问控制、安全加密、基础工具类等资源。

- **统一请求**：axios 实例封装，请求/响应拦截器、令牌与平台参数自动注入、防缓存时间戳、统一错误码处理，`api/modules` 下接口模块自动挂载
- **安全加密**：AES（CBC/PKCS7）加解密、RSA 公钥加密，支持免解密白名单、强制解密清单与敏感字段按列解密
- **基础工具**：节流/防抖、深拷贝、日期格式化、cookie、路由与外部链接跳转、全屏水印、组件懒加载、图片预览
- **状态管理**：基于 `pinia` + `pinia-plugin-persist` 的站点信息、用户信息与公共信息 store，均支持本地持久化

相关链接：[中文文档](./lib-vue-base/README.md) · [English](./lib-vue-base/README.en.md) · [更新记录](./lib-vue-base/CHANGELOG.md) · [源码目录](./lib-vue-base)

### [ll-editor](./ll-editor/README.md)

插件化、与业务无关的代码编辑器内核：内核借鉴 linlan-editor 的 Monaco 多标签编辑器，架构借鉴 aieditor 的分层与白名单导出，生态借鉴插件市场分发模式，并内置类 magic-api 的接口工作台。

- **内核 core**：框架无关的 `LLEditor` 编排器（纯 TypeScript，不依赖 Vue/UI），统一管理文档、多标签、主题、语言注册与事件总线
- **运行与调试**：Web Worker 沙箱执行、断点暂停与继续、变量快照、TypeScript 转译、语法诊断，以及控制台与问题面板
- **插件化扩展**：稳定的白名单插件 API（语言注册、调试适配器、文档读写、事件订阅、运行控制），分层依赖由架构测试强制约束
- **工作台 UI**：知识库 / 接口 / 函数 / 数据源四种模式，提供资源树、接口信息与运行、日志、备份、导出与远程推送等完整链路
- **国际化与文档**：内置中英双语，提供 VitePress 文档站（LLEditor / 插件 API / 事件）

相关链接：[中文文档](./ll-editor/README.md) · [English](./ll-editor/README.en.md) · [文档站](./ll-editor/docs) · [更新记录](./ll-editor/CHANGELOG.md) · [源码目录](./ll-editor)

---

## 修改历史记录

- 仓库整体：[CHANGELOG](./CHANGELOG.md)
- 子包：[lib-vue-base 更新记录](./lib-vue-base/CHANGELOG.md) · [ll-editor 更新记录](./ll-editor/CHANGELOG.md)



## 环境准备

- [node](http://nodejs.org/) and [git](https://git-scm.com/) - Project development environment
- [Vite](https://vitejs.dev/) - Familiar with vite features
- [Vue3](https://v3.vuejs.org/) - Familiar with Vue basic syntax
- [TypeScript](https://www.typescriptlang.org/) - Familiar with the basic syntax of `TypeScript`
- [Es6+](http://es6.ruanyifeng.com/) - Familiar with es6 basic syntax
- [Vue-Router-Next](https://next.router.vuejs.org/) - Familiar with the basic use of vue-router
- [Ant-Design-Vue](https://antdv.com/docs/vue/introduce-cn/) - ui basic use
- [Mock.js](https://github.com/nuysoft/Mock) - mockjs basic syntax

## 安装和使用

各子包独立管理依赖与构建，请进入对应子包目录后操作（下面以 [ll-editor](./ll-editor/README.md) 为例）。

- 获取项目代码

```bash
git clone https://gitee.com/linlannet/vue-base.git
```

- 安装依赖并调试运行

```bash
cd ll-editor

npm install

npm run dev
```

- 库构建与单元测试

```bash
npm run build:lib   # 产出 dist/ll-editor.js、ll-editor.cjs 与 style.css
npm run test:run
```

> 各子包的完整命令与发布方式请查看对应文档：[lib-vue-base](./lib-vue-base/README.md) · [ll-editor](./ll-editor/README.md)

## 参与贡献

欢迎你的加入！[提交 issue](https://gitee.com/linlannet/vue-base/issues/new/choose) 或者提交拉取请求。

**拉取请求步骤:**

1. Fork 代码仓库
2. 创建你自己的分支: `git checkout -b feat/xxxx`
3. 提交你的代码: `git commit -am 'feat(function): add xxxxx'`
4. 推送你的分支到本仓库: `git push origin feat/xxxx`
5. 发布`pull request`

## 版权

[Apache 2.0 © vue-base 2023](./LICENSE)
