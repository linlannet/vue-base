<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import type { I18n } from '@/i18n'
import bus from '@/scripts/bus'
import type { SqlQueryResult } from '@/api/linlanApi'

/**
 * 数据源 SQL 查询结果区（底部面板，参考数据库客户端的结果工作区）：
 * 工具条（执行 / 行数 / 导出 / 清空）+ 结果·消息子页签 + 数据表格 + 状态栏（行数·耗时·分页）
 * 与编辑区之间通过 bus 通信，避免与编辑器耦合：
 *  - 监听 ll-sql-state：当前是否有打开的数据源 SQL 文档
 *  - 发出 ll-sql-run：请求执行（带分页参数）
 *  - 监听 ll-sql-result：接收执行结果
 */
const i18n = inject<I18n>('ll-i18n')!

const tab = ref<'result' | 'message'>('result')
const result = ref<SqlQueryResult | null>(null)
const error = ref('')
const running = ref(false)
const hasDoc = ref(false)
const docName = ref('')
const page = ref(1)
const size = ref(200)
const total = ref(0)
const cost = ref(0)

function onResult(p: { result: SqlQueryResult | null; error: string; page: number; size: number }): void {
  running.value = false
  page.value = p.page || 1
  size.value = p.size || size.value
  if (p.error) {
    error.value = p.error
    result.value = null
    total.value = 0
    cost.value = 0
    tab.value = 'message'
    return
  }
  result.value = p.result
  error.value = ''
  total.value = p.result?.total ?? p.result?.rows?.length ?? 0
  cost.value = p.result?.cost ?? 0
  tab.value = 'result'
}

function onState(s: { hasDoc: boolean; docName: string }): void {
  hasDoc.value = s.hasDoc
  docName.value = s.docName
}

onMounted(() => {
  bus.$on('ll-sql-result', onResult)
  bus.$on('ll-sql-state', onState)
})
onBeforeUnmount(() => {
  bus.$off('ll-sql-result', onResult)
  bus.$off('ll-sql-state', onState)
})

function run(pageNo: number): void {
  if (!hasDoc.value || running.value) return
  running.value = true
  bus.$emit('ll-sql-run', { page: pageNo, size: size.value })
}
function prevPage(): void {
  if (page.value > 1 && !running.value) run(page.value - 1)
}
function nextPage(): void {
  if (page.value * size.value < total.value && !running.value) run(page.value + 1)
}
function clear(): void {
  result.value = null
  error.value = ''
  total.value = 0
  cost.value = 0
}

