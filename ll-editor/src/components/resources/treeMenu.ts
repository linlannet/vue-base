// 资源树右键菜单的共享定义（对齐官方 magic-api 2.1.1 的 .magic-context-menu）：
// - 分组节点：新建接口 / 创建分组 / 修改分组 / 删除分组 / 导出分组
// - 叶子节点：复制接口 / 复制路径 / 复制相对路径 / 锁定 / 刷新 / 删除
// 接口树与函数树共用同一套 key，仅「新建接口↔新建函数」「复制接口↔复制函数」按 kind 切换文案。
import type { I18n } from '@/i18n'

export interface TreeMenuItem {
  key: string
  title: string
  icon?: string
  // 与上一项之间显示分隔线
  divided?: boolean
  disabled?: boolean
}

export type ResourceKind = 'api' | 'function'

export function buildGroupMenu(i18n: I18n, kind: ResourceKind): TreeMenuItem[] {
  return [
    { key: 'newLeaf', title: i18n.t(kind === 'function' ? 'tree.newFunction' : 'tree.newApi'), icon: 'll-icon-plus' },
    { key: 'newGroup', title: i18n.t('tree.newGroup'), icon: 'll-icon-group-add' },
    { key: 'renameGroup', title: i18n.t('tree.renameGroup'), icon: 'll-icon-update' },
    { key: 'copyGroup', title: i18n.t('tree.copyGroup'), icon: 'll-icon-copy' },
    { key: 'deleteGroup', title: i18n.t('tree.deleteGroup'), icon: 'll-icon-delete', divided: true },
    { key: 'exportGroup', title: i18n.t('tree.exportGroup'), icon: 'll-icon-download' }
  ]
}

export function buildLeafMenu(i18n: I18n, kind: ResourceKind): TreeMenuItem[] {
  return [
    { key: 'copyLeaf', title: i18n.t(kind === 'function' ? 'tree.copyFunction' : 'tree.copyApi'), icon: 'll-icon-copy' },
    { key: 'copyPath', title: i18n.t('tree.copyPath'), icon: 'll-icon-copy' },
    { key: 'copyRelPath', title: i18n.t('tree.copyRelPath'), icon: 'll-icon-copy', divided: true },
    { key: 'lock', title: i18n.t('tree.lock'), icon: 'll-icon-lock' },
    { key: 'history', title: i18n.t('tree.history'), icon: 'll-icon-history' },
    { key: 'refresh', title: i18n.t('tree.refresh'), icon: 'll-icon-refresh' },
    { key: 'delete', title: i18n.t('tree.delete'), icon: 'll-icon-delete', divided: true }
  ]
}

// 数据源节点：打开 SQL 查询 / 编辑 / 测试连接 / 复制 Key / 复制 URL / 刷新 / 删除
// 配置注册的只读数据源（无 id）不允许编辑与删除，仅可查询与复制
export function buildDatasourceMenu(i18n: I18n, hasId: boolean, hasUrl: boolean): TreeMenuItem[] {
  return [
    { key: 'openSql', title: i18n.t('datasource.openSql'), icon: 'll-icon-datasource' },
    { key: 'edit', title: i18n.t('datasource.edit'), icon: 'll-icon-update', disabled: !hasId },
    { key: 'test', title: i18n.t('datasource.test'), icon: 'll-icon-refresh', disabled: !hasId, divided: true },
    { key: 'copyKey', title: i18n.t('datasource.copyKey'), icon: 'll-icon-copy', divided: true },
    { key: 'copyUrl', title: i18n.t('datasource.copyUrl'), icon: 'll-icon-copy', disabled: !hasUrl },
    { key: 'refresh', title: i18n.t('datasource.refresh'), icon: 'll-icon-refresh', divided: true },
    { key: 'delete', title: i18n.t('datasource.delete'), icon: 'll-icon-delete', disabled: !hasId }
  ]
}

// 复制到剪贴板：优先用 navigator.clipboard，非安全上下文（http）时回退到临时 textarea
export async function copyToClipboard(text: string): Promise<void> {
  if (!text) return
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  } catch {
    /* 复制失败静默忽略 */
  }
}
