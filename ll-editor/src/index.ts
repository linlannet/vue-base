/**
 * ll-editor 唯一公共出口（稳定白名单，外部不得依赖 src 内部子目录路径）。
 */
import 'monaco-editor/min/vs/editor/editor.main.css'
// 图标字体（iconfont 字形 + 蓝色线性图标覆盖）与全局样式统一由 assets 提供
import './assets/iconfont/iconfont.css'
import './assets/index.css'

export * from './core'
export * from './languages'
export * from './storage'
export * from './editor'
export * from './plugin-api'
export * from './runtime'

// P3 将导出 ./plugins / ./plugin-runtime / ./plugin-market
