import type { Diagnostic } from '../core/types'

/**
 * 轻量语法检查（不再内置 TypeScript 编译器）。
 * 仅对 javascript / js 通过 Function 构造器做一次快速解析；
 * TS 及其它语言不做静态诊断，语法/运行时错误由执行阶段回报。
 * 目的：避免把约 3.4MB 的 typescript 编译器打进运行时产物。
 */
export function lintCode(code: string, language: string, docId: string): Diagnostic[] {
  const lang = (language || '').toLowerCase()
  if ((lang !== 'javascript' && lang !== 'js') || !code.trim()) return []
  try {
    // 只编译不执行，用于捕获语法错误
    new Function(code)
    return []
  } catch (e) {
    const err = e as Error
    return [
      {
        docId,
        line: 1,
        column: 1,
        severity: 'error',
        message: err.message,
        source: 'javascript'
      } as Diagnostic
    ]
  }
}
