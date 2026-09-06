/**
 * 极简 i18n（P1 仅中文；预留 zh-CN / en 切换，菜单/面板文案抽离至此）
 */
const DICT: Record<string, Record<string, string>> = {
  'zh-CN': {
    'toolbar.new': '新建',
    'toolbar.save': '保存',
    'toolbar.theme': '主题',
    'sidebar.title': '资源管理',
    'sidebar.refresh': '刷新',
    'sidebar.empty': '暂无已保存文档',
    'bottom.placeholder': '调试面板（P2 启用）',
    'status.docs': '文档'
  },
  en: {
    'toolbar.new': 'New',
    'toolbar.save': 'Save',
    'toolbar.theme': 'Theme',
    'sidebar.title': 'Resources',
    'sidebar.refresh': 'Refresh',
    'sidebar.empty': 'No saved documents',
    'bottom.placeholder': 'Debug panel (enabled in P2)',
    'status.docs': 'docs'
  }
}

export function createI18n(locale: 'zh-CN' | 'en' = 'zh-CN') {
  return {
    locale,
    t(key: string): string {
      return DICT[locale]?.[key] ?? DICT['zh-CN'][key] ?? key
    }
  }
}

export type I18n = ReturnType<typeof createI18n>
