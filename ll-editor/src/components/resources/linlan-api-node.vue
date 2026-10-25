<script setup lang="ts">
// 接口资源树的递归节点（对齐官方 2.1.1 magic-tree 的 .magic-tree-item 结构）：
// - 分组节点：caret 图标 + 文件夹图标 + 名称 + (/path)
// - 接口叶子：按方法着色的方法文本（GET/POST/PUT/DEL） + 名称 + (/path)
// 节点级操作不再用行内按钮，改为右键菜单（事件上抛到 linlan-api-list）。
import { computed, inject, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { linlanApi } from '@/api/linlanApi'
import type { LinlanApiEntity, LinlanTreeNode } from '@/api/linlanApi'
import bus from '@/scripts/bus'

const props = withDefaults(
  defineProps<{ node: LinlanTreeNode; depth?: number; groupName?: string; groupPath?: string }>(),
  { depth: 0, groupName: '', groupPath: '' }
)
const openApi = inject<(e: LinlanApiEntity) => void>('ll-api-open')!
const refresh = inject<() => Promise<void>>('ll-tree-refresh')!
const dragId = inject<Ref<string | null>>('ll-drag-id')!
// 头部「全部展开 / 全部折叠 / 搜索」联动：由 linlan-api-list 通过 ll-tree-ctl 下发
const treeCtl = inject<{ keyword: string; asc: boolean; seq: number; value: boolean } | null>('ll-tree-ctl')

const expanded = ref(true)
const error = ref('')
const over = ref(false)

// 「全部展开 / 全部折叠」：seq 变化时按 value 批量下发
watch(
  () => treeCtl?.seq,
  () => {
    if (treeCtl) expanded.value = treeCtl.value
  }
)
// 搜索时自动展开命中分支
watch(
  () => treeCtl?.keyword,
  (kw) => {
    if (kw) expanded.value = true
  }
)

// 官方 2.1.1 资源树：分组节点带 type、无 groupId；接口叶子带 groupId 与 method。
function isGroup(): boolean {
  return !props.node.groupId
}
// 分组链累积（对齐官方顶部标题 groupName/groupPath）
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
// 官方 magic-text-icon：DELETE 显示为 DEL
function methodText(): string {
  const m = method().toUpperCase()
  return m === 'DELETE' ? 'DEL' : m
}
function toggle(): void {
  expanded.value = !expanded.value
}
// 分组行单击 = 选中分组（底部打开分组信息 tab），箭头/双击 = 展开收起
function selectGroup(): void {
  bus.$emit('api-group-selected', { ...props.node })
}
async function open(): Promise<void> {
  if (isGroup()) return
  try {
    const entity = await linlanApi.fetchApi(props.node.id)
    openApi({ ...entity, groupName: currentGroupName.value, groupPath: currentGroupPath.value })
  } catch (e) {
    console.error('[ll-editor] 打开接口失败:', e)
  }
}

// 右键：把菜单所需信息上抛给 linlan-api-list 渲染
function onContextMenu(e: MouseEvent): void {
  bus.$emit('ll-api-tree-context', { x: e.clientX, y: e.clientY, node: props.node, isGroup: isGroup() })
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
  <div class="ll-tree-node" :data-id="node.id" :style="{ paddingLeft: (depth || 0) * 12 + 'px' }">
    <div
      v-if="isGroup()"
      class="ll-tree-group"
      :class="{ 'drag-over': over }"
      draggable="true"
      @click="selectGroup"
      @dblclick="toggle"
      @contextmenu.prevent="onContextMenu"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <i
        class="ll-icon ll-caret"
        :class="expanded ? 'll-icon-arrow-bottom' : 'll-icon-arrow-right'"
        @click.stop="toggle"
      ></i>
      <i class="ll-icon ll-glyph ll-icon-list"></i>
      <label class="ll-name" :title="node.path || node.name">{{ node.name }}</label>
      <span v-if="node.path" class="ll-path">({{ node.path }})</span>
    </div>
    <div
      v-else
      class="ll-tree-api"
      draggable="true"
      @click="open"
      @contextmenu.prevent="onContextMenu"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
    >
      <span class="ll-method" :class="'m-' + method().toUpperCase()">{{ methodText() }}</span>
      <label class="ll-name" :title="node.path || node.name">{{ node.name }}</label>
      <span v-if="node.path" class="ll-path">({{ node.path }})</span>
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
