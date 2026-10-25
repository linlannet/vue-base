/**
 * 知识库 zip 导入 / 导出（使用 fflate，纯前端完成）。
 *
 * 导出结构（人类可读）：
 *   知识库名/子目录/文件.md
 *   知识库名/根文件.py
 * 导入时按 zip 顶层层级还原为多个知识库；未知后缀视为二进制并跳过。
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { KBFile, KBFolder, KnowledgeBase } from '@/core/types'
import { resolveFileMeta } from './kbFiles'

export interface ImportedKb {
  name: string
  folders: KBFolder[]
  files: KBFile[]
}

function safeSegment(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || '未命名'
}

/**
 * 修复 zip 文件名乱码：部分工具（如 macOS zip）写 UTF-8 文件名但未设置 UTF-8 标志，
 * fflate 会按 cp437 解码成 “é¡¹ç®...” 这类字符串。这里按原始字节重新按 UTF-8 解码。
 */
function fixEntryName(name: string): string {
  // 含码点 > 255 说明已是正常 Unicode（fflate 已按 UTF-8 标志解码）
  if (!/[^\x00-\x7F]/.test(name)) return name
  if ([...name].some((c) => c.charCodeAt(0) > 255)) return name
  try {
    const bytes = Uint8Array.from([...name].map((c) => c.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return decoded
  } catch {
    return name
  }
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/** 知识库导出为 zip Blob（保留多级目录；空目录不落盘） */
export function buildKbZip(kbs: KnowledgeBase[]): Blob {
  const entries: Record<string, Uint8Array> = {}
  const used = new Set<string>()

  for (const kb of kbs) {
    const folders = kb.folders ?? []
    const byId = new Map(folders.map((f) => [f.id, f]))
    const pathOf = (folderId?: string | null): string[] => {
      const names: string[] = []
      let cur = folderId ? byId.get(folderId) : undefined
      let guard = 0
      while (cur && guard++ < 32) {
        names.unshift(safeSegment(cur.name))
        cur = cur.parentId ? byId.get(cur.parentId) : undefined
      }
      return names
    }
    for (const file of kb.files) {
      const segs = [safeSegment(kb.name), ...pathOf(file.parentId), safeSegment(file.name)]
      let path = segs.join('/')
      let n = 1
      while (used.has(path) || entries[path]) {
        const dot = segs[segs.length - 1].lastIndexOf('.')
        const base = dot > 0 ? segs[segs.length - 1].slice(0, dot) : segs[segs.length - 1]
        const ext = dot > 0 ? segs[segs.length - 1].slice(dot) : ''
        segs[segs.length - 1] = `${base}(${n})${ext}`
        path = segs.join('/')
        n += 1
      }
      used.add(path)
      entries[path] = strToU8(file.content ?? '')
    }
  }

  const data = zipSync(entries, { level: 6 })
  return new Blob([data], { type: 'application/zip' })
}

/** 解析 zip 为知识库集合；顶层目录名即知识库名，根目录散文件归入 fallbackName */
export function parseKbZip(bytes: Uint8Array, fallbackName: string): ImportedKb[] {
  const unzipped = unzipSync(bytes)
  const groups = new Map<string, ImportedKb>()
  const folderIndex = new Map<string, Map<string, string>>()

  const ensureGroup = (name: string): ImportedKb => {
    let g = groups.get(name)
    if (!g) {
      g = { name, folders: [], files: [] }
      groups.set(name, g)
      folderIndex.set(name, new Map())
    }
    return g
  }

  const ensureFolder = (g: ImportedKb, dirPath: string): string | null => {
    if (!dirPath) return null
    const index = folderIndex.get(g.name)!
    if (index.has(dirPath)) return index.get(dirPath)!
    const segs = dirPath.split('/')
    const parentPath = segs.slice(0, -1).join('/')
    const parentId = ensureFolder(g, parentPath)
    const folder: KBFolder = { id: genId('d'), name: segs[segs.length - 1], parentId }
    g.folders.push(folder)
    index.set(dirPath, folder.id)
    return folder.id
  }

  const paths = Object.keys(unzipped).sort()
  for (const rawPath of paths) {
    const path = rawPath.split('/').map(fixEntryName).join('/')
    if (path.endsWith('/')) continue
    const segs = path.split('/').filter(Boolean)
    if (!segs.length) continue
    const fileName = segs[segs.length - 1]
    const meta = resolveFileMeta(fileName)
    if (!meta) continue
    const kbName = segs.length > 1 ? segs[0] : fallbackName
    const group = ensureGroup(kbName)
    const dirPath = segs.slice(1, -1).join('/')
    const parentId = ensureFolder(group, dirPath)
    group.files.push({
      id: genId('f'),
      name: fileName,
      language: meta.language,
      kind: meta.kind,
      content: strFromU8(unzipped[rawPath], true),
      parentId
    })
  }

  return [...groups.values()]
}
