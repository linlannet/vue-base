# vue-base

[![License](https://img.shields.io/badge/license-Apache%202-green.svg)](https://www.apache.org/licenses/LICENSE-2.0)
![java version](https://img.shields.io/badge/JAVA-1.8-green.svg)
![gitee star](https://gitee.com/linlannet/vue-base/badge/star.svg)

## 简介

企业级前端公共组件库，对前端通用支撑组件进行封装和统一管理，降低每个前端工程的共性开发成本，统一访问控制、安全加密、基础工具类等资源。

## 仓库组成

本仓库以子包形式统一维护各类前端公共组件/插件，当前已包含：

| 子包 | 说明 |
| ---- | ---- |
| [lib-vue-base](./lib-vue-base) | 企业级前端框架基础支撑组件：统一访问控制、安全加密、请求封装、基础工具类等 |
| [ll-editor](./ll-editor) | 插件化代码编辑器内核（基于 Monaco），可插拔运行时与插件市场 |

> 说明：除上述组件外，后续将持续沉淀、增加更多公共组件/插件，统一在本仓库中以子包形式维护与发布。


## 修改历史记录

[CHANGELOG](./CHANGELOG.md)



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

- 获取项目代码

```bash
git clone https://gitee.com/linlannet/vue-base.git
```

- 安装依赖

```bash
cd vue-base

npm install

```

- 调试运行

```bash
npm run dev
```

- 打包发布

```bash
npm build
```

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
