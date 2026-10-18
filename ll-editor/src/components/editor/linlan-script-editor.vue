<script setup lang="ts">
import { inject, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { I18n } from '@/i18n'
import { LLEditor } from '@/core/LLEditor'
import type { LLEditorOptions, KBFile, KnowledgeBase, Diagnostic, EditorDoc } from '@/core/types'
import type { ConsoleEntry } from '@/runtime/console'
import type { LinlanApiEntity } from '@/api/linlanApi'
import LinlanKbEditor from '@/components/editor/linlan-kb-editor.vue'
import LinlanTabs from '@/components/layout/linlan-tabs.vue'
import LinlanHistory from '@/components/editor/linlan-history.vue'
import LinlanDialog from '@/components/common/modal/linlan-dialog.vue'
import request from '@/api/request'
import bus from '@/scripts/bus'
import { modal } from '@/components/common/modal/index'

const props = defineProps<{
  mode: number
  file: KBFile | null
  Config?: LLEditorOptions
}>()
const emit = defineEmits<{ (e: 'update:content', content: string): void }>()

const core = inject<Ref<LLEditor | null>>('ll-core')!
const i18n = inject<I18n>('ll-i18n')!
const state = inject<{
  mode: number
  knowledgeBases: KnowledgeBase[]
  selectedKbId: string
  selectedFileId: string
  openDocs: { id: string; name: string }[]
  activeId: string
  running: boolean
  paused: boolean
  variables: Record<string, unknown>
}>('ll-state')!
const dbg = inject<{ consoleEntries: ConsoleEntry[]; diagnostics: Diagnostic[] }>('ll-debug')!

const apiHost = ref<HTMLDivElement | null>(null)
const kbRef = ref<InstanceType<typeof LinlanKbEditor> | null>(null)
let coreInst: LLEditor | null = null
let offs: Array<() => void> = []
let logSeq = 0

// ===== 模式间 tab 缓存（KB 与 API 共用 state.openDocs/activeId） =====
// KB 模式无 core，离开时把 openDocs 快照存入 KB 缓存；
// API 模式的文档（含最新内容）在 doc:opened/changed 事件中持续写入 API 缓存。
let kbDocsCache: { id: string; name: string }[] = []
let kbActiveCache = ''
const apiDocsCache = new Map<string, EditorDoc>()
let apiActiveCache = ''
// 函数模式（mode 2）独立缓存：与接口模式隔离，避免切到「函数」后中栏仍显示接口脚本
const fnDocsCache = new Map<string, EditorDoc>()
let fnActiveCache = ''

const isFnMode = (): boolean => props.mode === 2
const docsCache = (): Map<string, EditorDoc> => (isFnMode() ? fnDocsCache : apiDocsCache)

function buildCore(opts: LLEditorOptions): void {
  if (!apiHost.value) return
  const cache = docsCache()
  const cached = [...cache.values()]
  coreInst = new LLEditor(apiHost.value, {
    showSidebar: false,
    showBottomPanel: false,
    // 函数模式无独立文档来源，中栏保持空态（不复用接口文档，也不注入示例脚本）
    initialDocs: cached.length
      ? cached
      : isFnMode()
        ? []
        : opts.initialDocs ?? [
            {
              id: 'api1',
              name: 'api.js',
              language: 'magicscript',
              content: "// 接口模式\nconsole.log('hello from api mode')\n",
              updatedAt: Date.now()
            }
          ]
  })
  core.value = coreInst
  offs = [
    coreInst.bus.on('doc:opened', (d) => {
      cache.set(d.id, d)
      if (!state.openDocs.find((o) => o.id === d.id)) state.openDocs.push({ id: d.id, name: d.name })
    }),
    coreInst.bus.on('doc:changed', (d) => {
      // 内容变化持续写入缓存，保证模式切换后可完整恢复
      cache.set(d.id, d)
    }),
    coreInst.bus.on('doc:closed', ({ id }) => {
      cache.delete(id)
      state.openDocs = state.openDocs.filter((o) => o.id !== id)
    }),
    coreInst.bus.on('tab:switched', ({ id }) => {
      state.activeId = id
    }),
    coreInst.bus.on('run:started', () => {
      state.running = true
      state.paused = false
    }),
    coreInst.bus.on('debug:breakpoint', (e) => {
      state.running = true
      state.paused = true
      state.variables = e.vars ?? {}
    }),
    coreInst.bus.on('debug:resumed', () => {
      state.paused = false
    }),
    coreInst.bus.on('run:ended', (r) => {
      state.running = false
      state.paused = false
      const vars = (r as unknown as { vars?: Record<string, unknown> })?.vars
      if (vars) state.variables = vars
    }),
    coreInst.bus.on('run:output', (t) => {
      dbg.consoleEntries.push({ id: ++logSeq, level: 'log', text: String(t), ts: Date.now() })
    }),
    coreInst.bus.on('run:error', (e) => {
      dbg.consoleEntries.push({ id: ++logSeq, level: 'error', text: String((e as Error).message ?? e), ts: Date.now() })
    }),
    coreInst.bus.on('problems:changed', (d) => {
      dbg.diagnostics.length = 0
      ;(d as Diagnostic[]).forEach((x) => dbg.diagnostics.push(x))
    })
  ]
  // 恢复上次的激活 tab（按当前模式对应的缓存判断）
  const activeCache = isFnMode() ? fnActiveCache : apiActiveCache
  if (activeCache && cache.has(activeCache)) {
    coreInst.switch(activeCache)
  }
  // 以 core 的实际文档集为准同步 tab 状态：
  // 无论走缓存恢复还是首次注入，都要把 openDocs 补齐，否则从函数模式切回接口模式时
  // 中栏已恢复文档内容，tab 条却因 openDocs 为空而不显示
  state.openDocs.length = 0
  coreInst.getPluginApi().listDocs().forEach((d) => state.openDocs.push({ id: d.id, name: d.name }))
  state.activeId = coreInst.getActiveDoc()?.id ?? ''
}

/**
 * 模式切换：清理旧 core 与事件订阅，按目标模式缓存/恢复 tab 集。
 * - 离开 KB 模式：openDocs 快照存 KB 缓存，返回时原样恢复；
 * - 离开接口模式（1）：激活 id 存接口缓存，文档内容已随事件入缓存，重建后重开；
 * - 离开函数模式（2）：激活 id 存函数缓存（函数文档与接口文档互相隔离）。
 */
function rebuildCore(newMode: number, oldMode: number): void {
  if (oldMode === 0) {
    kbDocsCache = [...state.openDocs]
    kbActiveCache = state.activeId
  } else if (oldMode === 1) {
    apiActiveCache = state.activeId
  } else if (oldMode > 0) {
    fnActiveCache = state.activeId
  }
  offs.forEach((o) => o())
  offs = []
  coreInst?.dispose()
  coreInst = null
  core.value = null
  state.openDocs.length = 0
  state.activeId = ''
  if (newMode === 0) {
    // 恢复 KB tabs
    state.openDocs.push(...kbDocsCache)
    state.activeId = kbActiveCache
  } else {
    // API 模式重建：等下一次 tick 让 v-if 渲染出 apiHost 容器，再挂载 Monaco
    nextTick(() => {
      if (apiHost.value) buildCore(props.Config ?? {})
    })
  }
}

watch(() => props.mode, (nv, ov) => rebuildCore(nv as number, ov as number))
onMounted(() => {
  rebuildCore(props.mode, -1)
  bus.$on('viewHistory', viewHistory)
})
onBeforeUnmount(() => {
  bus.$off('viewHistory', viewHistory)
  offs.forEach((o) => o())
  offs = []
  coreInst?.dispose()
  coreInst = null
  core.value = null
})

// ===== 历史记录（对齐 magic-script-editor viewHistory） =====
const showHistoryDialog = ref(false)
const historyRef = ref<InstanceType<typeof LinlanHistory> | null>(null)
const historyDocName = ref('')
// 适配 linlan-history 的 scriptEditor 形参（getValue/setValue）
const historyEditorAdapter = {
  getValue: () => coreInst?.getActiveValue() ?? '',
  setValue: (v: string) => coreInst?.setActiveValue(v)
}
function viewHistory(): void {
  const doc = coreInst?.getActiveDoc()
  if (!doc) return
  const isApi = props.mode === 1
  if (!doc.id) {
    ;(modal as any).linlanAlert('当前是新增脚本,无法查看历史记录')
    return
  }
  const url = isApi ? `backups?id=${doc.id}` : `function/backups?id=${doc.id}`
  request.send(url, null, { method: 'get' }).success((timestampes: any[]) => {
    if (timestampes && timestampes.length > 0) {
      historyDocName.value = doc.name
      showHistoryDialog.value = true
      nextTick(() => {
        ;(historyRef.value as any)?.load?.(timestampes, { id: doc.id }, historyEditorAdapter, isApi)
      })
    } else {
      ;(modal as any).linlanAlert('当前脚本无历史记录', { title: '历史记录' })
    }
  })
}

function run(): void {
  if (props.mode === 0) kbRef.value?.run()
  else coreInst?.run()
}
function continueDbg(): void {
  if (props.mode === 0) kbRef.value?.continueDbg()
  else coreInst?.continueDebug()
}
function stepDbg(): void {
  if (props.mode === 0) kbRef.value?.stepDbg()
  else coreInst?.stepDebug()
}
function save(): void {
  if (props.mode !== 0) coreInst?.save()
}
function openApi(entity: LinlanApiEntity): void {
  core.value?.open({
    id: entity.id,
    name: entity.name,
    // magic-script 非标准 JS（db/http 注入全局、顶层 return），用自定义 magicscript 语言，
    // 避免 Monaco 启用 JS/TS 语言服务后对内存模型抛 "Could not find source file" 并反复重启 worker
    language: 'magicscript',
    content: entity.script ?? '',
    updatedAt: Date.now(),
    ...(entity.groupName ? { groupName: entity.groupName } : {}),
    ...(entity.groupPath ? { groupPath: entity.groupPath } : {})
  })
}
function getContent(): string {
  const doc = core.value?.getPluginApi()?.getActiveDoc?.()
  return (doc?.content as string) ?? ''
}
function onKbState(s: { running: boolean; paused: boolean }): void {
  state.running = s.running
  state.paused = s.paused
}
function onKbContent(c: string): void {
  emit('update:content', c)
}

// ===== KB 文件 tab 切换 / 关闭（经 ll-kb-tab-actions 提供给 linlan-tabs） =====
function activateKbFile(fileId: string): void {
  for (const kb of state.knowledgeBases) {
    const f = kb.files.find((x) => x.id === fileId)
    if (f) {
      state.selectedKbId = kb.id
      state.selectedFileId = fileId
      state.activeId = fileId
      return
    }
  }
}
function closeKbFile(fileId: string): void {
  const idx = state.openDocs.findIndex((o) => o.id === fileId)
  if (idx < 0) return
  state.openDocs.splice(idx, 1)
  if (state.activeId === fileId) {
    const next = state.openDocs[idx] ?? state.openDocs[idx - 1]
    if (next) {
      activateKbFile(next.id)
    } else {
      state.activeId = ''
      state.selectedFileId = ''
    }
  }
}
provide('ll-kb-tab-actions', { activate: activateKbFile, close: closeKbFile })

defineExpose({ run, continueDbg, stepDbg, save, openApi, getContent })
</script>

<template>
  <div class="ma-editor-container ll-editor-canvas-wrap">
    <!-- KB 模式：与 API 模式共用 LinlanTabs（同一份 openDocs/activeId 状态） -->
    <template v-if="mode === 0">
      <div class="ll-editor-api">
        <LinlanTabs />
        <!-- KB 编辑器 -->
        <div class="ll-editor-canvas">
          <LinlanKbEditor
            v-if="file"
            :key="file.id"
            :file="file"
            ref="kbRef"
            @update:content="onKbContent"
            @state="onKbState"
          />
          <div v-else class="ma-empty">{{ i18n.t('knowledge.selectFile') }}</div>
        </div>
      </div>
    </template>

    <template v-else-if="mode === 1 || mode === 2">
      <div class="ll-editor-api">
        <LinlanTabs />
        <div ref="apiHost" class="ll-editor-canvas"></div>
      </div>
    </template>
    <div v-else class="ma-empty">数据源模式（占位）</div>
    <!-- 历史记录对话框（对齐 magic-script-editor） -->
    <linlan-dialog
      :title="'历史记录：' + historyDocName"
      :value="showHistoryDialog"
      align="right"
      height="550px"
      maxWidth="inherit"
      padding="none"
      width="1100px"
      :moveable="false"
      @onClose="showHistoryDialog = false"
    >
      <template #content>
        <linlan-history ref="historyRef" />
      </template>
      <template #buttons>
        <button
          class="ma-button active"
          @click="
            () => {
              ;(historyRef as any)?.reset?.()
              showHistoryDialog = false
            }
          "
        >
          恢复
        </button>
      </template>
    </linlan-dialog>
  </div>
</template>
