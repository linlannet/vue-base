import * as ts from 'typescript'
import type { Diagnostic } from '../core/types'

/**
 * 语法/类型纠错（语法纠错扩展点）。
 * 使用 typescript 编译器对 JS/TS 源码做语法诊断，返回统一的 Diagnostic 列表。
 * UI 据此在编辑器内标记问题（Problems 面板 + monaco markers）。
 */
export function lintCode(code: string, language: string, docId: string): Diagnostic[] {
  const isTs = language === 'typescript' || language === 'ts'
  const fileName = isTs ? 'doc.ts' : 'doc.js'
  const scriptKind = isTs ? ts.ScriptKind.TS : ts.ScriptKind.JS
  const sf = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, scriptKind)

  const out = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2018,
      module: ts.ModuleKind.None,
      noEmit: true
    },
    fileName
  })

  return (out.diagnostics ?? []).map((d) => {
    const start = d.start ?? 0
    const { line, character } = sf.getLineAndCharacterOfPosition(start)
    return {
      docId,
      line: line + 1,
      column: character + 1,
      severity: d.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
      message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      source: isTs ? 'typescript' : 'javascript'
    } as Diagnostic
  })
}
