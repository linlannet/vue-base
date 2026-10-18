// @ts-nocheck
import { createApp } from 'vue'
import LinlanAlert from './linlan-alert.vue'
import LinlanConfirm from './linlan-confirm.vue'
import LinlanDialog from './linlan-dialog.vue'
import LinlanPrompt from './linlan-prompt.vue'

function getRoot() {
  return document.querySelector('.ma-container') || document.body
}

function mount(Comp, props) {
  const container = document.createElement('div')
  getRoot().appendChild(container)
  const app = createApp(Comp, props)
  const proxy = app.mount(container)
  return { app, proxy, container }
}

function unmount({ app, container }) {
  app.unmount()
  if (container && container.parentNode) {
    container.parentNode.removeChild(container)
  }
}

const modal = {
  linlanAlert(message, options) {
    options = options || {}
    const ref = mount(LinlanAlert, {
      ...options,
      value: true,
      content: message,
      onInput: (v) => {
        if (!v) unmount(ref)
      },
      onClose: () => unmount(ref)
    })
    return ref.proxy
  },
  linlanConfirm(message, options) {
    // 兼容两种入参：options 为函数时视为 confirm 回调；对象支持 { confirm, cancel }（ll 侧惯用）
    // 与 { onOk, onCancel }（magic-confirm 原生 prop 名）
    const handlers = typeof options === 'function' ? { confirm: options } : options || {}
    const onOk = handlers.onOk || handlers.confirm
    const onCancel = handlers.onCancel || handlers.cancel
    const ref = mount(LinlanConfirm, {
      value: true,
      content: message,
      onInput: (v) => {
        if (!v) unmount(ref)
      },
      onOk: () => {
        unmount(ref)
        if (onOk) onOk()
      },
      onCancel: () => {
        unmount(ref)
        if (onCancel) onCancel()
      }
    })
    return ref.proxy
  },
  linlanDialog(...args) {
    const props = args[0] && typeof args[0] === 'object' ? args[0] : {}
    const ref = mount(LinlanDialog, {
      ...props,
      value: true,
      onClose: () => unmount(ref)
    })
    return ref.proxy
  },
  /**
   * 输入型对话框（替代 window.prompt）：
   * linlanPrompt(message, defaultValue?, options?) => Promise<string | null>
   * 确认返回输入文本，取消/关闭返回 null。
   */
  linlanPrompt(message, defaultValue = '', options = {}): Promise<string | null> {
    const opts = typeof options === 'string' ? { title: options } : options
    return new Promise<string | null>((resolve) => {
      let ref = null
      let settled = false
      // 幂等收尾：unmount 与 resolve 只生效一次
      const finish = (v: string | null) => {
        if (settled) return
        settled = true
        unmount(ref)
        resolve(v)
      }
      ref = mount(LinlanPrompt, {
        ...opts,
        value: true,
        content: message,
        defaultValue,
        onInput: (v) => {
          if (!v) finish(null)
        },
        onOk: (text) => finish(text),
        onCancel: () => finish(null)
      })
    })
  }
}

const LinlanModalPlugin = {
  install(app) {
    app.config.globalProperties.$linlanAlert = modal.linlanAlert
    app.config.globalProperties.$linlanConfirm = modal.linlanConfirm
    app.config.globalProperties.$linlanDialog = modal.linlanDialog
    app.config.globalProperties.$linlanPrompt = modal.linlanPrompt
  }
}

export { modal, LinlanModalPlugin }
export default modal
