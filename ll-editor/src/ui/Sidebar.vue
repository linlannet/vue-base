<script setup lang="ts">
import { inject, onMounted } from 'vue'
import type { LLEditor } from '../core/LLEditor'
import type { I18n } from '../i18n'

const editor = inject<LLEditor>('ll-editor')!
const i18n = inject<I18n>('ll-i18n')!
const state = inject<{ storedDocs: { id: string; name: string; language: string }[] }>('ll-state')!

async function refresh() {
  state.storedDocs = await editor.list()
}

onMounted(refresh)

function open(id: string) {
  editor.load(id)
}
</script>

<template>
  <div class="ll-editor-sidebar">
    <div style="display:flex;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #eee">
      <strong>{{ i18n.t('sidebar.title') }}</strong>
      <button class="ll-editor-btn" @click="refresh">{{ i18n.t('sidebar.refresh') }}</button>
    </div>
    <div v-if="state.storedDocs.length === 0" class="ll-editor-list-item" style="color:#999">
      {{ i18n.t('sidebar.empty') }}
    </div>
    <div v-for="d in state.storedDocs" :key="d.id" class="ll-editor-list-item" @click="open(d.id)">
      {{ d.name }}
    </div>
  </div>
</template>
