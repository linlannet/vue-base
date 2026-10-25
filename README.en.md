# vue-base

[![License](https://img.shields.io/badge/license-Apache%202-green.svg)](https://www.apache.org/licenses/LICENSE-2.0)
![java version](https://img.shields.io/badge/JAVA-1.8-green.svg)
![gitee star](https://gitee.com/linlannet/vue-base/badge/star.svg)

[简体中文](./README.md) | English

## Introduction

Enterprise-level shared front-end component library. It wraps and centrally manages common support components for the front end, reducing repetitive development across each front-end project and unifying resources such as access control, secure encryption and basic utilities.

## Repository Structure

This repository maintains all shared front-end components/plugins as sub-packages. Each sub-package manages its own version, dependencies and release. Click a sub-package name in the table below to open its documentation.

| Sub-package | Version | Description | Stack |
| ----------- | ------- | ----------- | ----- |
| [lib-vue-base](./lib-vue-base/README.en.md) | 1.1.1 | Enterprise-level front-end foundation components: unified access control, secure encryption, request wrapper, basic utilities, etc. | Vue3 + Pinia + TypeScript + Vite |
| [ll-editor](./ll-editor/README.en.md) | 1.1.1 | Pluggable code editor kernel (based on Monaco): pluggable runtime and debugging, plugin API, with a built-in magic-api workbench | TypeScript + Vue3 + Monaco Editor + Vite |

> Note: besides the components above, more shared components/plugins will be continuously added to this repository as sub-packages in the future.

---

### [lib-vue-base](./lib-vue-base/README.en.md)

Enterprise-level front-end foundation components. It wraps and centrally manages common support capabilities for the front end, reducing repetitive development across each front-end project and unifying resources such as access control, secure encryption and basic utilities.

- **Unified requests**: axios instance wrapper with request/response interceptors, automatic token and platform parameter injection, cache-busting timestamp, unified error-code handling, and auto-registration of API modules under `api/modules`
- **Secure encryption**: AES (CBC/PKCS7) encryption/decryption and RSA public-key encryption, with a decryption whitelist, a forced-decryption list and per-column decryption of sensitive fields
- **Basic utilities**: throttle/debounce, deep clone, date formatting, cookie, internal route and external link redirection, full-screen watermark, lazy-loaded components, image preview
- **State management**: `pinia` + `pinia-plugin-persist` stores for site info, user info and common info, all persisted locally

Links: [Documentation](./lib-vue-base/README.en.md) · [简体中文](./lib-vue-base/README.md) · [Changelog](./lib-vue-base/CHANGELOG.md) · [Source](./lib-vue-base)

### [ll-editor](./ll-editor/README.en.md)

A plugin-based, business-agnostic code editor kernel: its kernel learns from linlan-editor's multi-tab Monaco editor, its architecture from aieditor's layering and whitelisted exports, its ecosystem from the plugin-marketplace distribution model, with a magic-api-like API workbench built in.

- **Core**: framework-agnostic `LLEditor` orchestrator (pure TypeScript, no Vue/UI dependency) managing documents, multi-tab editing, themes, language registration and the event bus
- **Run & debug**: Web Worker sandbox execution, breakpoint pause/resume, variable snapshots, TypeScript transpilation, syntax diagnostics, plus console and problems panels
- **Plugin extensibility**: stable whitelisted plugin API (language registration, debug adapters, document access, event subscription, run control), with layered boundaries enforced by architecture tests
- **Workbench UI**: four modes — knowledge base / API / function / datasource — with resource tree, API definition and execution, logs, backups, export and remote push
- **i18n & docs**: built-in Chinese/English dictionaries and a VitePress documentation site (LLEditor / plugin API / events)

Links: [Documentation](./ll-editor/README.en.md) · [简体中文](./ll-editor/README.md) · [Docs site](./ll-editor/docs) · [Changelog](./ll-editor/CHANGELOG.md) · [Source](./ll-editor)

---

## Change Log

- Repository: [CHANGELOG](./CHANGELOG.md)
- Sub-packages: [lib-vue-base changelog](./lib-vue-base/CHANGELOG.md) · [ll-editor changelog](./ll-editor/CHANGELOG.md)


## Preparation

- [node](http://nodejs.org/) and [git](https://git-scm.com/) - Project development environment
- [Vite](https://vitejs.dev/) - Familiar with vite features
- [Vue3](https://v3.vuejs.org/) - Familiar with Vue basic syntax
- [TypeScript](https://www.typescriptlang.org/) - Familiar with the basic syntax of `TypeScript`
- [Es6+](http://es6.ruanyifeng.com/) - Familiar with es6 basic syntax
- [Vue-Router-Next](https://next.router.vuejs.org/) - Familiar with the basic use of vue-router
- [Ant-Design-Vue](https://antdv.com/docs/vue/introduce-cn/) - ui basic use
- [Mock.js](https://github.com/nuysoft/Mock) - mockjs basic syntax


## Install and use

Each sub-package manages its own dependencies and build. Enter the sub-package directory first (the example below uses [ll-editor](./ll-editor/README.en.md)).

- Get the project code

```bash
git clone https://gitee.com/linlannet/vue-base.git
```

- Install dependencies and start the dev server

```bash
cd ll-editor

npm install

npm run dev
```

- Library build and unit tests

```bash
npm run build:lib   # emits dist/ll-editor.js, ll-editor.cjs and style.css
npm run test:run
```

> Full commands and release steps for each sub-package: [lib-vue-base](./lib-vue-base/README.en.md) · [ll-editor](./ll-editor/README.en.md)

## How to contribute

You are very welcome to join！[Raise an issue](https://gitee.com/linlannet/vue-base/issues/new/choose) or submit a Pull Request。

**Pull Request:**

1. Fork code!
2. Create your own branch: `git checkout -b feat/xxxx`
3. Submit your changes: `git commit -am 'feat(function): add xxxxx'`
4. Push your branch: `git push origin feat/xxxx`
5. Submit`pull request`


## License

[Apache 2.0 © vue-base 2023](LICENSE)
