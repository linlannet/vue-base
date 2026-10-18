<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, onMounted, provide, reactive, ref, shallowRef, watch } from 'vue'
import { createI18n } from '@/i18n'
import { renderKBPreview } from '@/languages/preview'
import type { LLEditor } from '@/core/LLEditor'
import type { LLEditorOptions, KnowledgeBase, KBFile } from '@/core/types'
import type { ConsoleEntry } from '@/runtime/console'
import type { Diagnostic } from '@/core/types'
import type { LinlanApiEntity } from '@/api/linlanApi'
import bus from '@/scripts/bus'

import LinlanHeader from '@/components/layout/linlan-header.vue'
import LinlanKbList from '@/components/resources/linlan-kb-list.vue'
import LinlanApiList from '@/components/resources/linlan-api-list.vue'
import LinlanFunctionList from '@/components/resources/linlan-function-list.vue'
import LinlanDatasourceList from '@/components/resources/linlan-datasource-list.vue'
import LinlanScriptEditor from '@/components/editor/linlan-script-editor.vue'
import LinlanOptions from '@/components/layout/linlan-options.vue'
import LinlanStatusBar from '@/components/layout/linlan-status-bar.vue'
import LinlanLoading from '@/components/common/linlan-loading.vue'
import LinlanLogin from '@/components/layout/linlan-login.vue'
import LinlanRecentOpened from '@/components/resources/linlan-recent-opened.vue'
import Resizer from '@/components/layout/Resizer.vue'

import { useMagicRuntime } from './editor/useMagicRuntime'
import { useKbWorkspace } from './editor/useKbWorkspace'
import { useApiActions } from './editor/useApiActions'

const props = defineProps<{ Config?: LLEditorOptions; hideSidebar?: boolean }>()

// 合并后的 magic-api 运行时配置（同时承载 KB + knowledgeBases）
const llConfig = (props.Config ?? {}) as Record<string, any>

const i18n = createI18n()
provide('ll-i18n', i18n)

const defaultKbs: KnowledgeBase[] = [
  {
    id: 'kb1',
    name: '示例知识库',
    storage: 'file',
    files: [
      {
        id: 'r1',
        name: '介绍.md',
        language: 'markdown',
        kind: 'md',
        content:
          '# 欢迎\n\n这是一个知识库编辑器示例。\n\n- 左侧选择知识库与文件\n- 中间编辑内容\n- 右侧配置保存方式\n- 底部查看控制台与预览\n'
      },
      {
        id: 'r2',
        name: 'hello.py',
        language: 'python',
        kind: 'code',
        content: 'def greet(name: str) -> str:\n    return f"hello {name}"\n\nprint(greet("world"))\n'
      }
    ]
  }
]

const toolbars = ['文件', '接口', '函数', '数据源']
// toolbarIndex：0 = 文件（KB，默认进入页），1 = 接口，2 = 函数，3 = 数据源；-1 = 全部收起
// 数据源为左侧工具栏第 4 项，与参考 magic-editor 一致（toolbarIndex 只控制左侧列表）
const toolbarIndex = ref(0)
const editorMode = ref(0)
const path = ref('')

const kbList = reactive<KnowledgeBase[]>(props.Config?.knowledgeBases ?? defaultKbs)
// KB 与 API/函数模式共用一份 tab 状态（openDocs/activeId）；
// 模式切换时由 linlan-script-editor 负责各自缓存与恢复。
const state = reactive({
  mode: 0,
  knowledgeBases: kbList,
  selectedKbId: '',
  selectedFileId: '',
  openDocs: [] as { id: string; name: string }[],
  activeId: '',
  running: false,
  paused: false,
  activeTab: 'preview' as string,
  variables: {} as Record<string, unknown>
})
provide('ll-state', state)

const consoleEntries = reactive<ConsoleEntry[]>([])
const diagnostics = reactive<Diagnostic[]>([])
provide('ll-debug', { consoleEntries, diagnostics })

const coreRef = shallowRef<LLEditor | null>(null)
const editorProxy = new Proxy({} as LLEditor, {
  get(_t, key: string) {
    const inst = coreRef.value
    if (inst && key in inst) return (inst as unknown as Record<string, unknown>)[key]
    return () => undefined
  }
})
provide('ll-editor', editorProxy)
provide('ll-core', coreRef)

const currentApi = ref<LinlanApiEntity | null>(null)
provide('ll-api', currentApi)

const activeKb = computed(() => state.knowledgeBases.find((k) => k.id === state.selectedKbId) ?? null)
const activeFile = computed<KBFile | null>(() => {
  const kb = activeKb.value
  if (!kb) return null
  return kb.files.find((r) => r.id === state.selectedFileId) ?? null
})
const previewHtml = computed(() => {
  const r = activeFile.value
  return r ? renderKBPreview(r.language, r.content) : ''
})

// 知识库展开状态（父组件与左侧栏共享，便于新建 KB 后自动展开）。
const kbListExpand = ref<Set<string>>(new Set(state.knowledgeBases.map((k) => k.id)))
provide('ll-kb-expand', kbListExpand)

