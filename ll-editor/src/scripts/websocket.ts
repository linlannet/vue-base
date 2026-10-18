// @ts-nocheck
/*
 * java-magic-api - 基于Magic-api的工具 * Copyright © 2020-2025 Linlan (open@linlan.net)
 * Vue3 移植版：内置最小化的可重连 WebSocket（不依赖第三方 reconnecting-websocket 包）
 */
import bus from '@/scripts/bus'

// 最小化的可重连 WebSocket 实现
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url
    this.listeners = {}
    this.shouldReconnect = true
    this._connect()
  }
  _connect() {
    try {
      this.ws = new WebSocket(this.url)
    } catch (e) {
      this._scheduleReconnect()
      return
    }
    this.ws.onopen = (e) => {
      if (this.onopen) this.onopen(e)
    }
    this.ws.onmessage = (e) => {
      if (this.onmessage) this.onmessage(e)
    }
    this.ws.onclose = () => {
      if (this.shouldReconnect) this._scheduleReconnect()
    }
    this.ws.onerror = () => {
      if (this.shouldReconnect) this._scheduleReconnect()
    }
  }
  _scheduleReconnect() {
    if (this._timer) return
    this._timer = setTimeout(() => {
      this._timer = null
      this._connect()
    }, 2000)
  }
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }
  close() {
    this.shouldReconnect = false
    if (this._timer) clearTimeout(this._timer)
    if (this.ws) this.ws.close()
  }
}

function LinlanWebSocket(url) {
  this.listeners = {}
  this.socket = new ReconnectingWebSocket(url)
  this.socket.onmessage = this.messageReceived.bind(this)
  bus.$on('message', (msgType, content) => {
    if (content) {
      this.socket.send(`${msgType},${content}`)
    } else {
      this.socket.send(msgType)
    }
  })
  this.socket.onopen = () => {
    bus.$emit('ws_open')
  }
}

LinlanWebSocket.prototype.on = function (msgType, callback) {
  this.listeners[msgType] = this.listeners[msgType] || []
  this.listeners[msgType].push(callback)
}

LinlanWebSocket.prototype.messageReceived = function (e) {
  let payload = e.data
  let index = payload.indexOf(',')
  let msgType = index === -1 ? payload : payload.substring(0, index)
  let args = []
  while (index > -1) {
    payload = payload.substring(index + 1)
    if (payload.startsWith('[') || payload.startsWith('{')) {
      args.push(JSON.parse(payload))
      break
    }
    let newIndex = payload.indexOf(',', index + 1)
    args.push(newIndex === -1 ? payload : payload.substring(index + 1, newIndex))
    index = newIndex
  }
  bus.$emit('ws_' + msgType, args)
}
LinlanWebSocket.prototype.close = function () {
  this.socket.close()
}

export default LinlanWebSocket
