<script setup lang="ts">
// 左侧「函数」资源面板（对齐官方 2.1.1 magic-resource 的头部与树行为）：
// - 头部：搜索框 + 图标组（创建分组 / 全部展开 / 全部折叠 / 按字母升降序 / 定位当前文件 / 隐藏）
// - 树区：取自 POST /resource 的 function 分支
// - 节点级操作：右键菜单（新建函数 / 创建分组 / 修改分组 / 删除分组 / 导出分组 …）
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { linlanApi } from '@/api/linlanApi'
import type { LinlanApiEntity, LinlanGroup, LinlanTreeNode } from '@/api/linlanApi'
import type { I18n } from '@/i18n'
import { modal } from '@/components/common/modal/index'
import bus from '@/scripts/bus'
import LinlanTreeMenu from '@/components/resources/linlan-tree-menu.vue'
import LinlanCopyGroup from '@/components/resources/linlan-copy-group.vue'
import { buildGroupMenu, buildLeafMenu, copyToClipboard } from '@/components/resources/treeMenu'
import type { TreeMenuItem } from '@/components/resources/treeMenu'

// modal/index.ts 是 @ts-nocheck，方法 arity 未标注，统一走 any 调用
const modalAny = modal as any

interface FnNode extends LinlanTreeNode {
  // 官方 magic-resource 用数据字段 opened 驱动展开状态，便于「全部展开 / 全部折叠」批量生效
  opened?: boolean
}

const i18n = inject<I18n>('ll-i18n')!
const state = inject<{ activeId: string }>('ll-state')!
const emit = defineEmits<{ (e: 'close'): void }>()

// /resource/folder/save 的 type 必须是资源类型字符串：
// 实测 type='function' 可创建函数分组，传 '2' 会返回「不支持该分组类型」
const FN_GROUP_TYPE = 'function'
// /resource/file/{folder}/save 的 folder 同样用资源类型字符串
const FN_ENTITY_FOLDER = 'function'

const tree = ref<FnNode[]>([])
const keyword = ref('')
const loading = ref(false)
const error = ref('')
// 官方头部：按字母升序/降序切换（图标随状态切换）
const asc = ref(true)

// 后端返回结构为 { node: {...}, children: [...] }，把 node 提到顶层便于模板访问
function mapNodes(ns: { node: LinlanTreeNode; children?: unknown[] }[] | undefined): FnNode[] {
  return (ns ?? []).map((c) => ({
    ...c.node,
    children: mapNodes(c.children as { node: LinlanTreeNode; children?: unknown[] }[])
  }))
}

async function refresh(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = (await linlanApi.fetchTree()) as unknown as Record<
      string,
      { children?: { node: LinlanTreeNode; children?: unknown[] }[] }
    >
    tree.value = mapNodes(data?.function?.children)
  } catch (e) {
    error.value = (e as Error).message || i18n.t('function.loadFail')
    tree.value = []
  } finally {
    loading.value = false
  }
}

// 官方 resource.header.expand / collapse：递归设置 opened
function setAllOpened(opened: boolean): void {
  const walk = (ns: FnNode[]): void => {
    ns.forEach((n) => {
      n.opened = opened
      if (n.children?.length) walk(n.children)
    })
  }
  walk(tree.value)
}

// 官方头部升序/降序：按名称排序（返回副本，不改动源数据）
function sortNodes(ns: FnNode[], ascending: boolean): FnNode[] {
  const arr = [...ns].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'zh-Hans-CN'))
  if (!ascending) arr.reverse()
  return arr.map((n) => (n.children?.length ? { ...n, children: sortNodes(n.children, ascending) } : n))
}

// 官方资源树：分组节点无 groupId（只有 type）；函数文件节点带 groupId（函数无 method）
function isGroup(n: LinlanTreeNode): boolean {
  return !n.groupId
}

