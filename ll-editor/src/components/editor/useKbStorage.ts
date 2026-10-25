/**
 * 知识库本地持久化（首期使用 localStorage）。
 * 存储带版本号；读取失败或结构非法时回退到默认数据，避免脏数据导致页面白屏。
 * 后续接入后端接口时，只需替换 load/save 的实现，组件层无需改动。
 */
import { watch } from 'vue'
import type { KnowledgeBase, KBFile } from '@/core/types'

const STORAGE_KEY = 'll-editor:knowledge-bases'
const STORAGE_VERSION = 1

interface StoredPayload {
  version: number
  knowledgeBases: KnowledgeBase[]
}

function isValidFile(f: unknown): f is KBFile {
  const file = f as KBFile
  return !!file && typeof file.id === 'string' && typeof file.name === 'string' && typeof file.content === 'string'
}

function isValidKb(kb: unknown): kb is KnowledgeBase {
  const base = kb as KnowledgeBase
  return (
    !!base &&
    typeof base.id === 'string' &&
    typeof base.name === 'string' &&
    Array.isArray(base.files) &&
    base.files.every(isValidFile)
  )
}

/** 读取本地保存的知识库；没有或不可用时返回 fallback */
export function loadKnowledgeBases(fallback: KnowledgeBase[]): KnowledgeBase[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const payload = JSON.parse(raw) as StoredPayload | KnowledgeBase[]
    const list = Array.isArray(payload) ? payload : payload?.knowledgeBases
    if (!Array.isArray(list)) return fallback
    return list.filter(isValidKb).map((kb) => {
      const normalized: KnowledgeBase = {
        ...kb,
        folders: Array.isArray(kb.folders) ? kb.folders : []
      }
      normalized.storage = 'file'
      return normalized
    })
  } catch {
    return fallback
  }
}

/** 监听知识库数据变化并写入本地（300ms 防抖，避免连续输入时频繁写入） */
export function useKbPersistence(list: KnowledgeBase[]): void {
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(
    () => list,
    () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        try {
          const payload: StoredPayload = { version: STORAGE_VERSION, knowledgeBases: list }
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
        } catch {
          // 超出配额等场景静默失败，不打断编辑
        }
      }, 300)
    },
    { deep: true }
  )
}
