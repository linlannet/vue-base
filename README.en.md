# vue-base

[![License](https://img.shields.io/badge/license-Apache%202-green.svg)](https://www.apache.org/licenses/LICENSE-2.0)
![java version](https://img.shields.io/badge/JAVA-1.8-green.svg)
![gitee star](https://gitee.com/linlannet/vue-base/badge/star.svg)

## Introduction

Enterprise-level shared front-end component library. It wraps and centrally manages common support components for the front end, reducing repetitive development across each front-end project and unifying resources such as access control, secure encryption and basic utilities.

## Repository Structure

This repository maintains all shared front-end components/plugins as sub-packages, and currently includes:

| Sub-package | Description |
| ----------- | ----------- |
| [lib-vue-base](./lib-vue-base) | Enterprise-level front-end foundation components: unified access control, secure encryption, request wrapper, basic utilities, etc. |
| [ll-editor](./ll-editor) | Pluggable code editor kernel (based on Monaco), with pluggable runtime and plugin marketplace |

> Note: besides the components above, more shared components/plugins will be continuously added to this repository as sub-packages in the future.

## Change Log

[CHANGELOG](./CHANGELOG.md)


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

- Get the project code

```bash
git clone https://gitee.com/linlannet/vue-base.git
```

- Install dependencies

```bash
cd vue-base

npm install

```

- run

```bash
npm run dev
```

- build

```bash
npm build
```

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
