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
import store from '@/scripts/store'
import request from '@/api/request'
import { displayName, displayIp, logoutCurrentUser } from '@/scripts/user'
// 侧栏 LOGO：走资源导入，应用构建时由 Vite 按 base 生成正确路径
import logoSrc from '@/assets/favicon.ico'

import LinlanHeader from '@/components/layout/linlan-header.vue'
import LinlanKbList from '@/components/resources/linlan-kb-list.vue'
import LinlanApiList from '@/components/resources/linlan-api-list.vue'
import LinlanFunctionList from '@/components/resources/linlan-function-list.vue'
import LinlanDatasourceList from '@/components/resources/linlan-datasource-list.vue'
import LinlanScriptEditor from '@/components/editor/linlan-script-editor.vue'
import LinlanAiChat from '@/components/editor/linlan-ai-chat.vue'
import LinlanSplitPreview from '@/components/editor/linlan-split-preview.vue'
import LinlanOptions from '@/components/layout/linlan-options.vue'
import LinlanRailBottom from '@/components/layout/linlan-rail-bottom.vue'

import LinlanLoading from '@/components/common/linlan-loading.vue'
import LinlanLogin from '@/components/layout/linlan-login.vue'
import LinlanRecentOpened from '@/components/resources/linlan-recent-opened.vue'
import Resizer from '@/components/layout/Resizer.vue'

import { useMagicRuntime } from './editor/useMagicRuntime'
import { useKbWorkspace } from './editor/useKbWorkspace'
import { loadKnowledgeBases, useKbPersistence } from './editor/useKbStorage'
import { useApiActions } from './editor/useApiActions'

const props = defineProps<{ Config?: LLEditorOptions; hideSidebar?: boolean }>()

// 合并后的 magic-api 运行时配置（同时承载 KB + knowledgeBases）
const llConfig = (props.Config ?? {}) as Record<string, any>

// 语言由 store 持久化（顶栏 i18n 按钮切换后写入），初始化时按存储值创建
const i18n = createI18n(store.get('locale') === 'en' ? 'en' : 'zh-CN')
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
          '# 欢迎\n\n这是一个知识库编辑器示例。\n\n- 左侧选择知识库与资源\n- 中间编辑内容\n- 右侧配置保存方式\n- 底部查看控制台与预览\n'
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

const toolbars = ['知识库', '接口', '函数', '数据源']
// 左侧统一侧栏的导航图标（与 toolbars 一一对应）
const modeIcons = ['list', 'api', 'function', 'datasource']
// toolbarIndex：0 = 知识库（KB，默认进入页），1 = 接口，2 = 函数，3 = 数据源；-1 = 全部收起
// 数据源为左侧导航第 4 项，与参考 magic-editor 一致（toolbarIndex 只控制左侧列表）
const toolbarIndex = ref(0)
// 侧栏整体收起状态（参考 ima 布局：左侧整块可折叠为图标栏）
const sidebarCollapsed = ref(false)
const editorMode = ref(0)
const path = ref('')

// 知识库：优先使用宿主注入的数据；否则读取本地持久化，首次使用回退到示例数据
const kbList = reactive<KnowledgeBase[]>(
  props.Config?.knowledgeBases ?? loadKnowledgeBases(defaultKbs)
)
// 知识库及其文件内容的任何变更都会自动写入 localStorage（首期存储方案）
useKbPersistence(kbList)
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
  if (!r) return ''
  // md 内容可能是历史富文本 HTML，直接渲染；markdown 源码走轻量渲染
  if (r.kind === 'md') {
    return /<\/?[a-z][\s\S]*>/i.test(r.content ?? '') ? r.content : renderKBPreview(r.language, r.content)
  }
  return renderKBPreview(r.language, r.content)
})

// 知识库展开状态（父组件与左侧栏共享，便于新建 KB 后自动展开）。
const kbListExpand = ref<Set<string>>(new Set(state.knowledgeBases.map((k) => k.id)))
provide('ll-kb-expand', kbListExpand)

