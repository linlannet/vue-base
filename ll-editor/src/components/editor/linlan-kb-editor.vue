<script setup lang="ts">
import { inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor'
import type { Diagnostic, KBFile } from '@/core/types'
import type { ConsoleEntry } from '@/runtime/console'
import { MockDebugAdapter, pythonMockExecutor } from '@/runtime'

/**
 * 知识库文件编辑器：md / py / java / txt 等统一由 Monaco 编辑。
 * 分屏预览与 AI 助手已上提到工作台层（LLEditor.vue），此处只负责单文件编辑与运行调试。
 */
const props = defineProps<{ file: KBFile }>()
const emit = defineEmits<{
  (e: 'update:content', content: string): void
  (e: 'console', entry: ConsoleEntry): void
  (e: 'state', s: { running: boolean; paused: boolean }): void
}>()

const dbg = inject<{ consoleEntries: ConsoleEntry[]; diagnostics: Diagnostic[] }>('ll-debug')

const host = ref<HTMLDivElement | null>(null)
// Monaco 实例不放入响应式对象，避免 Vue 代理导致的重复 layout
let editor: monaco.editor.IStandaloneCodeEditor | null = null
// 外部内容回写编辑器时抑制一次变更回调，避免 update:content 回环
let applying = false
let adapter: MockDebugAdapter | null = null
const unsub: Array<() => void> = []

let logSeq = 0

function resolveLanguage(lang?: string): string {
  const id = (lang || 'plaintext').toLowerCase()
  return monaco.languages.getLanguages().some((l) => l.id === id) ? id : 'plaintext'
}

function ensureAdapter(language: string): void {
  if (adapter && adapter.language === language) return
  unsub.forEach((fn) => fn())
  unsub.length = 0
  adapter = new MockDebugAdapter(language, pythonMockExecutor)
  unsub.push(
    adapter.on('output', (p) => {
      const { level, text } = p as { level: 'log' | 'error' | 'info'; text: string }
      const entry: ConsoleEntry = { id: ++logSeq, level, text, ts: Date.now() }
      emit('console', entry)
      dbg?.consoleEntries.push(entry)
    })
  )
  unsub.push(
    adapter.on('error', (p) => {
      const entry: ConsoleEntry = { id: ++logSeq, level: 'error', text: String((p as Error).message ?? p), ts: Date.now() }
      emit('console', entry)
      dbg?.consoleEntries.push(entry)
    })
  )
  unsub.push(adapter.on('end', () => emit('state', { running: false, paused: false })))
}

function createEditor(): void {
  if (editor || !host.value) return
  const file = props.file
  editor = monaco.editor.create(host.value, {
    value: file?.content ?? '',
    language: resolveLanguage(file?.language),
    theme: 'vs',
    automaticLayout: true,
    fontSize: 13,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    tabSize: 2,
    renderWhitespace: 'selection'
  })
  editor.onDidChangeModelContent(() => {
    if (applying || !editor) return
    emit('update:content', editor.getValue())
  })
}

function destroyEditor(): void {
  editor?.dispose()
  editor = null
}

/** 外部内容回写编辑器（切换文件/导入），不触发 update:content */
function applyValue(text: string): void {
  applying = true
  editor?.setValue(text)
  applying = false
}

function syncEditor(): void {
  const file = props.file
  if (!file) return
  if (!editor) createEditor()
  const model = editor?.getModel()
  if (editor && model) {
    monaco.editor.setModelLanguage(model, resolveLanguage(file.language))
    if (model.getValue() !== (file.content ?? '')) applyValue(file.content ?? '')
  }
  ensureAdapter(file.language)
}

onMounted(async () => {
  await nextTick()
  syncEditor()
})

watch(
  () => props.file?.id,
  async () => {
    await nextTick()
    syncEditor()
  }
)

// 当前编辑器文本（运行时使用）
function currentText(): string {
  return editor?.getValue() ?? ''
}

function run(): void {
  if (!props.file) return
  ensureAdapter(props.file.language)
  if (adapter) {
    emit('state', { running: true, paused: false })
    void adapter.run({
      id: props.file.id,
      name: props.file.name,
      language: props.file.language,
      content: currentText(),
      updatedAt: Date.now()
    })
  }
}
function continueDbg(): void {
  run()
}
function stepDbg(): void {
  run()
}

defineExpose({ run, continueDbg, stepDbg, getContent: currentText })

onBeforeUnmount(() => {
  unsub.forEach((fn) => fn())
  unsub.length = 0
  destroyEditor()
})
</script>

<template>
  <div class="ll-editor-canvas ll-kb-code-host" ref="host"></div>
</template>