function matched(n: FnNode, kw: string): boolean {
  const hit = (x: FnNode): boolean => String(x.name ?? '').includes(kw) || String(x.path ?? '').includes(kw)
  return hit(n) || (n.children ?? []).some((c) => matched(c, kw))
}

// 展开后的可见行：分组默认展开（opened=false 才收起），搜索时自动展开命中分支
const rows = computed<{ node: FnNode; depth: number }[]>(() => {
  const kw = keyword.value.trim()
  const out: { node: FnNode; depth: number }[] = []
  const walk = (ns: FnNode[], depth: number): void => {
    for (const n of sortNodes(ns, asc.value)) {
      if (kw && !matched(n, kw)) continue
      out.push({ node: n, depth })
      const open = kw ? true : n.opened !== false
      if (isGroup(n) && n.children?.length && open) walk(n.children, depth + 1)
    }
  }
  walk(tree.value, 0)
  return out
})

function toggle(n: FnNode): void {
  if (isGroup(n)) n.opened = n.opened === false
}

// 官方 resource.header.position：滚动定位当前打开的文件
function position(id?: string): void {
  const target = id || state?.activeId
  if (!target) return
  const el = document.querySelector(`.ll-fn-row[data-id="${target}"]`)
  el?.scrollIntoView({ block: 'center' })
}

// 官方 resource.createGroup：在当前资源类型下创建根分组
async function newGroup(parentId?: string | null): Promise<void> {
  const name = await modalAny.linlanPrompt(i18n.t('function.groupNamePrompt'), '', i18n.t('function.newGroup'))
  if (!name) return
  try {
    await linlanApi.saveGroup({ name, parentId: parentId ?? '0', type: FN_GROUP_TYPE } satisfies LinlanGroup)
    await refresh()
  } catch (e) {
    error.value = (e as Error).message || i18n.t('function.createFail')
  }
}

async function createFunction(groupId: string): Promise<void> {
  const name = await modalAny.linlanPrompt(i18n.t('function.functionNamePrompt'), '', i18n.t('function.newFunction'))
  if (!name) return
  const entity: LinlanApiEntity = {
    id: '',
    groupId,
    name,
    path: '/' + name,
    script: 'return "";\n',
    parameters: []
  }
  try {
    await linlanApi.saveEntity(FN_ENTITY_FOLDER, entity, '1')
    await refresh()
  } catch (e) {
    error.value = (e as Error).message || i18n.t('function.createFail')
  }
}

async function renameGroup(node: LinlanTreeNode): Promise<void> {
  const name = await modalAny.linlanPrompt(i18n.t('function.groupNamePrompt'), node.name)
  if (!name || name === node.name) return
  try {
    await linlanApi.saveGroup({ id: node.id, name, type: node.type ?? FN_GROUP_TYPE } as LinlanGroup)
    await refresh()
  } catch (e) {
    error.value = (e as Error).message || i18n.t('function.createFail')
  }
}

async function copyFunction(node: LinlanTreeNode): Promise<void> {
  try {
    const entity = await linlanApi.fetchApi(node.id)
    const name = `${node.name}Copy`
    const copy: LinlanApiEntity = { ...entity, id: '', name, path: '/' + name }
    await linlanApi.saveEntity(FN_ENTITY_FOLDER, copy, '1')
    await refresh()
  } catch (e) {
    error.value = (e as Error).message || i18n.t('function.createFail')
  }
}

