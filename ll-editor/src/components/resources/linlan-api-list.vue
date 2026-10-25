<script setup lang="ts">
// 左侧「接口」资源面板（对齐官方 2.1.1 magic-resource 的头部与树行为）：
// - 头部：搜索框 + 图标组（创建分组 / 全部展开 / 全部折叠 / 按字母升序降序 / 定位当前文件 / 隐藏）
// - 树区：接口资源树（支持关键字过滤、按名称排序、批量展开收起）
// - 节点级操作：右键菜单（新建接口 / 创建分组 / 修改分组 / 删除分组 / 导出分组 …）
import { computed, inject, onBeforeUnmount, onMounted, provide, reactive, ref } from 'vue'
import type { Ref } from 'vue'
import { linlanApi } from '@/api/linlanApi'
import type { LinlanApiEntity, LinlanGroup, LinlanTreeNode } from '@/api/linlanApi'
import type { I18n } from '@/i18n'
import { modal } from '@/components/common/modal/index'
import bus from '@/scripts/bus'
import LinlanApiNode from '@/components/resources/linlan-api-node.vue'
import LinlanTreeMenu from '@/components/resources/linlan-tree-menu.vue'
import LinlanCopyGroup from '@/components/resources/linlan-copy-group.vue'
import { buildGroupMenu, buildLeafMenu, copyToClipboard } from '@/components/resources/treeMenu'
import type { TreeMenuItem } from '@/components/resources/treeMenu'

const i18n = inject<I18n>('ll-i18n')!
const state = inject<{ activeId: string }>('ll-state')!
const openApi = inject<(e: LinlanApiEntity) => void>('ll-api-open')!
const emit = defineEmits<{ (e: 'close'): void }>()

const tree = ref<LinlanTreeNode[]>([])
const loading = ref(false)
const error = ref('')
// 拖拽移动时记录被拖动节点 id（递归节点共享）
const dragId = ref<string | null>(null)
provide<Ref<string | null>>('ll-drag-id', dragId)

// 头部与树的联动控制（递归节点共享）
const ctl = reactive({ keyword: '', asc: true, seq: 0, value: true })
provide('ll-tree-ctl', ctl)

function pickRoot(data: Record<string, LinlanTreeNode>): LinlanTreeNode[] {
  const api = data['api']
  const root = api ?? Object.values(data)[0]
  // 后端实际返回的子节点结构是 { node: {...}, children: [...] }
  const map = (ns: { node: LinlanTreeNode; children?: unknown[] }[] | undefined): LinlanTreeNode[] =>
    (ns ?? []).map((c) => ({
      ...c.node,
      children: map(c.children as { node: LinlanTreeNode; children?: unknown[] }[] | undefined)
    }))
  return map(root?.children as unknown as { node: LinlanTreeNode; children?: unknown[] }[] | undefined) ?? []
}

async function refresh(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await linlanApi.fetchTree()
    tree.value = pickRoot(data)
  } catch (e) {
    error.value = (e as Error).message || i18n.t('api.loadFail')
    tree.value = []
  } finally {
    loading.value = false
  }
}
provide('ll-tree-refresh', refresh)

// 关键字过滤：自身命中保留整棵子树，否则保留命中的后代分支
function filterNodes(ns: LinlanTreeNode[], kw: string): LinlanTreeNode[] {
  const out: LinlanTreeNode[] = []
  for (const n of ns) {
    const selfHit = String(n.name ?? '').includes(kw) || String(n.path ?? '').includes(kw)
    const kids = n.children?.length ? filterNodes(n.children, kw) : []
    if (selfHit) out.push(n)
    else if (kids.length) out.push({ ...n, children: kids })
  }
  return out
}

// 官方头部升序/降序：按名称排序（返回副本，不改动源数据）
function sortNodes(ns: LinlanTreeNode[], ascending: boolean): LinlanTreeNode[] {
  const arr = [...ns].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'zh-Hans-CN'))
  if (!ascending) arr.reverse()
  return arr.map((n) => (n.children?.length ? { ...n, children: sortNodes(n.children, ascending) } : n))
}

const visibleTree = computed<LinlanTreeNode[]>(() => {
  const kw = ctl.keyword.trim()
  const base = kw ? filterNodes(tree.value, kw) : tree.value
  return sortNodes(base, ctl.asc)
})

function setAllOpened(opened: boolean): void {
  ctl.value = opened
  ctl.seq += 1
}