// ===== 布局尺寸 =====
const toolboxWidth = ref('250px')
// 一级菜单列固定宽度；二级区域（知识库/接口/函数/数据源）独立成列并保持可拖拽
const MENU_WIDTH = 150
const leftOffset = computed(
  () => (sidebarCollapsed.value ? '44px' : `${MENU_WIDTH + (parseFloat(toolboxWidth.value) || 250)}px`)
)

// ===== 侧栏底部用户入口（当前登录用户 + 登录/注销） =====
const userMenuOpen = ref(false)
// 头像统一主题蓝，与整体配色一致
const userInitial = computed(() => (displayName.value || '?').trim().slice(0, 1).toUpperCase() || '?')
const userAvatarColor = computed(() => 'var(--ll-primary, #3a8ee6)')
function toggleUserMenu(): void {
  // 收起态弹层会被侧栏裁剪，先展开侧栏再显示用户菜单
  if (sidebarCollapsed.value) {
    sidebarCollapsed.value = false
    bus.$emit('update-window-size')
  }
  userMenuOpen.value = !userMenuOpen.value
}
function closeUserMenu(): void {
  userMenuOpen.value = false
}
function onUserLogin(): void {
  closeUserMenu()
  bus.$emit('showLogin')
}
function onUserLogout(): void {
  closeUserMenu()
  logoutCurrentUser()
}
// 点击侧栏以外区域时关闭用户菜单
function onDocumentClick(e: MouseEvent): void {
  if (!userMenuOpen.value) return
  const el = e.target as HTMLElement | null
  if (el && el.closest('.ll-sidebar-user')) return
  closeUserMenu()
}
// 通知角标：复用后端 /todo 待办数量（登录成功后拉取，异常静默）
const notifyCount = ref(0)
function onLoadNotify(): void {
  request
    .send('todo', null, { method: 'get' })
    .exception(() => {})
    .error(() => {})
    .success((list: any) => {
      notifyCount.value = Array.isArray(list) ? list.length : 0
    })
}
function onNotifyClick(): void {
  bus.$emit('status', notifyCount.value > 0 ? `有 ${notifyCount.value} 条待办` : '暂无新的通知')
}
function onResetNotify(): void {
  notifyCount.value = 0
}
function onMultiDeviceClick(): void {
  bus.$emit('status', '多端入口暂未开放')
}
// ===== 状态提示：底部状态栏移除后改为右下角轻量 toast（2 秒自动消失，不占布局） =====
const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function onStatusToast(msg: unknown): void {
  const text = typeof msg === 'string' ? msg : ((msg as { content?: string })?.content ?? '')
  if (!text) return
  toastMsg.value = text
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMsg.value = ''
  }, 2000)
}
const bottomHeight = ref(240)
const bottomExpanded = ref(true)
const BOTTOM_MIN = 32
const BOTTOM_MAX_RATIO = 0.6

// ===== 中栏右侧：分屏预览 + AI 助手（AI 固定在最右侧） =====
interface OpenFileInfo {
  id: string
  name: string
  language: string
  content: string
  kind?: string
}

const SPLIT_OPEN_KEY = 'll-split-preview-open'
const AI_PANEL_WIDTH_KEY = 'll-ai-panel-width'
const AI_PANEL_OPEN_KEY = 'll-ai-panel-open'
// 分屏预览默认开启：打开 2 个及以上文件时自动出现分屏
const splitPreview = ref(localStorage.getItem(SPLIT_OPEN_KEY) !== '0')
const aiOpen = ref(localStorage.getItem(AI_PANEL_OPEN_KEY) !== '0')
const aiWidth = ref(380)
const storedAiWidth = Number(localStorage.getItem(AI_PANEL_WIDTH_KEY))
if (storedAiWidth >= 280 && storedAiWidth <= 640) aiWidth.value = storedAiWidth
// AI 区总宽（AI 面板 + 拖拽条 + 活动栏），作为中间区的 right inset
const RAIL_WIDTH = 37 // 活动栏 36 + 左边框 1
const AI_RESIZER_WIDTH = 4
const aiZoneWidth = computed(() => `${RAIL_WIDTH + (aiOpen.value ? AI_RESIZER_WIDTH + aiWidth.value : 0)}px`)
const splitEl = ref<HTMLElement | null>(null)
let aiResizeCleanup: (() => void) | null = null

