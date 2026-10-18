import type { StorageOptions } from '../core/types'
import type { StorageProvider } from './StorageProvider'
import { LocalStorageProvider } from './LocalStorageProvider'
import { IndexedDBProvider } from './IndexedDBProvider'

export * from './StorageProvider'
export * from './LocalStorageProvider'
export * from './IndexedDBProvider'

/** 根据配置创建存储后端（统一收敛端点/实现，消除 linlan-editor 散落 API 问题） */
export function createStorage(options?: StorageOptions): StorageProvider {
  switch (options?.type) {
    case 'indexeddb':
      return new IndexedDBProvider()
    case 'rest':
      // P3 由插件提供 RestStorageProvider；P1 暂不支持 rest 存储
      throw new Error('rest storage provider is not available in P1 (provide via plugin in P3)')
    case 'local':
    default:
      return new LocalStorageProvider()
  }
}
