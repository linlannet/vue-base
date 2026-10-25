<template>
  <div class="ll-container" style="height: 100vh">
    <MagicEditor :config="config" />
  </div>
</template>

<script setup lang="ts">
import MagicEditor from '@/components/LLEditor.vue'
import type { LLEditorOptions } from '@/core/types'

// LLEditor 根配置（取代原 magic-api 运行时 linlan-editor）：
// - storage 走本地存储（替代原 request.js/webSocket 直连）
// - initialDocs 注入默认文档
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
      content:
        '// ll-editor demo\nconst greeting: string = "hello ll-editor"\nconsole.log(greeting)\n',
      updatedAt: Date.now()
    }
  ]
}
</script>
