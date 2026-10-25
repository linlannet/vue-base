<script setup lang="ts">
const props = defineProps<{ dir?: 'x' | 'y' }>()
const emit = defineEmits<{ (e: 'resize', delta: number): void }>()

let dragging = false
let last = 0

function onDown(e: MouseEvent): void {
  dragging = true
  last = props.dir === 'x' ? e.clientX : e.clientY
  document.body.style.cursor = props.dir === 'x' ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onMove(e: MouseEvent): void {
  if (!dragging) return
  const cur = props.dir === 'x' ? e.clientX : e.clientY
  emit('resize', cur - last)
  last = cur
}

function onUp(): void {
  dragging = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
}
</script>

<template>
  <div
    class="ll-resizer"
    :class="props.dir === 'y' ? 'll-resizer-y' : 'll-resizer-x'"
    @mousedown="onDown"
  />
</template>
