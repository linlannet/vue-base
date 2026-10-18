<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { Ref } from 'vue'
import { linlanApi } from '@/api/linlanApi'
import type { LinlanApiEntity, LinlanTreeNode } from '@/api/linlanApi'
import type { I18n } from '@/i18n'
import { modal } from '@/components/common/modal/index'
import bus from '@/scripts/bus'

const props = withDefaults(
  defineProps<{ node: LinlanTreeNode; depth?: number; groupName?: string; groupPath?: string }>(),
  { depth: 0, groupName: '', groupPath: '' }
)
const i18n = inject<I18n>('ll-i18n')!
const openApi = inject<(e: LinlanApiEntity) => void>('ll-api-open')!
const refresh = inject<() => Promise<void>>('ll-tree-refresh')!
const newGroup = inject<(parentId?: string | null) => Promise<void>>('ll-tree-new-group')!
const dragId = inject<Ref<string | null>>('ll-drag-id')!

const expanded = ref(true)
const error = ref('')
const over = ref(false)

// 官方 2.1.1 资源树：文件夹节点带 type 且无 method；接口叶子无 type 但有 method。
// 旧实现用「是否有子节点」判断，会把空文件夹（如 民政资源池）误判为接口并显示 GET 徽标。
function isGroup(): boolean {
  return !props.node.method
}
// 分组链累积（对齐官方顶部标题 groupName/groupPath）：
// 分组节点向下传递「父链名称/路径 + 自身」，接口叶子直接继承父分组链。
function joinName(parent: string, name?: string): string {
  return [parent, name].filter((x) => !!x).join('/')
}
function joinPath(parent: string, path?: string): string {
  const p = `${parent || ''}/${path || ''}`.replace(/\/+/g, '/')
  return p === '/' ? '' : p
}
const currentGroupName = computed(() => (isGroup() ? joinName(props.groupName, props.node.name) : props.groupName))
const currentGroupPath = computed(() => (isGroup() ? joinPath(props.groupPath, props.node.path) : props.groupPath))
function method(): string {
  return String(props.node.method || props.node.attribute?.method || 'GET')
}
function toggle(): void {
  expanded.value = !expanded.value
}
// 对齐 magic-api-list：分组行单击 = 选中分组（底部打开分组信息 tab），箭头/双击 = 展开收起
function selectGroup(): void {
  bus.$emit('api-group-selected', { ...props.node })
}
async function open(): Promise<void> {
  if (isGroup()) return
  try {
    const entity = await linlanApi.fetchApi(props.node.id)
    // 注入分组链，供顶部标题显示 groupName/name(groupPath/path)
    openApi({ ...entity, groupName: currentGroupName.value, groupPath: currentGroupPath.value })
  } catch (e) {
    console.error('[ll-editor] 打开接口失败:', e)
  }
}

async function newApi(): Promise<void> {
  const name = await modal.linlanPrompt('新建接口名称', '', '新建接口')
  if (!name) return
  const entity: LinlanApiEntity = {
    id: '',
    groupId: props.node.id,
    name,
    path: '/' + name,
    method: 'POST',
    script: 'return success();\n',
    parameters: []
  }
  try {
    const id = await linlanApi.saveApi(props.node.id, entity, '1')
    await refresh()
    openApi({ ...entity, id })
  } catch (e) {
    error.value = (e as Error).message || '创建接口失败'
  }
}

function remove(): void {
  modal.linlanConfirm(`确认删除「${props.node.name}」？`, {
    confirm: async () => {
      try {
        await linlanApi.deleteResource(props.node.id)
        await refresh()
      } catch (e) {
        error.value = (e as Error).message || '删除失败'
      }
    }
  })
}

async function onDrop(): Promise<void> {
  over.value = false
  const src = dragId.value
  dragId.value = null
  if (!src || src === props.node.id) return
  try {
    await linlanApi.moveResource(src, props.node.id)
    await refresh()
  } catch (e) {
    error.value = (e as Error).message || '移动失败'
  }
}
function onDragStart(): void {
  dragId.value = props.node.id
}
function onDragEnd(): void {
  dragId.value = null
  over.value = false
}
function onDragOver(e: DragEvent): void {
  if (dragId.value && dragId.value !== props.node.id) {
    e.preventDefault()
    over.value = true
  }
}
function onDragLeave(): void {
  over.value = false
}
</script>

<template>
  <div class="ll-tree-node" :style="{ paddingLeft: (depth || 0) * 12 + 4 + 'px' }">
    <div
      v-if="isGroup()"
      class="ll-tree-group"
      :class="{ 'drag-over': over }"
      draggable="true"
      @click="selectGroup"
      @dblclick="toggle"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <span class="ll-caret" @click.stop="toggle">{{ expanded ? '▼' : '▶' }}</span>
      <span class="ll-glyph">📁</span>
      <span class="ll-name">{{ node.name }}</span>
      <span class="ll-node-actions" @click.stop>
        <button class="ll-mini ll-mini-sm" :title="i18n.t('api.newApi')" @click="newApi">＋API</button>
        <button class="ll-mini ll-mini-sm" :title="i18n.t('api.newGroup')" @click="newGroup(node.id)">＋</button>
        <button class="ll-mini ll-mini-sm" :title="i18n.t('api.delete')" @click="remove">🗑</button>
      </span>
    </div>
    <div
      v-else
      class="ll-tree-api"
      draggable="true"
      @click="open"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
    >
      <span class="ll-method" :class="'m-' + method().toUpperCase()">{{ method().toUpperCase() }}</span>
      <span class="ll-name">{{ node.name }}</span>
      <span class="ll-node-actions" @click.stop>
        <button class="ll-mini ll-mini-sm" :title="i18n.t('api.delete')" @click="remove">🗑</button>
      </span>
    </div>
    <div v-if="error" class="ll-tree-error">{{ error }}</div>
    <template v-if="isGroup() && expanded">
      <linlan-api-node
        v-for="c in node.children"
        :key="c.id"
        :node="c"
        :depth="(depth || 0) + 1"
        :group-name="currentGroupName"
        :group-path="currentGroupPath"
      />
    </template>
  </div>
</template>
