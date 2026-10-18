// @ts-nocheck
import mitt from 'mitt'

// Vue3 事件总线：mitt 封装，保留原 linlan-editor 的 $on/$emit/$off 调用约定
const emitter = mitt()
const statusLogs = []

function formatDate(date) {
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return (
    date.getFullYear() +
    '-' +
    p(date.getMonth() + 1) +
    '-' +
    p(date.getDate()) +
    ' ' +
    p(date.getHours()) +
    ':' +
    p(date.getMinutes()) +
    ':' +
    p(date.getSeconds())
  )
}

const bus = {
  $on(type, handler) {
    emitter.on(type, handler)
  },
  $once(type, handler) {
    const wrap = (e) => {
      emitter.off(type, wrap)
      handler(e)
    }
    emitter.on(type, wrap)
  },
  $off(type, handler) {
    emitter.off(type, handler)
  },
  $emit(type, ...args) {
    emitter.emit(type, args.length > 1 ? args : args[0])
  },
  $getStatusLog() {
    return statusLogs
  },
  $clearStatusLog() {
    statusLogs.length = 0
  },
  // 兼容直连 mitt 用法
  on(type, handler) {
    emitter.on(type, handler)
  },
  off(type, handler) {
    emitter.off(type, handler)
  },
  emit(type, ...args) {
    emitter.emit(type, args.length > 1 ? args : args[0])
  },
  // 状态日志（原 linlan-editor bus.statusLog）
  statusLog(type, fnName, content) {
    const log = { type, fnName, content, time: formatDate(new Date()) }
    statusLogs.push(log)
    emitter.emit('status', { ...log })
  }
}

export default bus
