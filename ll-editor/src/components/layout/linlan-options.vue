<script setup lang="ts">
// 底部选项面板（自 third-magic-editor magic-options.vue 结构移植）：
// - KB 模式：保留 ll-editor 原生面板（预览/控制台/调试/问题）
// - 接口/函数/数据源模式：对齐官方 8088 控制台，底部主 tab 栏固定 10 项
//   （接口信息 / 执行结果 / 函数信息 / 接口分组 / 调试信息 / 运行日志 / 全局参数 / TODO / 历史记录 / 事件）
import { computed, inject, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { I18n } from '@/i18n'
import type { ConsoleEntry } from '@/runtime/console'
import type { Diagnostic } from '@/core/types'
import type { LinlanApiEntity } from '@/api/linlanApi'
import bus from '@/scripts/bus'
import { clearRunLogs } from '@/api/linlanRun'

import LinlanBottomPanel from '@/components/common/linlan-bottom-panel.vue'
import LinlanRequest from './linlan-request.vue'
import LinlanRun from './linlan-run.vue'
import LinlanDebug from './linlan-debug.vue'
import LinlanFunction from './linlan-function.vue'
import LinlanGroup from './linlan-group.vue'
import LinlanLog from './linlan-log.vue'
import LinlanSettings from './linlan-settings.vue'
import LinlanTodo from './linlan-todo.vue'
import LinlanHistoryPanel from './linlan-history-panel.vue'
import LinlanEvent from './linlan-event.vue'
import LinlanSqlResult from '@/components/editor/linlan-sql-result.vue'

const props = withDefaults(
  defineProps<{ mode?: 'kb' | 'api' | 'fn' | 'ds'; previewHtml?: string; expanded?: boolean }>(),
  { mode: 'kb', expanded: true }
)
const emit = defineEmits<{ (e: 'toggle'): void }>()
const i18n = inject<I18n>('ll-i18n')!
const state = inject<{ activeTab: string; variables: Record<string, unknown> }>('ll-state')!
const dbg = inject<{ consoleEntries: ConsoleEntry[]; diagnostics: Diagnostic[] }>('ll-debug')!
const currentApi = inject<Ref<LinlanApiEntity | null>>('ll-api')
const actions = inject<{ onRun: () => void; onContinue: () => void; onStep: () => void }>('ll-actions')

const cons = computed<ConsoleEntry[]>(() => (dbg.consoleEntries as unknown as { value?: ConsoleEntry[] }).value ?? dbg.consoleEntries)
const diags = computed<Diagnostic[]>(() => (dbg.diagnostics as unknown as { value?: Diagnostic[] }).value ?? dbg.diagnostics)
const isKb = computed(() => props.mode === 'kb')
// 数据源模式：底部不再是 tab 栏，而是 SQL 查询结果工作区
const isDs = computed(() => props.mode === 'ds')

// ===== magic-options 结构：apiTabs / functionTabs / apiGroupTabs / commonTabs =====
interface BottomTab {
  id: string
  name: string
  icon: string
  component: unknown
  right?: boolean
}
// 对齐官方 8088 控制台：底部主 tab 栏固定 10 项，不随选中对象切换。
// 「接口选项」已作为「接口信息」的子页签（linlan-request.vue），主 tab 栏补上「历史记录」
const mainTabs: BottomTab[] = [
  { id: 'request', name: '接口信息', icon: 'parameter', component: LinlanRequest },
  { id: 'result', name: '执行结果', icon: 'run', component: LinlanRun },
  { id: 'function', name: '函数信息', icon: 'parameter', component: LinlanFunction },
  { id: 'group', name: '接口分组', icon: 'parameter', component: LinlanGroup },
  { id: 'debug', name: '调试信息', icon: 'debug-info', component: LinlanDebug }
]
const commonTabs: BottomTab[] = [
  { id: 'log', name: '运行日志', icon: 'log', component: LinlanLog },
  { id: 'setting', name: '全局参数', icon: 'settings', component: LinlanSettings },
  { id: 'todo', name: 'TODO', icon: 'todo', component: LinlanTodo },
  { id: 'history', name: '历史记录', icon: 'history', component: LinlanHistoryPanel },
  { id: 'event', name: '事件', icon: 'event', component: LinlanEvent, right: true }
]

// 当前选中底部 tab（空串 = 面板最小化，只留 tab 条）
const selectedTab = ref('')
// 点击资源树分组时暂存的分组信息（api-group-selected），打开接口后自动退出
const groupInfo = ref<Record<string, unknown> | null>(null)

// 接口模式底部固定七个部分：接口信息/执行结果/调试信息/运行日志/全局参数/TODO/历史记录
// 函数模式底部固定五个部分：函数信息/调试信息/运行日志/TODO/历史记录
// （接口分组只在选中分组时临时出现，事件入口不在底部 tab 栏）
const API_TAB_IDS = ['request', 'result', 'debug', 'log', 'setting', 'todo', 'history', 'event']
const FN_TAB_IDS = ['function', 'debug', 'log', 'todo', 'history', 'event']

const tabs = computed<BottomTab[]>(() => {
  const all: BottomTab[] = [...mainTabs, ...commonTabs]
  if (props.mode === 'api') return all.filter((t) => API_TAB_IDS.includes(t.id))
  if (props.mode === 'fn') return all.filter((t) => FN_TAB_IDS.includes(t.id))
  return all
})

// 各 tab 的 info：分组 tab 用选中分组；函数 tab 用空占位（函数功能尚未实现）；
// 其余 tab 用当前打开的接口实体，无实体时退化为各 tab 独立的空对象
const emptyInfos = reactive<Record<string, Record<string, unknown>>>({
  request: {}, result: {}, function: {}, group: {}, debug: {},
  log: {}, setting: {}, todo: {}, history: {}, event: {}
})
function tabInfoFor(id: string): Record<string, unknown> {
  if (id === 'group') return groupInfo.value ?? emptyInfos.group
  if (id === 'function') return emptyInfos.function
  return currentApi?.value ?? emptyInfos[id] ?? {}
}

// ===== bus 事件（对齐 magic-options mounted 订阅） =====
function onGroupSelected(group: Record<string, unknown>): void {
  groupInfo.value = group
  // 接口模式没有「接口分组」tab，避免切到一个不存在的面板
  if (tabs.value.some((it) => it.id === 'group')) selectedTab.value = 'group'
  bus.$emit('update-window-size')
}
function onOpened(entity: Record<string, unknown>): void {
  if ((entity as { empty?: boolean })?.empty) return
  // 打开接口/函数后退出分组视图，切到对应 tab 集
  groupInfo.value = null
  bus.$emit('update-window-size')
}
function onSwitchTab(target: string): void {
  // KB 模式使用 state.activeTab（预览/控制台/调试/问题），
  // 运行代码文件后由 useApiActions 通过 switch-tab 切到控制台
  if (isKb.value) {
    if (['preview', 'console', 'debug', 'problems'].includes(target)) {
      state.activeTab = target
      bus.$emit('update-window-size')
    }
    return
  }
  if (!tabs.value.some((it) => it.id === target)) return
  selectedTab.value = target
  bus.$emit('update-window-size')
}
function onDoContinue(): void {
  actions?.onContinue()
}
function onDoStepInto(): void {
  actions?.onStep()
}

watch(
  () => props.mode,
  (v) => {
    groupInfo.value = null
    // 官方底部 tab 栏固定，仅在切换资源类型时给出合理默认选中
    if (v === 'fn') selectedTab.value = 'function'
    else if (v === 'api') selectedTab.value = 'request'
    // 数据源模式无对应底部 tab，清空选中避免残留上一个模式的 tab
    else if (v === 'ds') selectedTab.value = ''
    bus.$emit('update-window-size')
  }
)
watch(
  () => currentApi?.value,
  (v) => {
    if (v) groupInfo.value = null
  }
)
watch(selectedTab, () => bus.$emit('update-window-size'))
// 切模式（tab 条才渲染）/ 折叠时重新测量可用宽度
watch([() => props.mode, () => props.expanded], () => void nextTick(fitTabs))

onMounted(() => {
  if (!isKb.value) selectedTab.value = props.mode === 'fn' ? 'function' : props.mode === 'ds' ? '' : 'request'
  document.addEventListener('click', onDocClick, true)
  nextTick(fitTabs)
  bus.$on('api-group-selected', onGroupSelected)
  bus.$on('opened', onOpened)
  bus.$on('switch-tab', onSwitchTab)
  bus.$on('doContinue', onDoContinue)
  bus.$on('doStepInto', onDoStepInto)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  document.removeEventListener('click', onDocClick, true)
  bus.$off('api-group-selected', onGroupSelected)
  bus.$off('opened', onOpened)
  bus.$off('switch-tab', onSwitchTab)
  bus.$off('doContinue', onDoContinue)
  bus.$off('doStepInto', onDoStepInto)
})

// ===== 底部 tab 条：宽度不足时，超出的左侧项收进「⋯ 更多」菜单 =====
// 右侧项（事件 / 折叠 / ⋯）始终保留，左侧项从右往左依次收起
const tabBarEl = ref<HTMLElement | null>(null)
const moreOpen = ref(false)
const hiddenIds = ref<string[]>([])
const tabWidths = new Map<string, number>()
const MORE_WIDTH = 26
let ro: ResizeObserver | null = null

function isHidden(id: string): boolean {
  return hiddenIds.value.includes(id)
}
// 选中的 tab 被收进菜单时，⋯ 也要显示选中态
const moreActive = computed(() => moreOpen.value || isHidden(selectedTab.value))

function pickTab(id: string): void {
  selectedTab.value = selectedTab.value === id ? '' : id
  moreOpen.value = false
}
function ensureObserver(): void {
  if (ro || !tabBarEl.value) return
  ro = new ResizeObserver(() => fitTabs())
  ro.observe(tabBarEl.value)
}
function fitTabs(): void {
  const ul = tabBarEl.value
  if (!ul) return
  ensureObserver()
  ul.querySelectorAll<HTMLElement>('li[data-tab]').forEach((el) => {
    if (el.offsetWidth > 0) tabWidths.set(el.dataset.tab!, el.offsetWidth)
  })
  const rightWidth = Array.from(ul.querySelectorAll<HTMLElement>('li[data-right]')).reduce(
    (s, el) => s + (el.dataset.tab ? tabWidths.get(el.dataset.tab) || 0 : el.offsetWidth),
    0
  )
  const avail = ul.clientWidth
  const lefts = tabs.value.filter((it) => !it.right)
  // 从左到右保留，装不下的那项及其后全部收进菜单（保持 tab 原有顺序）
  const compute = (withMore: boolean): string[] => {
    let used = rightWidth + (withMore ? MORE_WIDTH : 0)
    for (let i = 0; i < lefts.length; i++) {
      const w = tabWidths.get(lefts[i].id) || 90
      if (used + w > avail) return lefts.slice(i).map((it) => it.id)
      used += w
    }
    return []
  }
  let hidden = compute(false)
  if (hidden.length) hidden = compute(true)
  hiddenIds.value = hidden
  if (!hidden.length) moreOpen.value = false
}
function onDocClick(e: MouseEvent): void {
  const t = e.target as HTMLElement | null
  if (t?.closest('.ll-bottom-more') || t?.closest('.ll-bottom-more-menu')) return
  moreOpen.value = false
}

function formatVal(v: unknown): string {
  try {
    return typeof v === 'object' ? JSON.stringify(v) : String(v)
  } catch {
    return String(v)
  }
}
function clearConsole(): void {
  if (props.mode === 'kb') {
    dbg.consoleEntries.length = 0
  } else {
    clearRunLogs()
  }
}
</script>

<template>
  <div class="ll-editor-bottom ll-bottom-wrap" :class="{ collapsed: !props.expanded }">
    <!-- ===== KB 模式：保留 ll-editor 原生底部面板 ===== -->
    <template v-if="isKb">
      <div class="ll-editor-tab2">
        <button :class="{ active: state.activeTab === 'preview' }" @click="state.activeTab = 'preview'">{{ i18n.t('panel.preview') }}</button>
        <button :class="{ active: state.activeTab === 'console' }" @click="state.activeTab = 'console'">{{ i18n.t('panel.console') }}</button>
        <button :class="{ active: state.activeTab === 'debug' }" @click="state.activeTab = 'debug'">{{ i18n.t('panel.debug') }}</button>
        <button :class="{ active: state.activeTab === 'problems' }" @click="state.activeTab = 'problems'">
          {{ i18n.t('panel.problems') }} ({{ diags.length }})
        </button>
        <span class="ll-editor-tab2-spacer"></span>
        <button class="ll-editor-clear" @click="clearConsole">{{ i18n.t('panel.clear') }}</button>
        <button
          class="ll-editor-toggle"
          :title="props.expanded ? '折叠 (docker 式)' : '展开'"
          @click="emit('toggle')"
        >
          <span v-if="props.expanded">-</span>
          <span v-else>+</span>
        </button>
      </div>
      <div class="ll-editor-panel" v-show="props.expanded">
        <div v-show="state.activeTab === 'preview'" class="ll-editor-preview" v-html="previewHtml"></div>
        <div v-show="state.activeTab === 'console'" class="ll-editor-console">
          <div v-if="!cons.length" class="ll-empty">{{ i18n.t('bottom.empty') }}</div>
          <div v-for="c in cons" :key="c.id" class="ll-console-line" :class="'lv-' + c.level">
            <span class="ll-console-ts">[{{ new Date(c.ts).toLocaleTimeString() }}]</span>
            <span class="ll-console-text">{{ c.text }}</span>
          </div>
        </div>
        <div v-show="state.activeTab === 'debug'" class="ll-editor-debug">
          <div v-if="!Object.keys(state.variables).length" class="ll-empty">{{ i18n.t('debug.empty') }}</div>
          <div v-for="(v, k) in state.variables" :key="k" class="ll-debug-row">
            <span class="ll-debug-key">{{ k }}</span>
            <span class="ll-debug-val">{{ formatVal(v) }}</span>
          </div>
        </div>
        <div v-show="state.activeTab === 'problems'" class="ll-editor-problems">
          <div v-if="!diags.length" class="ll-empty">{{ i18n.t('problems.empty') }}</div>
          <div v-for="(d, i) in diags" :key="i" class="ll-problem-row" :class="'sev-' + d.severity">
            <span class="ll-problem-sev">{{ d.severity === 'error' ? '×' : d.severity === 'warning' ? '!' : 'i' }}</span>
            <span class="ll-problem-msg">{{ d.message }}</span>
            <span class="ll-problem-pos">{{ d.line }}:{{ d.column }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 数据源模式：SQL 查询结果工作区（编辑器写 SQL，这里看结果） ===== -->
    <template v-else-if="isDs">
      <LinlanSqlResult />
    </template>

    <!-- ===== 接口/函数模式：magic-options 结构（内容在上、tab 条在下） ===== -->
    <template v-else>
      <div v-show="selectedTab && props.expanded" class="ll-bottom-content-container">
        <LinlanBottomPanel
          v-for="item in tabs"
          :key="'bottom_tab_content_' + item.id"
          :title="item.name"
          :class="{ visible: selectedTab === item.id }"
          @update:selectedTab="selectedTab = $event ?? ''"
        >
          <component :is="item.component" :info="tabInfoFor(item.id)" :mode="props.mode" />
        </LinlanBottomPanel>
      </div>
      <ul ref="tabBarEl" class="ll-bottom-tab not-select">
        <li
          v-for="item in tabs"
          v-show="!hiddenIds.includes(item.id)"
          :key="'bottom_tab_' + item.id"
          :data-tab="item.id"
          :data-right="item.right ? '1' : null"
          :class="{ selected: selectedTab === item.id, 'float-right': item.right }"
          @click="pickTab(item.id)"
        >
          <i :class="'ll-icon ll-icon-' + item.icon"></i>{{ item.name }}
        </li>
        <li
          v-if="hiddenIds.length"
          class="float-right ll-bottom-more"
          data-right
          :class="{ active: moreActive }"
          title="更多"
          @click.stop="moreOpen = !moreOpen"
        >
          ⋯
        </li>
        <li class="float-right ll-bottom-toggle" data-right :title="props.expanded ? '折叠' : '展开'" @click="emit('toggle')">
          <i class="ll-icon" :class="props.expanded ? 'll-icon-minimize' : 'll-icon-arrow-bottom'"></i>
        </li>
      </ul>
      <!-- 收起来的 tab：向上弹出，放在 tab 条外避免被裁剪 -->
      <ul v-show="moreOpen" class="ll-bottom-more-menu not-select" @click.stop>
        <li
          v-for="item in tabs.filter((it) => hiddenIds.includes(it.id))"
          :key="'more_tab_' + item.id"
          :class="{ selected: selectedTab === item.id }"
          @click.stop="pickTab(item.id)"
        >
          <i :class="'ll-icon ll-icon-' + item.icon"></i>{{ item.name }}
        </li>
      </ul>
    </template>
  </div>
</template>

<style>
/* ===== magic-options 非 scoped 样式（自 third-magic-editor 移植，供所有底部面板组件共享） ===== */
/* 数据源结果区：占满底部面板可用高度 */
.ll-bottom-wrap > .ll-sql-result {
  flex: 1;
  min-height: 0;
}

.ll-bottom-wrap .ll-bottom-content-container {
  flex: 1;
  min-height: 0;
  border-bottom: 1px solid var(--tab-bar-border-color);
  overflow: hidden;
  position: relative;
}

.ll-bottom-wrap .ll-bottom-content-container > div {
  display: none;
}

.ll-bottom-wrap .ll-bottom-content-container > .visible {
  display: block;
}

/* tab 项总宽可能超过面板宽度：超出的收进「⋯ 更多」菜单，不撑破底部面板 */
.ll-bottom-wrap {
  position: relative;
  overflow: hidden;
}

.ll-bottom-tab {
  height: 24px;
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  background: var(--background);
  /* 超出的 tab 已收进「⋯ 更多」菜单，条上不再横滑 */
  overflow: hidden;
}

.ll-bottom-tab li {
  float: left;
  flex: none;
  cursor: pointer;
  /* 4px 而非 8px：接口模式 8 个 tab（含事件）在 619px 面板上刚好全部放得下 */
  padding: 0 4px;
  height: 24px;
  line-height: 24px;
  color: var(--color);
  list-style: none;
  white-space: nowrap;
}

.ll-bottom-tab li.float-right {
  float: right;
  margin-left: auto;
}

.ll-bottom-tab li i {
  color: var(--icon-color);
  padding: 0 2px;
  display: inline-block;
  vertical-align: top;
}

.ll-bottom-tab li:hover {
  background: var(--hover-background);
}

.ll-bottom-tab li.selected {
  background: var(--selected-background);
}

/* 更多按钮 + 弹出菜单 */
.ll-bottom-more {
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 22px;
}

.ll-bottom-more.active {
  background: var(--selected-background);
}

.ll-bottom-more-menu {
  position: absolute;
  right: 4px;
  bottom: 26px;
  min-width: 116px;
  margin: 0;
  padding: 2px 0;
  list-style: none;
  background: var(--background);
  border: 1px solid var(--border-color, #d0d7de);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 20;
}

.ll-bottom-more-menu li {
  float: none;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  white-space: nowrap;
  color: var(--color);
  cursor: pointer;
}

.ll-bottom-more-menu li:hover {
  background: var(--hover-background);
}

.ll-bottom-more-menu li.selected {
  background: var(--selected-background);
}

.ll-nav {
  border-bottom: 1px solid var(--tab-bar-border-color);
  height: 24px;
}

.ll-nav li {
  display: inline-block;
  height: 24px;
  line-height: 24px;
  padding: 0 10px;
  cursor: pointer;
}

.ll-nav li.selected {
  background: var(--selected-background);
}

.ll-nav li:hover:not(.selected) {
  background: var(--hover-background);
}

.ll-layout {
  display: flex;
  flex: auto;
  flex-direction: row;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}

.ll-layout .ll-layout-container {
  flex: auto;
  height: 100%;
  width: 100%;
  min-width: 0;
  overflow: auto;
}

.ll-layout .ll-header > * {
  padding: 0 2px;
  border-right: none !important;
}

.ll-layout .ll-table-row > * {
  display: inline-block;
  width: 60%;
  height: 23px;
  line-height: 23px;
  border-bottom: 1px solid var(--input-border-color);
  border-right: 1px solid var(--input-border-color);
  background: var(--background);
}

.ll-layout .ll-table-row input:focus {
  border-color: var(--input-border-foucs-color);
}

.ll-layout .ll-table-row input {
  border-color: transparent;
  border-top-color: transparent;
  border-right-color: transparent;
  border-bottom-color: transparent;
  border-left-color: transparent;
}

.ll-layout .ll-table-row > *:first-child,
.ll-layout .ll-table-row > *:last-child {
  width: 20%;
}

.ll-layout .ll-content {
  flex: auto;
  overflow-x: hidden;
  height: calc(100% - 50px);
}

.ll-layout .ll-sider {
  border-right: 1px solid var(--tab-bar-border-color);
}

.ll-layout .ll-sider > * {
  width: 18px;
  height: 18px;
  line-height: 18px;
  margin: 3px;
  text-align: center;
  padding: 0;
  color: var(--icon-color);
  border-radius: 2px;
}

.ll-layout .ll-sider > *:hover {
  background: var(--hover-background);
}

.ll-nav-tab li {
  display: inline-block;
  height: 24px;
  line-height: 24px;
  padding: 0 10px;
  cursor: pointer;
}

.ll-nav-tab li.selected {
  background: var(--selected-background);
}

.ll-nav-tab li:hover {
  background: var(--hover-background);
}

.ll-nav-tab {
  border-bottom: 1px solid var(--tab-bar-border-color);
  height: 24px;
}

.ll-bottom-toggle {
  color: var(--icon-color);
}
</style>
