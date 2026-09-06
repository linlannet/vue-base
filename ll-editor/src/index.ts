/**
 * ll-editor 唯一公共出口（稳定白名单，外部不得依赖 src 内部子目录路径）。
 */
import 'monaco-editor/min/vs/editor/editor.main.css'
import './styles/index.css'

export * from './core'
export * from './languages'
export * from './storage'
export * from './editor'
export * from './plugin-api'

// P2+ 将导出 ./runtime；P3 将导出 ./plugins / ./plugin-runtime / ./plugin-market
