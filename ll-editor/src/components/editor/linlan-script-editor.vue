<script setup lang="ts">
import { inject, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { I18n } from '@/i18n'
import { LLEditor } from '@/core/LLEditor'
import type { LLEditorOptions, KBFile, KnowledgeBase, Diagnostic, EditorDoc } from '@/core/types'
import type { ConsoleEntry } from '@/runtime/console'
import type { LinlanApiEntity } from '@/api/linlanApi'
import { linlanApi } from '@/api/linlanApi'
import LinlanKbEditor from '@/components/editor/linlan-kb-editor.vue'
import LinlanTabs from '@/components/layout/linlan-tabs.vue'
import LinlanHistory from '@/components/editor/linlan-history.vue'
import LinlanDialog from '@/components/common/modal/linlan-dialog.vue'
import request from '@/api/request'
import bus from '@/scripts/bus'
import store from '@/scripts/store'
import { modal } from '@/components/common/modal/index'
import contants from '@/scripts/contants'
import JavaClass from '@/scripts/monaco/java-class'

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
const sqlHost = ref<HTMLDivElement | null>(null)
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
// 数据源模式（mode 3）独立缓存：每个数据源一份 SQL 文档，与接口/函数隔离
const dsDocsCache = new Map<string, EditorDoc>()
let dsActiveCache = ''

const isFnMode = (): boolean => props.mode === 2
const isDsMode = (): boolean => props.mode === 3
const docsCache = (): Map<string, EditorDoc> =>
  isFnMode() ? fnDocsCache : isDsMode() ? dsDocsCache : apiDocsCache

function buildCore(opts: LLEditorOptions): void {
  // 数据源模式把 Monaco 挂到独立的 sqlHost（与接口/函数模式的 apiHost 互不干扰）
  const host = isDsMode() ? sqlHost.value : apiHost.value
  if (!host) return
  // 对齐官方 initializeMagicScript：在创建编辑器之前同步注册 magicscript / mybatis 语言与
  // Monarch tokenizer，否则 SQL（""" ... """）块内不会走 mybatis 嵌入高亮，表现为整片纯黑文本。
  JavaClass.initializeMagicScript()
  const cache = docsCache()
  const cached = [...cache.values()]
  coreInst = new LLEditor(host, {
    showSidebar: false,
    showBottomPanel: false,
    // 中栏脚本区使用当前皮肤对应的 Monaco 主题（官方 default/dark 等），
    // 否则 EditorHost 会以内置 vs 主题创建编辑器，把全局主题重置成 vs，
    // 使 magicscript 的 token 落到 Monaco 默认配色（关键字无颜色、字符串为 vs 红）而非官方配色
    defaultTheme: (store.get('skin') as string) || 'default',
    // 对齐官方 magic-script-editor 的编辑器选项（字体、无 minimap、折叠、自动换行等）
    editorOptions: {
      minimap: { enabled: false },
      folding: true,
      lineDecorationsWidth: 35,
      wordWrap: 'on',
      fontFamily: contants.EDITOR_FONT_FAMILY,
      fontSize: contants.EDITOR_FONT_SIZE,
      fontLigatures: true,
      renderWhitespace: 'none'
    },
    // 函数模式无独立文档来源，中栏保持空态（不复用接口文档，也不注入示例脚本）
    initialDocs: cached.length
      ? cached
      : isFnMode() || isDsMode()
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
      // 数据源 SQL 文档额外落盘：刷新页面后草稿仍在
      if (isDsMode()) saveSqlDraft(d.id, d.content)
    }),
    coreInst.bus.on('doc:closed', ({ id }) => {
      cache.delete(id)
      state.openDocs = state.openDocs.filter((o) => o.id !== id)
      // 数据源文档全部关掉后，底部结果区回到「未选择数据源」
      if (isDsMode()) notifySqlState()
    }),
    coreInst.bus.on('tab:switched', ({ id }) => {
      state.activeId = id
      // 数据源文档间切换：结果区标题跟着切
      if (isDsMode()) notifySqlState()
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
  const activeCache = isFnMode() ? fnActiveCache : isDsMode() ? dsActiveCache : apiActiveCache
  if (activeCache && cache.has(activeCache)) {
    coreInst.switch(activeCache)
  }
  // 以 core 的实际文档集为准同步 tab 状态：
  // 无论走缓存恢复还是首次注入，都要把 openDocs 补齐，否则从函数模式切回接口模式时
  // 中栏已恢复文档内容，tab 条却因 openDocs 为空而不显示
  state.openDocs.length = 0
  coreInst.getPluginApi().listDocs().forEach((d) => state.openDocs.push({ id: d.id, name: d.name }))
  state.activeId = coreInst.getActiveDoc()?.id ?? ''
  flushPendingSqlDoc()
  notifySqlState()
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
  } else if (oldMode === 2) {
    fnActiveCache = state.activeId
  } else if (oldMode === 3) {
    dsActiveCache = state.activeId
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
    // 重建：等下一次 tick 让 v-if 渲染出对应模式的容器，再挂载 Monaco
    // 数据源模式（3）挂在 sqlHost，接口/函数模式挂在 apiHost
    nextTick(() => {
      const host = isDsMode() ? sqlHost.value : apiHost.value
      if (host) buildCore(props.Config ?? {})
    })
  }
}

watch(() => props.mode, (nv, ov) => rebuildCore(nv as number, ov as number))
// 底部结果区请求执行当前数据源的 SQL（带分页参数）
function onSqlRun(p?: { page?: number; size?: number }): void {
  void runSql(p?.page ?? 1, p?.size ?? SQL_MAX_ROWS)
}
onMounted(() => {
  rebuildCore(props.mode, -1)
  bus.$on('viewHistory', viewHistory)
  bus.$on('ll-sql-run', onSqlRun)
})
onBeforeUnmount(() => {
  bus.$off('viewHistory', viewHistory)
  bus.$off('ll-sql-run', onSqlRun)
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
// ===== 数据源 SQL 查询（mode 3）=====
const SQL_DRAFT_PREFIX = 'll-ds-sql-'
// 单次查询最多返回行数（防止误执行全表扫描拖垮前端）
const SQL_MAX_ROWS = 200
// 数据源文档状态广播给底部结果区：决定执行按钮可用态与结果区标题
function notifySqlState(): void {
  const doc = coreInst?.getActiveDoc?.()
  bus.$emit('ll-sql-state', { hasDoc: !!doc, docName: doc?.name ?? '' })
}

function readSqlDraft(id: string): string | null {
  try {
    return localStorage.getItem(SQL_DRAFT_PREFIX + id)
  } catch {
    return null
  }
}
function saveSqlDraft(id: string, content: string): void {
  try {
    localStorage.setItem(SQL_DRAFT_PREFIX + id, content)
  } catch {
    /* 存储不可用时忽略 */
  }
}

// 数据源文档 id 与数据源一一对应：有后端 id 用 id，否则落到 key
function sqlDocId(ds: { id?: string | null; name?: string; key?: string }): string {
  return 'ds-sql-' + String(ds.id || ds.key || ds.name || 'default')
}

// 切进数据源模式时 core 尚未重建（buildCore 在 nextTick 里执行），
// 先把待打开的数据源排队，等 core 就绪后自动打开
let pendingSqlDoc: { id?: string | null; name?: string; key?: string } | null = null

/** 打开（或激活）某个数据源的 SQL 文档：右侧编辑区即可编写并查询该数据源 */
function openSqlDoc(ds: { id?: string | null; name?: string; key?: string }): void {
  // 点击瞬间 props.mode 还未更新（isDsMode 仍为 false），先排队，
  // 等切进数据源模式且 core 就绪后由 flushPendingSqlDoc 真正打开
  pendingSqlDoc = ds
  flushPendingSqlDoc()
}

function flushPendingSqlDoc(): void {
  const ds = pendingSqlDoc
  if (!ds || !coreInst || !isDsMode()) return
  pendingSqlDoc = null
  const docId = sqlDocId(ds)
  // 已打开过则直接激活，避免用旧内容覆盖编辑区里的改动
  if (dsDocsCache.has(docId)) {
    coreInst.switch(docId)
    notifySqlState()
    return
  }
  const name = ds.name || ds.key || 'datasource'
  coreInst.open({
    id: docId,
    name: `${name}.sql`,
    language: 'sql',
    content: readSqlDraft(docId) ?? `-- ${name}\nSELECT * FROM `,
    updatedAt: Date.now(),
    // meta 保存数据源定位信息，执行 SQL 时随文档取用
    meta: { dsId: ds.id ?? '', dsKey: ds.key ?? '' }
  })
  notifySqlState()
}

/** 执行当前数据源 SQL 文档：结果/错误统一广播给底部结果工作区 */
async function runSql(page = 1, size = SQL_MAX_ROWS): Promise<void> {
  const fail = (text: string): void => {
    bus.$emit('ll-sql-result', { result: null, error: text, page, size })
  }
  const doc = coreInst?.getActiveDoc?.()
  if (!doc) return fail(i18n.t('datasource.sqlEmptyDoc'))
  const sql = (doc.content ?? '').trim()
  if (!sql) return fail(i18n.t('datasource.sqlEmpty'))
  const meta = (doc.meta ?? {}) as Record<string, unknown>
  try {
    const result = await linlanApi.executeSql({
      id: String(meta.dsId ?? ''),
      key: String(meta.dsKey ?? ''),
      sql,
      page,
      size
    })
    bus.$emit('ll-sql-result', { result, error: '', page, size })
  } catch (e) {
    const msg = (e as Error).message || ''
    // 后端未实现查询端点（404/405 或代理不通）时给出可操作的提示
    fail(/404|405|Failed to fetch|NetworkError/.test(msg) ? i18n.t('datasource.sqlUnsupported') : msg)
  }
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

defineExpose({ run, continueDbg, stepDbg, save, openApi, openSqlDoc, runSql, getContent })
</script>

<template>
  <div class="ll-editor-container ll-editor-canvas-wrap">
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
          <div v-else class="ll-empty">{{ i18n.t('knowledge.selectFile') }}</div>
        </div>
      </div>
    </template>

    <template v-else-if="mode === 1 || mode === 2">
      <div class="ll-editor-api">
        <LinlanTabs />
        <div ref="apiHost" class="ll-editor-canvas"></div>
      </div>
    </template>
    <!-- 数据源模式：编辑器只写 SQL，查询结果在底部结果工作区 -->
    <template v-else-if="mode === 3">
      <div class="ll-editor-api">
        <LinlanTabs />
        <div ref="sqlHost" class="ll-editor-canvas"></div>
      </div>
    </template>
    <div v-else class="ll-empty">{{ i18n.t('datasource.sqlHint') }}</div>
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
          class="ll-button active"
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