// core 的文档内容不进入 Vue 响应式，用版本号驱动 openFiles 重算
const docVersion = ref(0)
watch(
  coreRef,
  (core, _old, onCleanup) => {
    if (!core) return
    const bump = (): void => {
      docVersion.value++
    }
    const offs = [core.bus.on('doc:opened', bump), core.bus.on('doc:changed', bump), core.bus.on('doc:closed', bump)]
    onCleanup(() => offs.forEach((o) => o()))
  },
  { immediate: true }
)

/** 当前打开的全部文件：接口/函数模式取 core 文档，知识库模式取知识库文件内容 */
const openFiles = computed<OpenFileInfo[]>(() => {
  void docVersion.value
  const core = coreRef.value
  const docs = core ? core.getPluginApi().listDocs() : []
  const docMap = new Map(docs.map((d) => [d.id, d]))
  const out: OpenFileInfo[] = []
  for (const o of state.openDocs) {
    const doc = docMap.get(o.id)
    if (doc) {
      out.push({ id: doc.id, name: doc.name, language: doc.language ?? '', content: doc.content ?? '' })
      continue
    }
    for (const kbItem of state.knowledgeBases) {
      const f = kbItem.files.find((x) => x.id === o.id)
      if (f) {
        out.push({ id: f.id, name: f.name, language: f.language ?? '', content: f.content ?? '', kind: f.kind })
        break
      }
    }
  }
  return out
})
const activeOpenFile = computed(() => openFiles.value.find((f) => f.id === state.activeId) ?? null)
// 分屏预览只在打开 2 个及以上文件时出现（单文件不占屏）
const canSplit = computed(() => openFiles.value.length >= 2)
const showSplit = computed(() => canSplit.value && splitPreview.value)
const aiFiles = computed(() => openFiles.value.map((f) => ({ name: f.name, content: f.content })))

function toggleSplitPreview(): void {
  if (!canSplit.value) return
  splitPreview.value = !splitPreview.value
  localStorage.setItem(SPLIT_OPEN_KEY, splitPreview.value ? '1' : '0')
  bus.$emit('update-window-size')
}
function closeSplit(): void {
  splitPreview.value = false
  localStorage.setItem(SPLIT_OPEN_KEY, '0')
  bus.$emit('update-window-size')
}
function toggleAi(): void {
  aiOpen.value = !aiOpen.value
  localStorage.setItem(AI_PANEL_OPEN_KEY, aiOpen.value ? '1' : '0')
  bus.$emit('update-window-size')
}
function closeAi(): void {
  aiOpen.value = false
  localStorage.setItem(AI_PANEL_OPEN_KEY, '0')
  bus.$emit('update-window-size')
}
function startAiResize(e: MouseEvent): void {
  e.preventDefault()
  const onMove = (ev: MouseEvent): void => {
    if (!splitEl.value) return
    const rect = splitEl.value.getBoundingClientRect()
    aiWidth.value = Math.min(640, Math.max(280, Math.round(rect.right - ev.clientX)))
  }
  const onUp = (): void => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    aiResizeCleanup = null
    localStorage.setItem(AI_PANEL_WIDTH_KEY, String(aiWidth.value))
    bus.$emit('update-window-size')
  }
  aiResizeCleanup = onUp
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// ===== 模板 refs =====
const containerRef = ref<HTMLElement | null>(null)
const resizerRef = ref<HTMLElement | null>(null)
const apiListRef = ref<any>(null)
const functionListRef = ref<any>(null)
const datasourceListRef = ref<any>(null)

