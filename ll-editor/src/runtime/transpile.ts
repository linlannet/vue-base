import * as ts from 'typescript'

/**
 * 将源码转译为可在沙箱中执行的 JS。
 * - TypeScript：使用 typescript 编译器去掉类型注解（输出为普通脚本，无 import/export）。
 * - JavaScript：原样返回。
 */
export function transpileToJs(code: string, language: string): string {
  if (language === 'typescript' || language === 'ts') {
    const out = ts.transpileModule(code, {
      reportDiagnostics: false,
      compilerOptions: {
        target: ts.ScriptTarget.ES2018,
        module: ts.ModuleKind.None,
        isolatedModules: true,
        removeComments: false
      },
      fileName: 'doc.ts'
    })
    return out.outputText
  }
  return code
}
