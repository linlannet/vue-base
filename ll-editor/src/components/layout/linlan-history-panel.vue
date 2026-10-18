<script setup lang="ts">
// 底部「历史记录」面板（对齐官方 magic-api 8088 控制台底部 历史记录 tab）：
// 复用 LinlanHistory 的 diff 视图，数据来自当前激活脚本的 backups 接口。
// 顶部工具栏的「历史记录」按钮仍保留弹窗形态，两者共用同一份数据与组件。
import { inject, nextTick, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { LLEditor } from '@/core/LLEditor'
import request from '@/api/request'
import LinlanHistory from '@/components/editor/linlan-history.vue'

const props = withDefaults(
  defineProps<{ mode?: 'kb' | 'api' | 'fn' | 'ds'; info?: Record<string, unknown> | null }>(),
  { mode: 'api', info: null }
)

const core = inject<Ref<LLEditor | null>>('ll-core')
const historyRef = ref<unknown>(null)
const empty = ref(false)
const loading = ref(false)
// 上一次已加载的文档 id，避免重复 load 造成 monaco model 泄漏
let loadedDocId = ''

// 适配 linlan-history 的 scriptEditor 形参（getValue/setValue）
const editorAdapter = {
  getValue: () => core?.value?.getActiveValue() ?? '',
  setValue: (v: string) => core?.value?.setActiveValue(v)
}

function loadHistory(): void {
  if (props.mode === 'kb') return
  const doc = core?.value?.getActiveDoc() as { id?: string } | undefined | null
  if (!doc || !doc.id) {
    loadedDocId = ''
    empty.value = true
    return
  }
  if (doc.id === loadedDocId) return
  const isApi = props.mode !== 'fn'
  // 对齐 magic-api 2.1.1：GET /backup/{资源id} 返回该资源的备份列表（原 /backups 会忽略 id，返回全量备份）
  const url = `backup/${encodeURIComponent(doc.id as string)}`
  loading.value = true
  empty.value = false
  request
    .send(url, null, { method: 'get' })
    .success((timestampes: unknown[]) => {
      loading.value = false
      if (!timestampes || !timestampes.length) {
        empty.value = true
        loadedDocId = doc.id as string
        return
      }
      loadedDocId = doc.id as string
      nextTick(() => {
        ;(historyRef.value as { load?: (...a: unknown[]) => void })?.load?.(timestampes, { id: doc.id }, editorAdapter, isApi)
      })
    })
    .exception(() => {
      loading.value = false
      empty.value = true
    })
}

onMounted(loadHistory)
// 打开/切换接口或函数后重新拉取
watch(() => props.info, loadHistory)
</script>

<template>
  <div class="ll-history-panel">
    <div v-if="loading" class="ll-history-empty">加载中…</div>
    <div v-else-if="empty" class="ll-history-empty">当前脚本无历史记录</div>
    <linlan-history v-show="!empty" ref="historyRef" />
  </div>
</template>

<style scoped>
.ll-history-panel {
  width: 100%;
  height: 100%;
  overflow: auto;
}
.ll-history-empty {
  padding: 12px;
  color: var(--desc-color, #888);
  font-size: 12px;
}
</style>
