import type { LanguageInfo } from '../core/types'

/** P1 内置语言（monaco 自带 grammar，无需额外打包） */
export const BUILTIN_LANGUAGES: LanguageInfo[] = [
  { id: 'javascript', label: 'JavaScript', monacoLanguage: 'javascript', extensions: ['.js', '.mjs', '.cjs'], defaultContent: '// JavaScript\nconst a = 1\n' },
  { id: 'typescript', label: 'TypeScript', monacoLanguage: 'typescript', extensions: ['.ts'], defaultContent: '// TypeScript\nconst a: number = 1\n' },
  { id: 'json', label: 'JSON', monacoLanguage: 'json', extensions: ['.json'], defaultContent: '{\n  "key": "value"\n}\n' },
  { id: 'html', label: 'HTML', monacoLanguage: 'html', extensions: ['.html', '.htm'], defaultContent: '<!doctype html>\n<html></html>\n' },
  { id: 'css', label: 'CSS', monacoLanguage: 'css', extensions: ['.css'], defaultContent: 'body {\n  color: #333;\n}\n' },
  { id: 'markdown', label: 'Markdown', monacoLanguage: 'markdown', extensions: ['.md'], defaultContent: '# Title\n' }
]

export function registerBuiltinLanguages(registry: { register: (i: LanguageInfo) => void }): void {
  for (const lang of BUILTIN_LANGUAGES) registry.register(lang)
}