// ===== 布局尺寸 =====
const toolboxWidth = ref('auto')
const bottomHeight = ref(240)
const bottomExpanded = ref(true)
const BOTTOM_MIN = 32
const BOTTOM_MAX_RATIO = 0.6

// ===== 模板 refs =====
const containerRef = ref<HTMLElement | null>(null)
const resizerRef = ref<HTMLElement | null>(null)
const kbListRef = ref<any>(null)
const apiListRef = ref<any>(null)
const functionListRef = ref<any>(null)
const datasourceListRef = ref<any>(null)

const scriptRef = ref<InstanceType<typeof LinlanScriptEditor> | null>(null)
function openApi(entity: LinlanApiEntity): void {
  currentApi.value = entity
  scriptRef.value?.openApi(entity)
}
provide('ll-api-open', openApi)

// ===== 组合式：知识库 CRUD / 接口动作 / magic-api 运行时 =====
const kb = useKbWorkspace(state, kbListExpand, i18n)
const actions = useApiActions({ currentApi, scriptRef })
// 底部调试面板（linlan-debug 的继续/单步按钮）经 bus 转发到 actions
provide('ll-actions', actions)
const runtime = useMagicRuntime({
  config: llConfig,
  containerRef,
  scriptRef,
  apiListRef,
  functionListRef,
  datasourceListRef,
  toolbarIndex,
  editorMode,
  onRun: actions.onRun,
  onSave: actions.onSave,
  onContinue: actions.onContinue,
  onStep: actions.onStep
})

onBeforeMount(() => {
  runtime.init()
})

onMounted(() => {
  if (state.knowledgeBases.length) {
    const first = state.knowledgeBases[0]
    state.selectedKbId = first.id
    const firstFile = first.files[0]
    state.selectedFileId = firstFile?.id ?? ''
    if (firstFile) {
      state.activeId = firstFile.id
      if (!state.openDocs.find((o) => o.id === firstFile.id)) {
        state.openDocs.push({ id: firstFile.id, name: firstFile.name })
      }
    }
  }
  runtime.mount()
})

onBeforeUnmount(() => {
  runtime.dispose()
})

watch(
  [() => state.selectedKbId, () => state.selectedFileId],
  () => {
    const k = activeKb.value
    const r = activeFile.value
    path.value = k && r ? k.name + ' / ' + r.name : ''
  }
)
watch(editorMode, (v) => {
  state.mode = v
})
watch(toolbarIndex, () => {
  bus.$emit('update-window-size')
})

function selectToolbar(i: number): void {
  toolbarIndex.value = toolbarIndex.value === i ? -1 : i
  // editorMode：0 = 文件(KB)，1 = 接口，2 = 函数
  // 数据源（3）仅切换左侧列表、不改变中间编辑器模式（对齐参考 magic-editor：toolbarIndex 只控制左栏）
  if (toolbarIndex.value === 3) return
  editorMode.value = toolbarIndex.value === -1 ? 0 : toolbarIndex.value
}

function onFileContent(text: string): void {
  const r = activeFile.value
  if (r) r.content = text
}

// ===== 主题切换（CSS 变量 + Monaco 主题 + 持久化） =====
const dark = ref(false)
const themeStyle = reactive<Record<string, string>>({})
function onToggleTheme(): void {
  dark.value = !dark.value
  coreRef.value?.setTheme(dark.value ? 'dark' : 'light')
}

// ===== 拖拽 =====
function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}
// 与 magic-editor.vue 一致的横向拖拽：拖动 ma-resizer-x 调整左侧列表宽度
function doResizeX(): void {
  const rect = resizerRef.value?.getBoundingClientRect()
  if (!rect) return
  let el: any = kbListRef.value
  if (toolbarIndex.value === 1) el = apiListRef.value
  else if (toolbarIndex.value === 2) el = functionListRef.value
  else if (toolbarIndex.value === 3) el = datasourceListRef.value
  const width = el?.$el?.clientWidth ?? 240
  document.onmousemove = (e: MouseEvent) => {
    const move = e.clientX - rect.x + width
    if (move >= 180 && move < 700) {
      toolboxWidth.value = move + 'px'
    }
  }
  document.onmouseup = () => {
    document.onmousemove = document.onmouseup = null
    ;(resizerRef.value as any)?.releaseCapture?.()
  }
  bus.$emit('update-window-size')
}
function onResizeBottom(d: number): void {
  if (!bottomExpanded.value) return
  const max = Math.max(BOTTOM_MIN + 40, window.innerHeight * BOTTOM_MAX_RATIO)
  bottomHeight.value = clamp(bottomHeight.value - d, BOTTOM_MIN, max)
}

function toggleBottom(): void {
  bottomExpanded.value = !bottomExpanded.value
}
</script>

