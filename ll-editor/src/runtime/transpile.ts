/**
 * 将源码转译为可在沙箱中执行的 JS。
 * 已移除运行时 TypeScript 编译器（约 3.4MB）：TS 源码原样返回，
 * 如需在沙箱执行 TS，请改由宿主注入转译器或直接使用 JavaScript。
 */
export function transpileToJs(code: string, _language: string): string {
  return code
}
