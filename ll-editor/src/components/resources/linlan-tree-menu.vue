<script setup lang="ts">
// 资源树右键菜单（对齐官方 .magic-context-menu：固定定位、无内边距、项高约 22px、hover 高亮）
// Teleport 到 body，避免被侧栏 overflow 裁剪；点击外部 / Esc / 滚动时关闭。
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { TreeMenuItem } from '@/components/resources/treeMenu'

const props = defineProps<{ items: TreeMenuItem[]; x: number; y: number }>()
const emit = defineEmits<{ (e: 'command', key: string): void; (e: 'close'): void }>()

const menuEl = ref<HTMLElement | null>(null)
const left = ref(props.x)
const top = ref(props.y)

function adjust(): void {
  const w = menuEl.value?.offsetWidth ?? 150
  const h = menuEl.value?.offsetHeight ?? props.items.length * 24
  const maxL = window.innerWidth - 4
  const maxT = window.innerHeight - 4
  left.value = props.x + w > maxL ? Math.max(4, props.x - w) : props.x
  top.value = props.y + h > maxT ? Math.max(4, props.y - h) : props.y
}

function onDocMouseDown(e: MouseEvent): void {
  if (menuEl.value && !menuEl.value.contains(e.target as Node)) emit('close')
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
}
function onScroll(): void {
  emit('close')
}

onMounted(() => {
  adjust()
  document.addEventListener('mousedown', onDocMouseDown, true)
  document.addEventListener('keydown', onKey, true)
  window.addEventListener('scroll', onScroll, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown, true)
  document.removeEventListener('keydown', onKey, true)
  window.removeEventListener('scroll', onScroll, true)
})

function pick(item: TreeMenuItem): void {
  if (item.disabled) return
  emit('command', item.key)
}
</script>

<template>
  <Teleport to="body">
    <ul ref="menuEl" class="ll-tree-menu" :style="{ left: left + 'px', top: top + 'px' }" @contextmenu.prevent>
      <template v-for="(item, index) in items" :key="item.key + '_' + index">
        <li v-if="item.divided && index > 0" class="ll-tree-menu-divided"></li>
        <li
          class="ll-tree-menu-item"
          :class="{ disabled: item.disabled }"
          @click="pick(item)"
        >
          <i v-if="item.icon" class="ll-icon" :class="item.icon"></i>
          <span class="ll-tree-menu-title">{{ item.title }}</span>
        </li>
      </template>
    </ul>
  </Teleport>
</template>