<template>
  <div ref="containerRef" class="ma-container" tabindex="0" :style="themeStyle">
    <linlan-loading v-if="runtime.loading.value" />
    <linlan-login v-if="runtime.showLogin.value" :onLogin="runtime.onLogin" />
    <linlan-header
      :mode="editorMode"
      :path="path"
      :theme-style="themeStyle"
      @update:theme-style="Object.assign(themeStyle, $event)"
      @update:path="path = $event"
      @run="actions.onRun"
      @continue="actions.onContinue"
      @step="actions.onStep"
      @save="actions.onSave"
      @toggle-theme="onToggleTheme"
      class="not-select"
    />
    <ul class="ma-toolbar-container not-select">
      <li
        v-for="(item, index) in toolbars"
        :key="'toolbar_' + index"
        :class="{ selected: toolbarIndex === index }"
        @click="selectToolbar(index)"
      >{{ item }}<i class="ma-icon ma-icon-list"></i></li>
    </ul>
    <!-- 中间主要内容 -->
    <div class="ma-main-container">
      <div class="ma-middle-container">
        <linlan-kb-list
          v-show="toolbarIndex === 0 && !props.hideSidebar"
          ref="kbListRef"
          :style="{ width: toolboxWidth }"
          class="not-select"
          @create-kb="kb.onCreateKb"
          @rename-kb="kb.onRenameKb"
          @delete-kb="kb.onDeleteKb"
          @add-file="kb.onAddFile"
          @add-resource="kb.onAddResource"
          @delete-file="kb.onDeleteFile"
        />
        <linlan-api-list
          v-show="toolbarIndex === 1 && !props.hideSidebar"
          ref="apiListRef"
          :style="{ width: toolboxWidth }"
          class="not-select"
        />
        <linlan-function-list
          v-show="toolbarIndex === 2 && !props.hideSidebar"
          ref="functionListRef"
          :style="{ width: toolboxWidth }"
          class="not-select"
          @close="selectToolbar(2)"
        />
        <linlan-datasource-list
          v-show="toolbarIndex === 3 && !props.hideSidebar"
          ref="datasourceListRef"
          :style="{ width: toolboxWidth }"
          class="not-select"
        />
        <div ref="resizerRef" class="ma-resizer-x" @mousedown="doResizeX"></div>
        <linlan-script-editor
          ref="scriptRef"
          :mode="editorMode"
          :file="activeFile"
          :Config="Config"
          class="ma-editor-container"
          @update:content="onFileContent"
        />
      </div>
      <!-- 底部区域 -->
      <Resizer v-if="!props.hideSidebar" dir="y" @resize="onResizeBottom" />
      <linlan-options
        :mode="editorMode === 0 ? 'kb' : editorMode === 1 ? 'api' : 'fn'"
        :preview-html="previewHtml"
        :expanded="bottomExpanded"
        :style="{ height: (bottomExpanded ? bottomHeight : BOTTOM_MIN) + 'px' }"
        @toggle="toggleBottom"
      />
    </div>
    <!-- 最近打开 -->
    <linlan-recent-opened />
    <!-- 状态条 -->
    <linlan-status-bar />
  </div>
</template>

<style scoped>
/* ===== 主框架布局（复制自 third-magic-editor magic-editor.vue scoped 样式） ===== */
.ma-main-container {
  position: absolute;
  top: 30px;
  left: 22px;
  bottom: 24px;
  right: 0px;
  display: flex;
  flex-direction: column;
}

.ma-middle-container {
  flex: 1;
  display: flex;
  overflow: auto;
  background: var(--middle-background);
  border-bottom: 1px solid var(--border-color);
}

.ma-toolbar-container {
  background: var(--background);
  border-right: 1px solid var(--toolbox-border-color);
  width: 22px;
  position: absolute;
  left: 0;
  bottom: 24px;
  top: 30px;
}

.ma-toolbar-container > li {
  padding: 6px 3px;
  cursor: pointer;
  letter-spacing: 2px;
  text-align: center;
  color: var(--color);
  border-bottom: 1px solid var(--toolbox-border-color);
}

.ma-toolbar-container > li > i {
  color: var(--icon-color);
  font-size: 14px;
  padding-top: 3px;
  display: inline-block;
}

.ma-toolbar-container > li:hover {
  background: var(--hover-background);
}

.ma-toolbar-container > li.selected {
  background: var(--selected-background);
  color: var(--selected-color);
}

.ma-resizer-x {
  float: left;
  width: 10px;
  height: 100%;
  margin-left: -5px;
  background: none;
  cursor: e-resize;
  z-index: 1000;
}

/* ===== 右缘数据源抽屉（对齐官方 8088 控制台 Datasource 侧栏） ===== */
.ma-ds-tab {
  position: absolute;
  top: 58px;
  right: 0;
  z-index: 40;
  writing-mode: vertical-rl;
  letter-spacing: 3px;
  padding: 12px 5px;
  background: #2c3338;
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  border-radius: 4px 0 0 4px;
  opacity: 0.85;
}

.ma-ds-tab:hover {
  opacity: 1;
}

.ma-ds-tab.open {
  background: var(--selected-background, #0075ff);
  color: var(--selected-color, #fff);
  opacity: 1;
}

.ma-ds-drawer {
  flex-shrink: 0;
  min-width: 240px;
  max-width: 40vw;
  border-left: 1px solid var(--border-color);
  background: var(--background);
  overflow: auto;
}

.ma-editor-container {
  flex: 1;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-left: -5px;
  position: relative;
}
</style>
