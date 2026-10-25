// @ts-nocheck
import { createApp } from 'vue'
import Submenu from './Submenu.vue'

// 记录当前顶层右键菜单的关闭函数，供任意子菜单点击时统一关闭整棵菜单
let rootClose = null
export function setRootClose(fn) {
  rootClose = fn
}
export function closeRoot() {
  if (rootClose) rootClose()
}

export function mountSubmenu(options) {
  const container = document.createElement('div')
  const rootEl = document.querySelector('.ll-container') || document.body
  rootEl.appendChild(container)
  const app = createApp(Submenu, { ...options, onDestroy: () => closeRoot() })
  const proxy = app.mount(container)
  return { app, proxy, container, el: container.firstElementChild }
}