// 官方 resource.header.position：滚动定位当前打开的文件
function position(id?: string): void {
  const target = id || state?.activeId
  if (!target) return
  const el = document.querySelector(`.ll-tree-node[data-id="${target}"]`)
  el?.scrollIntoView({ block: 'center' })
}

// 新建分组：parentId 为空表示根分组
async function newGroup(parentId?: string | null): Promise<void> {
  const name = await modal.linlanPrompt(i18n.t('api.groupNamePrompt'))
  if (!name) return
  try {
    // type='1' 表示接口分组（magic-api 资源分组类型）
    await linlanApi.saveGroup({ name, parentId: parentId ?? null, type: '1' } satisfies LinlanGroup)
    await refresh()
  } catch (e) {
    error.value = (e as Error).message || i18n.t('api.createFail')
  }
}
provide('ll-tree-new-group', newGroup)

// ===== 右键菜单 =====
const menu = reactive({
  visible: false,
  x: 0,
  y: 0,
  items: [] as TreeMenuItem[],
  node: null as LinlanTreeNode | null,
  isGroup: false
})
function closeMenu(): void {
  menu.visible = false
}

async function createApi(groupId: string): Promise<void> {
  const name = await modal.linlanPrompt(i18n.t('api.apiNamePrompt'), '', i18n.t('api.newApi'))
  if (!name) return
  const entity: LinlanApiEntity = {
    id: '',
    groupId,
    name,
    path: '/' + name,
    method: 'POST',
    script: 'return success();\n',
    parameters: []
  }
  try {
    const id = await linlanApi.saveApi(entity, '1')
    await refresh()
    openApi({ ...entity, id })
  } catch (e) {
    error.value = (e as Error).message || i18n.t('api.createFail')
  }
}

async function renameGroup(node: LinlanTreeNode): Promise<void> {
  const name = await modal.linlanPrompt(i18n.t('api.groupNamePrompt'), node.name)
  if (!name || name === node.name) return
  try {
    await linlanApi.saveGroup({ id: node.id, name, type: node.type ?? '1' } as LinlanGroup)
    await refresh()
  } catch (e) {
    error.value = (e as Error).message || i18n.t('api.createFail')
  }
}

async function copyApi(node: LinlanTreeNode): Promise<void> {
  try {
    const entity = await linlanApi.fetchApi(node.id)
    const name = `${node.name}Copy`
    const copy: LinlanApiEntity = { ...entity, id: '', name, path: '/' + name }
    await linlanApi.saveEntity('api', copy, '1')
    await refresh()
  } catch (e) {
    error.value = (e as Error).message || i18n.t('api.createFail')
  }
}

function removeNode(node: LinlanTreeNode): void {
  modal.linlanConfirm(i18n.t('api.confirmDelete').replace('{name}', node.name), {
    confirm: async () => {
      try {
        await linlanApi.deleteResource(node.id)
        await refresh()
      } catch (e) {
        error.value = (e as Error).message || i18n.t('api.deleteFail')
      }
    }
  })
}