const scriptRef = ref<InstanceType<typeof LinlanScriptEditor> | null>(null)
function openApi(entity: LinlanApiEntity): void {
  currentApi.value = entity
  scriptRef.value?.openApi(entity)
  // 最近打开记录（linlan-recent-opened 消费）：editorMode 2 = 函数模式，其余按接口记录
  if (entity.id) {
    bus.$emit('ll-recent-record', { _type: editorMode.value === 2 ? 'function' : 'api', id: entity.id })
  }
}
provide('ll-api-open', openApi)

// 点击数据源：左侧导航与中栏一起进入数据源模式，并在编辑区打开该数据源的 SQL 查询文档
function openDatasourceSql(ds: { id?: string | null; name?: string; key?: string }): void {
  if (toolbarIndex.value !== 3) toolbarIndex.value = 3
  if (editorMode.value !== 3) editorMode.value = 3
  scriptRef.value?.openSqlDoc(ds)
}
provide('ll-ds-open-sql', openDatasourceSql)

// ===== 组合式：知识库 CRUD / 接口动作 / magic-api 运行时 =====
const kb = useKbWorkspace(state, kbListExpand, i18n)
// AI 对话面板把回复保存为知识库文件（当前选中的知识库）
provide('ll-ai-create-file', (name: string, content: string): string | null => {
  const kbId = state.selectedKbId || state.knowledgeBases[0]?.id
  if (!kbId) return null
  return kb.onCreateFileWithContent(kbId, name, content)
})
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
  document.addEventListener('click', onDocumentClick)
  bus.$on('login', onLoadNotify)
  bus.$on('logout', onResetNotify)
  bus.$on('status', onStatusToast)
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
  aiResizeCleanup?.()
  if (toastTimer) clearTimeout(toastTimer)
  document.removeEventListener('click', onDocumentClick)
  bus.$off('login', onLoadNotify)
  bus.$off('logout', onResetNotify)
  bus.$off('status', onStatusToast)
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
  // 统一侧栏：点击当前模式不再收起整栏，收起/展开交给侧栏顶部的折叠按钮
  if (sidebarCollapsed.value) sidebarCollapsed.value = false
  if (toolbarIndex.value === i) return
  toolbarIndex.value = i
  // editorMode：0 =知识库(KB)，1 = 接口，2 = 函数，3 = 数据源（SQL 查询工作区）
  editorMode.value = toolbarIndex.value === -1 ? 0 : toolbarIndex.value
}

// 侧栏整体收起/展开（参考 ima：左侧整块可折叠为图标栏）
function toggleSidebar(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value
  bus.$emit('update-window-size')
}

