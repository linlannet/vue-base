<script setup lang="ts">
import LLEditor from '@/components/LLEditor.vue'
import type { LLEditorOptions } from '@/core/types'

const config: LLEditorOptions = {
  storage: { type: 'local' },
  defaultLanguage: 'typescript',
  defaultTheme: 'light',
  showSidebar: true,
  showBottomPanel: true,
  locale: 'zh-CN',
  initialDocs: [
    {
      id: 'welcome',
      name: 'welcome.ts',
      language: 'typescript',
      content: '// ll-editor demo\nconst greeting: string = "hello ll-editor"\nconsole.log(greeting)\n',
      updatedAt: Date.now()
    }
  ]
}
</script>

<template>
  <div style="height:100%">
    <LLEditor :config="config" />
  </div>
</template>
