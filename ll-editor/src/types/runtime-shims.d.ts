// 运行时底座（Vue2 移植的 magic-api 运行时模块）的宽松类型声明。
// 这些模块以 // @ts-nocheck 编译，导出类型被 TS 推断得过窄（如 Key 只剩初始字面量、
// request.send 形参数、replaceURL 单参数、websocket 构造签名缺失），导致 LLEditor 调用点误报。
// 这里用与实际导入说明符完全一致的精确模块声明（any）覆盖文件推断，沿用合并魔法-api 运行时时的做法。
declare module '@/scripts/hotkey' {
  const Key: any
  export default Key
}

declare module '@/api/request' {
  const request: any
  export default request
}

declare module '@/scripts/utils' {
  export function getQueryVariable(name?: string): any
  export function replaceURL(key?: string, value?: string): any
  const _default: any
  export default _default
}

declare module '@/scripts/websocket' {
  const LinlanWebSocket: any
  export default LinlanWebSocket
}