// 底部面板模式：数据源（toolbarIndex 3 / editorMode 3）无对应底部 tab，
// 其余按 editorMode 映射 0/1/2 -> kb/api/fn
const bottomMode = computed<'kb' | 'api' | 'fn' | 'ds'>(() => {
  if (toolbarIndex.value === 3) return 'ds'
  return editorMode.value === 1 ? 'api' : editorMode.value === 2 ? 'fn' : 'kb'
})

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
// 横向拖拽：一级菜单列固定宽度，拖动 ll-resizer-x 只调整二级内容列宽度
function doResizeX(): void {
  if (sidebarCollapsed.value) return
  document.onmousemove = (e: MouseEvent) => {
    toolboxWidth.value = clamp(e.clientX - MENU_WIDTH, 180, 620) + 'px'
  }
  document.onmouseup = () => {
    document.onmousemove = document.onmouseup = null
    ;(resizerRef.value as any)?.releaseCapture?.()
    bus.$emit('update-window-size')
  }
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
  <div ref="containerRef" class="ll-container" tabindex="0" :style="themeStyle">
    <linlan-loading v-if="runtime.loading.value" />
    <linlan-login v-if="runtime.showLogin.value" :onLogin="runtime.onLogin" />
    <!-- 左侧：一级菜单列 + 二级内容列（平行列），底部用户栏横跨整列 -->
    <aside
      v-if="!props.hideSidebar"
      class="ll-sidebar not-select"
      :class="{ collapsed: sidebarCollapsed }"
      :style="{ width: leftOffset }"
    >
      <div class="ll-sidebar-cols">
        <!-- 一级菜单列：知识库 / 接口 / 函数 / 数据源 -->
        <div class="ll-sidebar-menu">
          <div class="ll-sidebar-top">
            <img class="ll-sidebar-logo" :src="logoSrc" alt="LL-Editor" />
            <span v-show="!sidebarCollapsed" class="ll-sidebar-name">LL-Editor</span>
            <span
              class="ll-sidebar-toggle"
              :title="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
              @click.stop="toggleSidebar"
            >
              <i class="ll-icon" :class="sidebarCollapsed ? 'll-icon-unfold' : 'll-icon-fold'"></i>
            </span>
          </div>
          <ul class="ll-sidebar-nav">
            <li
              v-for="(item, index) in toolbars"
              :key="'toolbar_' + index"
              :class="{ selected: toolbarIndex === index }"
              :title="item"
              @click="selectToolbar(index)"
            >
              <i class="ll-icon" :class="'ll-icon-' + modeIcons[index]"></i>
              <span v-show="!sidebarCollapsed">{{ item }}</span>
            </li>
          </ul>
        </div>
        <!-- 二级内容列：当前菜单对应的资源列表 -->
        <div v-show="!sidebarCollapsed" class="ll-sidebar-secondary">
          <div class="ll-sidebar-body">
            <linlan-kb-list
              v-show="toolbarIndex === 0"
              class="not-select"
              @create-kb="kb.onCreateKb"
              @rename-kb="kb.onRenameKb"
              @delete-kb="kb.onDeleteKb"
              @add-file="kb.onAddFile"
              @add-resource="kb.onAddResource"
              @create-folder="kb.onCreateFolder"
              @rename-folder="kb.onRenameFolder"
              @delete-folder="kb.onDeleteFolder"
              @move-file="kb.onMoveFile"
              @rename-file="kb.onRenameFile"
              @upload-files="kb.onImportFiles"
              @delete-file="kb.onDeleteFile"
              @export-zip="kb.onExportZip"
              @import-zip="kb.onImportZip"
            />
            <linlan-api-list
              v-show="toolbarIndex === 1"
              ref="apiListRef"
              class="not-select"
              @close="toggleSidebar"
            />
            <linlan-function-list
              v-show="toolbarIndex === 2"
              ref="functionListRef"
              class="not-select"
              @close="toggleSidebar"
            />
            <linlan-datasource-list
              v-show="toolbarIndex === 3"
              ref="datasourceListRef"
              class="not-select"
            />
          </div>
        </div>
      </div>
      <!-- 底部用户栏（参考 workbuddy：头像 + 用户名 + 通知/多端入口） -->
      <div class="ll-sidebar-user">
        <div
          class="ll-user-entry"
          :class="{ active: userMenuOpen }"
          :title="displayIp ? `IP：${displayIp}` : ''"
          @click.stop="toggleUserMenu"
        >
          <span class="ll-user-avatar" :style="{ background: userAvatarColor }">{{ userInitial }}</span>
          <span v-show="!sidebarCollapsed" class="ll-user-name">{{ displayName || '未登录' }}</span>
        </div>
        <div v-show="!sidebarCollapsed" class="ll-user-actions">
          <span class="ll-user-action" title="通知" @click.stop="onNotifyClick">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            <span v-if="notifyCount > 0" class="ll-user-badge">{{ notifyCount > 99 ? '99+' : notifyCount }}</span>
          </span>
          <span class="ll-user-action" title="多端" @click.stop="onMultiDeviceClick">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="14" height="11" rx="1.5" />
              <path d="M6 19h8" />
              <rect x="16.5" y="10" width="5.5" height="9" rx="1.2" />
            </svg>
          </span>
        </div>
        <div v-if="userMenuOpen" class="ll-user-popover" @click.stop>
          <div class="ll-user-popover-head">
            <span class="ll-user-avatar lg" :style="{ background: userAvatarColor }">{{ userInitial }}</span>
            <div class="ll-user-popover-info">
              <div class="ll-user-name">{{ displayName || '未登录' }}</div>
              <div class="ll-user-ip">{{ displayIp }}</div>
            </div>
          </div>
          <ul class="ll-user-menu">
            <li @click="onUserLogin">登录</li>
            <li v-if="displayName" class="danger" @click="onUserLogout">注销</li>
          </ul>
        </div>
      </div>
    </aside>
    <!-- 右侧列：顶栏 + 主区域（整体左移让出左侧栏宽度） -->
    <div
      class="ll-right-container"
      :style="{ left: props.hideSidebar ? '0' : leftOffset, right: aiZoneWidth }"
    >
      <div
        v-if="!props.hideSidebar"
        ref="resizerRef"
        class="ll-resizer-x"
        :class="{ hidden: sidebarCollapsed }"
        @mousedown="doResizeX"
      ></div>
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
      <!-- 中间列：编辑器 + 底部面板，宽度随右侧 AI 区收缩 -->
      <div class="ll-center-column">
        <div ref="splitEl" class="ll-middle-container">
          <linlan-script-editor
            ref="scriptRef"
            :mode="editorMode"
            :file="activeFile"
            :Config="Config"
            class="ll-editor-container"
            @update:content="onFileContent"
          />
          <!-- 多文件分屏预览：打开 2 个及以上文件才出现，可随时关闭 -->
          <LinlanSplitPreview v-if="showSplit" :files="openFiles" @close="closeSplit" />
        </div>
        <!-- 底部区域：知识库/接口/函数/数据源各自的内容，宽度随中间列，跟随一级菜单 -->
        <Resizer v-if="!props.hideSidebar" dir="y" @resize="onResizeBottom" />
        <linlan-options
          :mode="bottomMode"
          :preview-html="previewHtml"
          :expanded="bottomExpanded"
          :style="{ height: (bottomExpanded ? bottomHeight : BOTTOM_MIN) + 'px' }"
          @toggle="toggleBottom"
        />
      </div>
    </div>
    <!-- 最右侧 AI 区：与左侧栏平级，绝对定位到窗口最顶端并贯穿到底 -->
    <div class="ll-ai-zone">
      <div v-if="aiOpen" class="ll-ai-resizer" @mousedown="startAiResize"></div>
      <LinlanAiChat
        v-if="aiOpen"
        :style="{ width: aiWidth + 'px' }"
        :kb-id="state.selectedKbId"
        :file-name="activeOpenFile?.name ?? ''"
        :file-content="activeOpenFile?.content ?? ''"
        :files="aiFiles"
        @close="closeAi"
      />
      <!-- 最右侧活动栏：AI 助手 / 分屏预览开关 -->
      <div class="ll-right-rail not-select">
        <button class="ll-rail-btn" :class="{ active: aiOpen }" :title="i18n.t('ai.title')" @click="toggleAi">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.5l1.9 4.9 4.9 1.9-4.9 1.9L12 16.1l-1.9-4.9L5.2 9.3l4.9-1.9L12 2.5z"
              fill="currentColor"
            />
            <path
              d="M19 14.4l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z"
              fill="currentColor"
            />
          </svg>
          <span class="ll-rail-label">{{ i18n.t('ai.title') }}</span>
        </button>
        <button
          class="ll-rail-btn"
          :class="{ active: showSplit, disabled: !canSplit }"
          :title="
            canSplit ? (showSplit ? i18n.t('preview.close') : i18n.t('preview.open')) : i18n.t('preview.needTwo')
          "
          @click="toggleSplitPreview"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M12 4v16" />
          </svg>
          <span class="ll-rail-label">{{ i18n.t('preview.title') }}</span>
        </button>
        <!-- 底部：在线人数（图标 + 数量）+ Gitee/GitHub/帮助/注销 -->
        <LinlanRailBottom />
      </div>
    </div>
    <!-- 最近打开 -->
    <linlan-recent-opened />
    <!-- 状态提示 toast：原底部状态栏移除后的替代，2 秒自动消失 -->
    <div v-if="toastMsg" class="ll-status-toast" v-html="toastMsg"></div>
  </div>
</template>

<style scoped>
/* ===== 主框架布局（复制自 third-magic-editor magic-editor.vue scoped 样式） ===== */
/* 右侧列：顶栏 + 主区域，左侧让出左侧栏宽度 */
/* 底部不再为状态栏预留空间：状态栏已移除，右侧容器撑满到窗口底 */
.ll-right-container {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  z-index: 20;
}

/* 中间列：编辑器 + 底部面板，占满顶栏之下、AI 区之左的区域 */
.ll-center-column {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 最右侧 AI 区：与左侧栏平级，从窗口最顶端贯穿到底，顶栏不再横跨其上方 */
.ll-ai-zone {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: row;
  z-index: 15;
}

/* 右下角状态提示：替代已移除的底部状态栏，浮在 AI 区之上，不占布局 */
.ll-status-toast {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 10000;
  max-width: 320px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(31, 41, 55, 0.92);
  color: #fff;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  animation: ll-toast-in 0.18s ease-out;
}

@keyframes ll-toast-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ll-middle-container {
  flex: 1;
  display: flex;
  overflow: auto;
  background: var(--middle-background);
  border-bottom: 1px solid var(--border-color);
}

/* ===== 左侧统一侧栏（参考 ima：整块可收起，顶到窗口顶部） ===== */
/* 注意：用 aside 元素选择器收紧，避免命中子组件（列表）根上的同名 .ll-sidebar 类 */
aside.ll-sidebar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-width: 0;
  background: var(--toolbox-background, var(--background));
  border-right: 1px solid var(--toolbox-border-color);
  overflow: hidden;
  z-index: 10;
}

/* 两列平行区：一级菜单列 + 二级内容列 */
.ll-sidebar-cols {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  width: 100%;
}

/* 一级菜单列（固定宽度，收起后为图标栏） */
.ll-sidebar-menu {
  display: flex;
  flex-direction: column;
  width: 150px;
  flex-shrink: 0;
  min-width: 0;
  height: 100%;
}

aside.ll-sidebar.collapsed .ll-sidebar-menu {
  width: 44px;
}

/* 二级内容列（平行列，宽度可拖拽） */
.ll-sidebar-secondary {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  border-left: 1px solid var(--toolbox-border-color);
  overflow: hidden;
}

.ll-sidebar-top {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 6px 0 8px;
  border-bottom: 1px solid var(--toolbox-border-color);
  flex-shrink: 0;
}

.ll-sidebar-logo {
  display: block;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 2px;
}

.ll-sidebar-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 600;
  color: var(--color);
  white-space: nowrap;
}

