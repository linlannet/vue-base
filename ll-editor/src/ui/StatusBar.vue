<script setup lang="ts">
import { inject } from 'vue'
import type { I18n } from '../i18n'
import type { LLEditor } from '../core/LLEditor'

const editor = inject<LLEditor>('ll-editor')!
const i18n = inject<I18n>('ll-i18n')!
const state = inject<{ openDocs: { id: string; name: string }[]; activeId: string }>('ll-state')!
</script>

<template>
  <div class="ll-editor-statusbar">
    <span>{{ i18n.t('status.docs') }}: {{ state.openDocs.length }}</span>
    <span v-if="editor.getPluginApi().getActiveDoc()">
      · {{ editor.getPluginApi().getActiveDoc()!.language }}
    </span>
  </div>
</template>
