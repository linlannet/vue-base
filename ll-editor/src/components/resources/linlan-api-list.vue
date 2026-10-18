<script setup lang="ts">
import { inject, onMounted, provide, ref } from 'vue'
import type { Ref } from 'vue'
import { linlanApi } from '@/api/linlanApi'
import type { LinlanGroup, LinlanTreeNode } from '@/api/linlanApi'
import type { I18n } from '@/i18n'
import { modal } from '@/components/common/modal/index'
import LinlanApiNode from '@/components/resources/linlan-api-node.vue'

const i18n = inject<I18n>('ll-i18n')!

const tree = ref<LinlanTreeNode[]>([])
const loading = ref(false)
const error = ref('')
// 拖拽移动时记录被拖动节点 id（递归节点共享）
const dragId = ref<string | null>(null)
provide<Ref<string | null>>('ll-drag-id', dragId)

function pickRoot(data: Record<string, LinlanTreeNode>): LinlanTreeNode[] {
  const api = data['api']
  const root = api ?? Object.values(data)[0]
  // 后端实际返回的子节点结构是 { node: {...}, children: [...] }
  // 这里把每项的 node 字段提到顶层，方便模板直接 node.name / node.children 访问
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

// 新建分组：parentId 为空表示根分组
async function newGroup(parentId?: string | null): Promise<void> {
  const name = await modal.linlanPrompt(i18n.t('api.groupNamePrompt'))
  if (!name) return
  try {
    // type='1' 表示接口分组（magic-api 资源分组类型），如后端约定不同可在此调整
    await linlanApi.saveGroup({ name, parentId: parentId ?? null, type: '1' } satisfies LinlanGroup)
    await refresh()
  } catch (e) {
    error.value = (e as Error).message || i18n.t('api.createFail')
  }
}
provide('ll-tree-new-group', newGroup)

onMounted(refresh)
</script>

<template>
  <div class="ll-sidebar">
    <div class="ll-sidebar-head">
      <span>{{ i18n.t('api.title') }}</span>
      <span class="ll-sidebar-actions">
        <button class="ll-mini" :title="i18n.t('api.newGroup')" @click="newGroup()">＋</button>
        <button class="ll-mini" :title="i18n.t('api.refresh')" @click="refresh">⟳</button>
      </span>
    </div>
    <div v-if="error" class="ll-tree-error">{{ error }}</div>
    <div v-if="!tree.length && !loading" class="ma-empty">{{ i18n.t('api.empty') }}</div>
    <linlan-api-node v-for="n in tree" :key="n.id" :node="n" :depth="0" />
  </div>
</template>