.ll-sidebar-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 3px;
  color: var(--icon-color);
  cursor: pointer;
}

.ll-sidebar-toggle:hover {
  background: var(--hover-background);
}

.ll-sidebar-nav {
  flex-shrink: 0;
  padding: 4px;
  border-bottom: 1px solid var(--toolbox-border-color);
}

.ll-sidebar-nav > li {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 8px;
  border-radius: 3px;
  font-size: 12px;
  color: var(--color);
  white-space: nowrap;
  cursor: pointer;
}

.ll-sidebar-nav > li > i {
  width: 16px;
  text-align: center;
  color: var(--icon-color);
  font-size: 14px;
}

.ll-sidebar-nav > li:hover {
  background: var(--hover-background);
}

.ll-sidebar-nav > li.selected {
  background: var(--selected-background);
  color: var(--selected-color);
}

.ll-sidebar-nav > li.selected > i {
  color: var(--selected-color);
}

/* 收起后只保留图标栏（LOGO + 展开按钮） */
aside.ll-sidebar.collapsed .ll-sidebar-top {
  justify-content: center;
  gap: 2px;
  padding: 0 2px;
}

aside.ll-sidebar.collapsed .ll-sidebar-nav > li {
  justify-content: center;
  padding: 0;
}

.ll-sidebar-body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.ll-sidebar-body :deep(.ll-sidebar) {
  width: 100%;
  height: 100%;
  border-right: none;
}

