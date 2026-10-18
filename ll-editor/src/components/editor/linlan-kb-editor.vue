<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { AiEditor } from 'aieditor'
import 'aieditor/style.css'
import type { Diagnostic, KBFile } from '@/core/types'
import type { ConsoleEntry } from '@/runtime/console'
import { MockDebugAdapter, pythonMockExecutor } from '@/runtime'

const props = defineProps<{ file: KBFile }>()
const emit = defineEmits<{
  (e: 'update:content', content: string): void
  (e: 'console', entry: ConsoleEntry): void
  (e: 'state', s: { running: boolean; paused: boolean }): void
}>()

const dbg = inject<{ consoleEntries: ConsoleEntry[]; diagnostics: Diagnostic[] }>('ll-debug')

const host = ref<HTMLDivElement | null>(null)
let aiEditor: AiEditor | null = null
let adapter: MockDebugAdapter | null = null
const unsub: Array<() => void> = []

let logSeq = 0

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

onMounted(() => {
  if (!host.value) return
  aiEditor = new AiEditor({
    element: host.value,
    placeholder: '开始创作，或让 AI 帮你写下第一段内容',
    content: props.file?.content ?? '',
    editable: true,
    theme: 'light',
    // KB 文件里偶尔会带 ```python ``` 代码块；关闭默认上传和 AI，保持轻量
    uploader: false,
    ai: undefined,
    aiChat: false,
    onUpdate: () => {
      // 内容变化（用户编辑）时把 HTML 回写到 store
      if (aiEditor) emit('update:content', aiEditor.getHTML())
    }
  })
  ensureAdapter(props.file?.language ?? 'plaintext')
})

watch(
  () => props.file?.id,
  () => {
    if (!aiEditor || !props.file) return
    // 切换文件时替换内容，第二个参数 emitUpdate=false 避免重复触发 onUpdate
    aiEditor.setContent(props.file.content ?? '', false)
    ensureAdapter(props.file.language)
  }
)

function run(): void {
  if (!aiEditor || !props.file) return
  ensureAdapter(props.file.language)
  if (adapter) {
    emit('state', { running: true, paused: false })
    void adapter.run({
      id: props.file.id,
      name: props.file.name,
      language: props.file.language,
      content: aiEditor.getText(),
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

defineExpose({ run, continueDbg, stepDbg })

onBeforeUnmount(() => {
  unsub.forEach((fn) => fn())
  unsub.length = 0
  aiEditor?.destroy()
  aiEditor = null
})
</script>

<template>
  <div class="ll-editor-canvas ll-kb-ai-host" ref="host"></div>
</template>