<script setup lang="ts">
import { inject } from 'vue'
import type { LLEditor } from '../core/LLEditor'

const editor = inject<LLEditor>('ll-editor')!
const state = inject<{ openDocs: { id: string; name: string }[]; activeId: string }>('ll-state')!

function switchTo(id: string) {
  editor.switch(id)
}

function close(id: string) {
  editor.close(id)
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
