/**
 * 知识库文件类型识别：后缀 → monaco language + 类别。
 * 供左侧树、上传导入、zip 导入导出共用，避免多处维护后缀白名单。
 */
import type { KBFileKind } from '@/core/types'

export const TEXT_FILE_META: Record<string, { language: string; kind: KBFileKind }> = {
  md: { language: 'markdown', kind: 'md' },
  markdown: { language: 'markdown', kind: 'md' },
  txt: { language: 'plaintext', kind: 'text' },
  json: { language: 'json', kind: 'text' },
  yml: { language: 'yaml', kind: 'text' },
  yaml: { language: 'yaml', kind: 'text' },
  xml: { language: 'xml', kind: 'text' },
  js: { language: 'javascript', kind: 'code' },
  mjs: { language: 'javascript', kind: 'code' },
  ts: { language: 'typescript', kind: 'code' },
  py: { language: 'python', kind: 'code' },
  java: { language: 'java', kind: 'code' },
  sql: { language: 'sql', kind: 'code' },
  html: { language: 'html', kind: 'code' },
  htm: { language: 'html', kind: 'code' },
  css: { language: 'css', kind: 'code' },
  sh: { language: 'shell', kind: 'code' },
  log: { language: 'plaintext', kind: 'text' }
}

export const KB_UPLOAD_ACCEPT = Object.keys(TEXT_FILE_META)
  .map((ext) => '.' + ext)
  .join(',')

export const MAX_IMPORT_SIZE = 1024 * 1024

export function extensionOf(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ''
}

/** 按文件名后缀解析语言与类别；不支持的二进制类型返回 null */
export function resolveFileMeta(name: string): { language: string; kind: KBFileKind } | null {
  return TEXT_FILE_META[extensionOf(name)] ?? null
}
