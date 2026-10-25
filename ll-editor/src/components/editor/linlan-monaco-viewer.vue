<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor'
import store from '@/scripts/store'

/**
 * 只读 Monaco 查看器：复用 monaco 的语法高亮/折叠能力渲染文件内容（预览场景不参与编辑）。
 */
const props = defineProps<{ value?: string; language?: string }>()

const host = ref<HTMLDivElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let model: monaco.editor.ITextModel | null = null

// 常见后缀 / 简写 → monaco 语言 id
const ALIAS: Record<string, string> = {
  md: 'markdown',
  py: 'python',
  js: 'javascript',
  ts: 'typescript',
  yml: 'yaml',
  sh: 'shell',
  txt: 'plaintext'
}

function resolveLanguage(lang?: string): string {
  const raw = (lang || '').toLowerCase()
  const id = ALIAS[raw] ?? raw
  if (!id) return 'plaintext'
  return monaco.languages.getLanguages().some((l) => l.id === id) ? id : 'plaintext'
}

onMounted(() => {
  if (!host.value) return
  model = monaco.editor.createModel(props.value ?? '', resolveLanguage(props.language))
  editor = monaco.editor.create(host.value, {
    model,
    // 与中栏编辑器保持同一主题（皮肤名即 monaco 主题名）
    theme: (store.get('skin') as string) || 'default',
    readOnly: true,
    domReadOnly: true,
    automaticLayout: true,
    fontSize: 12,
    lineNumbersMinChars: 3,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    folding: true,
    renderLineHighlight: 'none',
    contextmenu: false,
    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
  })
})

watch(
  () => props.value,
  (v) => {
    if (model && model.getValue() !== (v ?? '')) model.setValue(v ?? '')
  }
)
watch(
  () => props.language,
  (l) => {
    if (model) monaco.editor.setModelLanguage(model, resolveLanguage(l))
  }
)

onBeforeUnmount(() => {
  editor?.dispose()
  model?.dispose()
  editor = null
  model = null
})
</script>

<template>
  <div ref="host" class="ll-monaco-viewer"></div>
</template>

<style scoped>
/* Monaco 采用绝对定位，宿主必须显式撑满高度，否则折叠为 0 高度不可见 */
.ll-monaco-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}
</style>