// 单元格展示：NULL 单独标记，对象/数组转 JSON
function fmt(v: unknown): string {
  if (v === null || v === undefined) return i18n.t('datasource.sqlNull')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

// 导出 CSV：带 BOM，Excel 直接打开不乱码
function exportCsv(): void {
  const r = result.value
  if (!r || !r.rows.length) return
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [r.columns.map(esc).join(',')]
  r.rows.forEach((row) => lines.push(r.columns.map((c) => esc(row[c])).join(',')))
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = (docName.value || 'result').replace(/\.sql$/i, '') + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="ll-sql-result">
    <div class="ll-sql-toolbar not-select">
      <span class="ll-sql-ds" :title="docName">{{ docName || i18n.t('datasource.sqlNoDs') }}</span>
      <button class="ll-mini primary" :disabled="!hasDoc || running" @click="run(1)">
        <i class="ll-icon ll-icon-run" />{{
          running ? i18n.t('datasource.sqlRunning') : i18n.t('datasource.sqlRun')
        }}
      </button>
      <span class="ll-sql-size-wrap">
        <select v-model.number="size" class="ll-sql-size" :title="i18n.t('datasource.sqlLimit')">
          <option :value="50">50</option>
          <option :value="200">200</option>
          <option :value="500">500</option>
          <option :value="1000">1000</option>
        </select>
      </span>
      <button class="ll-mini" :disabled="!result" :title="i18n.t('datasource.sqlExport')" @click="exportCsv">
        <i class="ll-icon ll-icon-save" />CSV
      </button>
      <button class="ll-mini" :disabled="!result && !error" :title="i18n.t('panel.clear')" @click="clear">
        <i class="ll-icon ll-icon-delete" />
      </button>
      <span class="ll-sql-spacer"></span>
      <div class="ll-sql-tabs">
        <button :class="{ active: tab === 'result' }" @click="tab = 'result'">
          {{ i18n.t('datasource.sqlTabResult') }}
        </button>
        <button :class="{ active: tab === 'message' }" @click="tab = 'message'">
          {{ i18n.t('datasource.sqlTabMessage') }}
        </button>
      </div>
    </div>

    <div class="ll-sql-body">
      <template v-if="tab === 'message'">
        <div v-if="error" class="ll-sql-error">{{ error }}</div>
        <div v-else class="ll-sql-empty">{{ i18n.t('datasource.sqlNoMessage') }}</div>
      </template>
      <div v-else-if="!hasDoc" class="ll-sql-empty">{{ i18n.t('datasource.sqlEmptyDoc') }}</div>
      <div v-else-if="!result || !result.rows || !result.rows.length" class="ll-sql-empty">
        {{ i18n.t('datasource.sqlNoResult') }}
      </div>
      <table v-else class="ll-sql-table">
        <thead>
          <tr>
            <th class="ll-sql-idx">#</th>
            <th v-for="c in result.columns" :key="c">{{ c }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in result.rows" :key="i">
            <td class="ll-sql-idx">{{ (page - 1) * size + i + 1 }}</td>
            <td
              v-for="c in result.columns"
              :key="c"
              :class="{ 'll-sql-null': row[c] === null || row[c] === undefined }"
            >
              {{ fmt(row[c]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="ll-sql-status not-select">
      <span class="ll-sql-stat">
        <template v-if="result">
          {{ i18n.t('datasource.sqlRows').replace('{n}', String(total)) }}
          · {{ i18n.t('datasource.sqlCost').replace('{n}', String(cost)) }}
        </template>
        <template v-else-if="!hasDoc">{{ i18n.t('datasource.sqlEmptyDoc') }}</template>
        <template v-else>{{ i18n.t('datasource.sqlNoResult') }}</template>
      </span>
      <span class="ll-sql-pager">
        <button :disabled="page <= 1 || running" :title="i18n.t('datasource.sqlPrev')" @click="prevPage">‹</button>
        <span class="ll-sql-page">{{ page }}</span>
        <button
          :disabled="!result || page * size >= total || running"
          :title="i18n.t('datasource.sqlNext')"
          @click="nextPage"
        >
          ›
        </button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.ll-sql-result {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
}

/* ===== 工具条 ===== */
.ll-sql-toolbar {
  flex: none;
  height: 28px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  background: var(--background, #fff);
  font-size: 12px;
}

.ll-sql-ds {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: #24292f;
}

.ll-sql-spacer {
  flex: 1;
}

.ll-sql-toolbar .ll-mini {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  /* 覆盖全局 .ll-mini 的固定 22px，带文字的按钮按内容撑开 */
  width: auto;
  padding: 0 6px;
  white-space: nowrap;
}

.ll-sql-toolbar .ll-mini.primary {
  border-color: #b6d7ff;
  color: #1f6feb;
}

.ll-sql-size {
  height: 20px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 3px;
  background: #fff;
  color: #24292f;
  font-size: 11px;
}

.ll-sql-tabs {
  display: inline-flex;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 3px;
  overflow: hidden;
}

.ll-sql-tabs button {
  padding: 0 8px;
  height: 20px;
  border: 0;
  background: #fff;
  color: #57606a;
  font-size: 11px;
  cursor: pointer;
}

.ll-sql-tabs button.active {
  background: #e7f0ff;
  color: #1f6feb;
}

/* ===== 结果区 ===== */
.ll-sql-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ll-sql-error {
  padding: 8px 10px;
  color: #d1242f;
  font-size: 12px;
  white-space: pre-wrap;
}

.ll-sql-empty {
  padding: 8px 10px;
  color: #8b949e;
  font-size: 12px;
}

.ll-sql-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.ll-sql-table th,
.ll-sql-table td {
  padding: 3px 8px;
  border-right: 1px solid #eaeef2;
  border-bottom: 1px solid #eaeef2;
  white-space: nowrap;
  text-align: left;
}

.ll-sql-table thead th {
  position: sticky;
  top: 0;
  background: #f6f8fa;
  color: #24292f;
  z-index: 1;
}

.ll-sql-table tbody tr:hover td {
  background: #f6f8fa;
}

.ll-sql-idx {
  width: 42px;
  color: #8b949e;
}

.ll-sql-null {
  color: #8b949e;
  font-style: italic;
}

/* ===== 状态栏 ===== */
.ll-sql-status {
  flex: none;
  height: 22px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  background: var(--background, #fff);
  font-size: 11px;
  color: #57606a;
}

.ll-sql-stat {
  flex: 1;
}

.ll-sql-pager {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ll-sql-pager button {
  width: 18px;
  height: 16px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 3px;
  background: #fff;
  color: #24292f;
  line-height: 1;
  cursor: pointer;
}

.ll-sql-pager button:disabled {
  color: #c0c6cc;
  cursor: default;
}
</style>
