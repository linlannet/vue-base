<script setup lang="ts">
import { inject } from 'vue'
import type { I18n } from '@/i18n'
import { renderMarkdown } from '@/languages/preview'
import LinlanMonacoViewer from '@/components/editor/linlan-monaco-viewer.vue'

interface SplitFile {
  id: string
  name: string
  language: string
  content: string
  kind?: string
}

defineProps<{ files: SplitFile[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const i18n = inject<I18n>('ll-i18n')!

/** md 走 markdown 渲染（格式），其余类型交给 monaco 做语法高亮 */
function isMarkdown(f: SplitFile): boolean {
  return f.kind === 'md' || (f.language || '').toLowerCase() === 'markdown'
}

function mdHtml(content: string): string {
  return renderMarkdown(content ?? '')
}
</script>

<template>
  <div class="ll-split-preview">
    <div class="ll-split-bar not-select">
      <span class="ll-split-count">{{ i18n.t('preview.title') }} · {{ files.length }}</span>
      <button class="ll-split-close" :title="i18n.t('preview.close')" @click="emit('close')">
        <i class="ll-icon ll-icon-close" />
      </button>
    </div>
    <div class="ll-split-panes">
      <div v-for="f in files" :key="f.id" class="ll-split-pane">
        <div class="ll-split-pane-head not-select">
          <span class="ll-split-pane-name" :title="f.name">{{ f.name }}</span>
          <span class="ll-split-pane-lang">{{ f.language }}</span>
        </div>
        <div class="ll-split-pane-body">
          <div v-if="isMarkdown(f)" class="ll-editor-preview" v-html="mdHtml(f.content)"></div>
          <LinlanMonacoViewer v-else :value="f.content" :language="f.language" />
        </div>
      </div>
    </div>
  </div>
</template>
