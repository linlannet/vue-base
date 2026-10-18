<script setup lang="ts">
import { inject } from 'vue'
import type { LLEditor } from '@/core/LLEditor'

const editor = inject<LLEditor>('ll-editor')!
// KB 与 API 模式共用 openDocs/activeId；KB 模式下 core 为空，
// 由 linlan-script-editor 提供专属切换/关闭动作。
const state = inject<{
  mode: number
  openDocs: { id: string; name: string }[]
  activeId: string
}>('ll-state')!
const kbActions = inject<{ activate: (id: string) => void; close: (id: string) => void } | null>(
  'll-kb-tab-actions',
  null
)

function switchTo(id: string): void {
  if (state.mode === 0 && kbActions) kbActions.activate(id)
  else editor.switch(id)
}
function close(id: string): void {
  if (state.mode === 0 && kbActions) kbActions.close(id)
  else editor.close(id)
}
</script>

<template>
  <div class="ll-editor-tabs">
    <div
      v-for="doc in state.openDocs"
      :key="doc.id"
      class="ll-editor-tab"
      :class="{ active: doc.id === state.activeId }"
      @click="switchTo(doc.id)"
    >
      {{ doc.name }}
      <span class="close" @click.stop="close(doc.id)">✕</span>
    </div>
  </div>
</template>