/* ===== 侧栏底部用户栏（参考 workbuddy：头像 + 用户名 + 通知/多端） ===== */
.ll-sidebar-user {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  height: 48px;
  padding: 0 8px 0 10px;
  border-top: 1px solid var(--toolbox-border-color);
  background: var(--toolbox-background, var(--background));
}

.ll-user-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 6px;
  border-radius: 4px;
  color: var(--color);
  cursor: pointer;
  overflow: hidden;
}

.ll-user-entry:hover,
.ll-user-entry.active {
  background: var(--hover-background);
}

.ll-user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.ll-user-avatar.lg {
  width: 30px;
  height: 30px;
  font-size: 13px;
}

.ll-user-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 16px;
  color: var(--color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ll-user-ip {
  font-size: 10px;
  line-height: 14px;
  color: var(--icon-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 通知 / 多端入口 */
.ll-user-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.ll-user-action {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  color: var(--icon-color);
  cursor: pointer;
}

.ll-user-action:hover {
  background: var(--hover-background);
  color: var(--selected-color, #1668e3);
}

.ll-user-badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: #f54a45;
  color: #fff;
  font-size: 9px;
  line-height: 14px;
  text-align: center;
  box-sizing: border-box;
}

aside.ll-sidebar.collapsed .ll-sidebar-user {
  justify-content: center;
  padding: 0 4px;
}

aside.ll-sidebar.collapsed .ll-user-entry {
  justify-content: center;
  gap: 0;
  padding: 0;
}

.ll-user-popover {
  position: absolute;
  left: 8px;
  bottom: calc(100% - 2px);
  width: 200px;
  padding: 6px;
  border: 1px solid var(--toolbox-border-color);
  border-radius: 6px;
  background: var(--background);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
  z-index: 60;
}

.ll-user-popover-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--toolbox-border-color);
}

.ll-user-popover-info {
  flex: 1;
  min-width: 0;
}

.ll-user-menu > li {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 8px;
  border-radius: 3px;
  font-size: 12px;
  color: var(--color);
  cursor: pointer;
}

.ll-user-menu > li:hover {
  background: var(--hover-background);
}

.ll-user-menu > li.danger {
  color: #f54a45;
}

.ll-resizer-x {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -5px;
  width: 10px;
  background: none;
  cursor: e-resize;
  z-index: 1000;
}

.ll-resizer-x.hidden {
  display: none;
}

/* ===== 右缘数据源抽屉（对齐官方 8088 控制台 Datasource 侧栏） ===== */
.ll-ds-tab {
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

.ll-ds-tab:hover {
  opacity: 1;
}

.ll-ds-tab.open {
  background: var(--selected-background, #0075ff);
  color: var(--selected-color, #fff);
  opacity: 1;
}

.ll-ds-drawer {
  flex-shrink: 0;
  min-width: 240px;
  max-width: 40vw;
  border-left: 1px solid var(--border-color);
  background: var(--background);
  overflow: auto;
}

.ll-editor-container {
  flex: 1;
  /* flex item 默认 min-width:auto，内部编辑器固有宽度会撑破视口，这里允许收缩 */
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-left: -5px;
  position: relative;
}</style>
