import type { LanguageInfo } from '../core/types'

/**
 * 语言注册表（P1 内置 JS/TS/JSON/HTML/CSS；P3 可由插件贡献更多语言）
 */
export class LanguageRegistry {
  private readonly map = new Map<string, LanguageInfo>()

  register(info: LanguageInfo): void {
    this.map.set(info.id, info)
  }

  get(id: string): LanguageInfo | undefined {
    return this.map.get(id)
  }

  /** 解析 monaco 使用的 languageId（默认回退到 id） */
  resolveMonacoLanguage(id: string): string {
    return this.map.get(id)?.monacoLanguage ?? id
  }

  list(): LanguageInfo[] {
    return [...this.map.values()]
  }

  has(id: string): boolean {
    return this.map.has(id)
  }
}
