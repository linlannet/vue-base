<script setup lang="ts">
import { inject } from 'vue'
import type { LLEditor } from '../core/LLEditor'
import type { I18n } from '../i18n'

const editor = inject<LLEditor>('ll-editor')!
const i18n = inject<I18n>('ll-i18n')!

function onNew() {
  const name = window.prompt('文档名称（如 demo.ts）', 'untitled.ts')
  if (!name) return
  const language = name.endsWith('.ts') ? 'typescript' : name.endsWith('.json') ? 'json' : 'javascript'
  editor.open({
    id: `doc-${Date.now()}`,
    name,
    language,
    content: '',
    updatedAt: Date.now()
  })
}

function onSave() {
  editor.save()
}

function onToggleTheme() {
  const cur = document.querySelector('.ll-editor-root')?.getAttribute('data-theme')
  editor.setTheme(cur === 'dark' ? 'light' : 'dark')
}
</script>

<template>
  <div class="ll-editor-toolbar">
    <button class="ll-editor-btn" @click="onNew">{{ i18n.t('toolbar.new') }}</button>
    <button class="ll-editor-btn" @click="onSave">{{ i18n.t('toolbar.save') }}</button>
    <button class="ll-editor-btn" @click="onToggleTheme">{{ i18n.t('toolbar.theme') }}</button>
  </div>
</template>