function removeNode(node: LinlanTreeNode): void {
  modalAny.linlanConfirm(i18n.t('api.confirmDelete').replace('{name}', node.name), {
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

async function lockNode(node: LinlanTreeNode): Promise<void> {
  try {
    await linlanApi.lock(node.id)
    await refresh()
    bus.$emit('status', i18n.t('tree.lockSuccess'))
  } catch (e) {
    error.value = (e as Error).message || i18n.t('tree.lockFail')
  }
}

// ===== 复制分组 =====
const copyGroup = reactive({ visible: false, src: null as LinlanTreeNode | null, target: '0' })
const groupOptions = computed(() => {
  const out: { id: string; name: string; depth: number }[] = []
  const walk = (ns: FnNode[], depth: number): void => {
    for (const n of ns) {
      if (isGroup(n)) {
        out.push({ id: n.id, name: n.name, depth })
        walk((n.children ?? []) as FnNode[], depth + 1)
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

function onContextMenu(e: MouseEvent, node: FnNode): void {
  const group = isGroup(node)
  menu.node = node
  menu.isGroup = group
  menu.x = e.clientX
  menu.y = e.clientY
  menu.items = group ? buildGroupMenu(i18n, 'function') : buildLeafMenu(i18n, 'function')
  menu.visible = true
}

async function onMenuCommand(key: string): Promise<void> {
  const node = menu.node
  closeMenu()
  if (!node) return
  switch (key) {
    case 'newLeaf':
      await createFunction(node.id)
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
      await copyFunction(node)
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
  bus.$on('refresh-resource', refresh)
})
onBeforeUnmount(() => {
  bus.$off('refresh-resource', refresh)
})
defineExpose({ initData: refresh, position })
</script>

<template>
  <div class="ll-sidebar">
    <div class="ll-sidebar-head">
      <span>{{ i18n.t('function.title') }}</span>
      <span class="ll-sidebar-actions">
        <button class="ll-mini" :title="i18n.t('function.newGroup')" @click="newGroup()">
          <i class="ll-icon ll-icon-group-add"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('function.expandAll')" @click="setAllOpened(true)">
          <i class="ll-icon ll-icon-expand"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('function.collapseAll')" @click="setAllOpened(false)">
          <i class="ll-icon ll-icon-collapse"></i>
        </button>
        <button class="ll-mini" :title="asc ? i18n.t('function.sortDesc') : i18n.t('function.sortAsc')" @click="asc = !asc">
          <i class="ll-icon" :class="asc ? 'll-icon-descending' : 'll-icon-ascending'"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('function.position')" @click="position()">
          <i class="ll-icon ll-icon-position"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('function.hide')" @click="emit('close')">
          <i class="ll-icon ll-icon-minimize"></i>
        </button>
      </span>
    </div>
    <div class="ll-sidebar-search">
      <input v-model="keyword" :placeholder="i18n.t('function.searchPlaceholder')" />
    </div>
    <div v-if="error" class="ll-tree-error">{{ error }}</div>
    <div v-else-if="!rows.length && !loading" class="ll-empty">{{ i18n.t('function.empty') }}</div>
    <div
      v-for="row in rows"
      :key="row.node.id"
      class="ll-fn-row"
      :data-id="row.node.id"
      :style="{ paddingLeft: row.depth * 17 + 'px' }"
      @click="toggle(row.node)"
      @contextmenu.prevent="onContextMenu($event, row.node)"
    >
      <template v-if="isGroup(row.node)">
        <i
          class="ll-icon ll-caret"
          :class="row.node.opened === false ? 'll-icon-arrow-right' : 'll-icon-arrow-bottom'"
        ></i>
        <i class="ll-icon ll-glyph ll-icon-list"></i>
        <label class="ll-name" :title="row.node.path || row.node.name">{{ row.node.name }}</label>
        <span v-if="row.node.path" class="ll-path">({{ row.node.path }})</span>
      </template>
      <template v-else>
        <span class="ll-method m-FUNCTION">Fn</span>
        <label class="ll-name" :title="row.node.path || row.node.name">{{ row.node.name }}</label>
        <span v-if="row.node.path" class="ll-path">({{ row.node.path }})</span>
      </template>
    </div>
    <linlan-tree-menu
      v-if="menu.visible"
      :items="menu.items"
      :x="menu.x"
      :y="menu.y"
      @command="onMenuCommand"
      @close="closeMenu"
    />
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
