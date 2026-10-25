// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * 分层依赖守卫：
 * - plugin-api 只能依赖 core（稳定白名单），不得依赖具体插件/UI/市场实现
 * - ui / plugins / plugin-runtime 不得反向依赖 plugin-market 内部实现细节
 * - extensions(plugins) 不得依赖 editor/features/menus 之外的内层私有路径（此处简化为白名单）
 */

const sourceRoot = join(process.cwd(), 'src')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (full.endsWith('.ts') && !full.endsWith('.d.ts')) out.push(full)
  }
  return out
}

function collectImports(file: string): string[] {
  const code = readFileSync(file, 'utf8')
  const re = /from\s+['"]([^'"]+)['"]/g
  const matches = [...code.matchAll(re)]
  return matches.map((m) => m[1])
}

function violationsIn(layer: string, allowed: RegExp[]): string[] {
  const layerDir = join(sourceRoot, layer)
  // 层目录可能尚未创建（如 ui/ 暂未落地），视为无违规
  if (!existsSync(layerDir) || !statSync(layerDir).isDirectory()) return []
  const out: string[] = []
  for (const file of walk(layerDir)) {
    for (const imp of collectImports(file)) {
      // 仅检查相对内部路径（@/ 或 ../）
      if (!imp.startsWith('.') && !imp.startsWith('@/')) continue
      const normalized = imp.replace(/^@\//, 'src/')
      if (allowed.some((r) => r.test(normalized))) continue
      if (/(?:^|\/)(?:ui|plugin-market|plugins)(?:\/|$)/.test(normalized)) {
        out.push(`${relative(sourceRoot, file)} -> ${imp}`)
      }
    }
  }
  return out
}

describe('ll-editor 分层依赖护栏', () => {
  it('plugin-api 不得依赖 ui / plugins / plugin-market 内部实现', () => {
    const violations = violationsIn('plugin-api', [/^(?:\.\.\/)?core\//, /^(?:\.\.\/)?types/])
    expect(violations).toEqual([])
  })

  it('ui 不得反向依赖 plugin-market 内部实现细节', () => {
    const violations = violationsIn('ui', [
      /\.\.\/core\//,
      /\.\.\/editor\//,
      /\.\.\/languages\//,
      /\.\.\/storage\//,
      /\.\.\/runtime\//,
      /\.\.\/plugin-api\//,
      /\.\.\/i18n\//,
      /\.\.\/styles\//
    ])
    expect(violations).toEqual([])
  })
})