async function exportGroup(node: LinlanTreeNode): Promise<void> {
  try {
    const blob = await linlanApi.downloadZip([], node.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${node.name || 'group'}-${Date.now()}.zip`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = (e as Error).message || i18n.t('api.exportFail')
  }
}

// 复制分组：先在弹窗中选择目标分组，再调用 /resource/folder/copy
const copyGroup = reactive({ visible: false, src: null as LinlanTreeNode | null, target: '0' })
const groupOptions = computed(() => {
  const out: { id: string; name: string; depth: number }[] = []
  const walk = (ns: LinlanTreeNode[], depth: number): void => {
    for (const n of ns) {
      if (!n.groupId) {
        out.push({ id: n.id, name: n.name, depth })
        walk(n.children ?? [], depth + 1)
      }
    }
  }
  walk(tree.value, 0)
  return out
})
function openCopyGroup(node: LinlanTreeNode): void {
  copyGroup.src = node
  copyGroup.target = '0'
  copyGroup.visible = true
}
async function confirmCopyGroup(): Promise<void> {
  const src = copyGroup.src
  if (!src) return
  try {
    await linlanApi.folderCopy(src.id, copyGroup.target)
    copyGroup.visible = false
    await refresh()
  } catch (e) {
    error.value = (e as Error).message || i18n.t('api.createFail')
  }
}

async function lockNode(node: LinlanTreeNode): Promise<void> {
  try {
    await linlanApi.lock(node.id)
    await refresh()
    bus.$emit('status', i18n.t('tree.lockSuccess'))
  } catch (e) {
    error.value = (e as Error).message || i18n.t('tree.lockFail')
  }
}

function onTreeContext(payload: { x: number; y: number; node: LinlanTreeNode; isGroup: boolean }): void {
  menu.node = payload.node
  menu.isGroup = payload.isGroup
  menu.x = payload.x
  menu.y = payload.y
  menu.items = payload.isGroup ? buildGroupMenu(i18n, 'api') : buildLeafMenu(i18n, 'api')
  menu.visible = true
}

async function onMenuCommand(key: string): Promise<void> {
  const node = menu.node
  closeMenu()
  if (!node) return
  switch (key) {
    case 'newLeaf':
      await createApi(node.id)
      break
    case 'newGroup':
      await newGroup(node.id)
      break
    case 'renameGroup':
      await renameGroup(node)
      break
    case 'copyGroup':
      openCopyGroup(node)
      break
    case 'deleteGroup':
      removeNode(node)
      break
    case 'exportGroup':
      await exportGroup(node)
      break
    case 'copyLeaf':
      await copyApi(node)
      break
    case 'copyPath':
      await copyToClipboard(node.path || '')
      break
    case 'copyRelPath':
      await copyToClipboard(String(node.path || '').replace(/^\/+/, ''))
      break
    case 'lock':
      await lockNode(node)
      break
    case 'history':
      // 官方行为：直接切换到底部「历史记录」tab
      bus.$emit('switch-tab', 'history')
      break
    case 'refresh':
      await refresh()
      break
    case 'delete':
      removeNode(node)
      break
    default:
      break
  }
}

onMounted(() => {
  refresh()
  // 顶部「重新加载所有数据」等操作后刷新接口树（对齐官方 top-bar refresh 行为）
  bus.$on('refresh-resource', refresh)
  bus.$on('ll-api-tree-context', onTreeContext)
})
onBeforeUnmount(() => {
  bus.$off('refresh-resource', refresh)
  bus.$off('ll-api-tree-context', onTreeContext)
})

defineExpose({ initData: refresh, position })
</script>

<template>
  <div class="ll-sidebar ll-sidebar-fixed">
    <div class="ll-sidebar-head">
      <span>{{ i18n.t('api.title') }}</span>
      <span class="ll-sidebar-actions">
        <button class="ll-mini" :title="i18n.t('api.newGroup')" @click="newGroup()">
          <i class="ll-icon ll-icon-group-add"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('api.expandAll')" @click="setAllOpened(true)">
          <i class="ll-icon ll-icon-expand"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('api.collapseAll')" @click="setAllOpened(false)">
          <i class="ll-icon ll-icon-collapse"></i>
        </button>
        <button class="ll-mini" :title="ctl.asc ? i18n.t('api.sortDesc') : i18n.t('api.sortAsc')" @click="ctl.asc = !ctl.asc">
          <i class="ll-icon" :class="ctl.asc ? 'll-icon-descending' : 'll-icon-ascending'"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('api.position')" @click="position()">
          <i class="ll-icon ll-icon-position"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('api.hide')" @click="emit('close')">
          <i class="ll-icon ll-icon-minimize"></i>
        </button>
      </span>
    </div>
    <div class="ll-sidebar-search">
      <input v-model="ctl.keyword" :placeholder="i18n.t('api.searchPlaceholder')" />
    </div>
    <div class="ll-tree-scroll">
      <div class="ll-tree-scroll-inner">
        <div v-if="error" class="ll-tree-error">{{ error }}</div>
        <div v-else-if="!visibleTree.length && !loading" class="ll-empty">{{ i18n.t('api.empty') }}</div>
        <linlan-api-node v-for="n in visibleTree" :key="n.id" :node="n" :depth="0" />
      </div>
    </div>
    <linlan-tree-menu
      v-if="menu.visible"
      :items="menu.items"
      :x="menu.x"
      :y="menu.y"
      @command="onMenuCommand"
      @close="closeMenu"
    />
    <!-- 复制分组：选择目标分组 -->
    <linlan-copy-group
      :value="copyGroup.visible"
      :title="i18n.t('tree.copyGroup')"
      :groups="groupOptions"
      :ok-text="i18n.t('common.ok')"
      :cancel-text="i18n.t('common.cancel')"
      :root-text="i18n.t('tree.copyGroupRoot')"
      @confirm="copyGroup.target = $event; confirmCopyGroup()"
      @onClose="copyGroup.visible = false"
    />
  </div>
</template>
