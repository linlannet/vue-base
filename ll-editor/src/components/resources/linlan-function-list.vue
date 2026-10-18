<script setup lang="ts">
// 左侧「函数」资源面板（对齐官方 2.1.1 magic-resource 的头部与树行为）：
// - 头部：搜索框 + 图标组（创建分组 / 全部展开 / 全部折叠 / 按字母升序降序 / 定位当前文件 / 隐藏）
// - 树区：取自 POST /resource 的 function 分支（当前 java-magic-api 未注册函数资源 → 空树 → 暂无函数）
import { computed, inject, onMounted, ref } from 'vue'
import { linlanApi } from '@/api/linlanApi'
import type { LinlanGroup, LinlanTreeNode } from '@/api/linlanApi'
import type { I18n } from '@/i18n'
import { modal } from '@/components/common/modal/index'

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

// 官方资源树：分组节点无 method，函数节点有 method
function isGroup(n: LinlanTreeNode): boolean {
  return !n.method
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
// （函数编辑尚未实现，无活动函数时为空操作；同时供 useMagicRuntime 的全局搜索定位调用）
function position(id?: string): void {
  const target = id || state?.activeId
  if (!target) return
  const el = document.querySelector(`.ll-fn-row[data-id="${target}"]`)
  el?.scrollIntoView({ block: 'center' })
}

// 官方 resource.createGroup：在当前资源类型下创建根分组
async function newGroup(): Promise<void> {
  const name = await modalAny.linlanPrompt(i18n.t('function.groupNamePrompt'), '', i18n.t('function.newGroup'))
  if (!name) return
  try {
    await linlanApi.saveGroup({ name, parentId: '0', type: FN_GROUP_TYPE } satisfies LinlanGroup)
    await refresh()
  } catch (e) {
    error.value = (e as Error).message || i18n.t('function.createFail')
  }
}

onMounted(refresh)
defineExpose({ initData: refresh, position })
</script>

<template>
  <div class="ll-sidebar">
    <div class="ll-sidebar-head">
      <span>{{ i18n.t('function.title') }}</span>
      <span class="ll-sidebar-actions">
        <button class="ll-mini" :title="i18n.t('function.newGroup')" @click="newGroup">
          <i class="ma-icon ma-icon-group-add"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('function.expandAll')" @click="setAllOpened(true)">
          <i class="ma-icon ma-icon-expand"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('function.collapseAll')" @click="setAllOpened(false)">
          <i class="ma-icon ma-icon-collapse"></i>
        </button>
        <button class="ll-mini" :title="asc ? i18n.t('function.sortDesc') : i18n.t('function.sortAsc')" @click="asc = !asc">
          <i class="ma-icon" :class="asc ? 'ma-icon-descending' : 'ma-icon-ascending'"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('function.position')" @click="position()">
          <i class="ma-icon ma-icon-position"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('function.hide')" @click="emit('close')">
          <i class="ma-icon ma-icon-minimize"></i>
        </button>
      </span>
    </div>
    <div class="ll-sidebar-search">
      <input v-model="keyword" :placeholder="i18n.t('function.searchPlaceholder')" />
    </div>
    <div v-if="error" class="ll-tree-error">{{ error }}</div>
    <div v-else-if="!rows.length && !loading" class="ma-empty">{{ i18n.t('function.empty') }}</div>
    <div
      v-for="row in rows"
      :key="row.node.id"
      class="ll-fn-row"
      :class="{ 'll-fn-group': isGroup(row.node) }"
      :data-id="row.node.id"
      :style="{ paddingLeft: row.depth * 12 + 4 + 'px' }"
      @click="toggle(row.node)"
    >
      <span v-if="isGroup(row.node)" class="ll-caret">{{ row.node.opened === false ? '▶' : '▼' }}</span>
      <i v-else class="ma-icon ma-icon-function ll-fn-icon"></i>
      <span class="ll-name" :title="row.node.path || row.node.name">{{ row.node.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.ll-fn-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 0;
  cursor: pointer;
  user-select: none;
}
.ll-fn-row:hover {
  background: #f2f6fc;
}
.ll-fn-row .ll-caret {
  width: 12px;
  text-align: center;
  color: #909399;
}
.ll-fn-icon {
  color: var(--ll-primary, #3a8ee6);
}
</style>
