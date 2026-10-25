<script setup lang="ts">
// @ts-nocheck
// 底部「历史记录」面板，对齐官方 8088 控制台：
// 官方该面板展示的是全量备份列表（GET /backups），列：时间 / 类型 / 操作人 / 名称，
// 顶部工具栏提供「刷新」「全量备份」。
// 注意：不是按当前脚本过滤的 GET /backup/{id}（那条接口只返回单个脚本自己的备份，
// 没有备份时恒为空，表现为「没有信息」）。
import { onBeforeUnmount, onMounted, ref } from 'vue'
import request from '@/api/request'
import bus from '@/scripts/bus'

interface BackupRow {
  id?: string
  createDate?: number
  type?: string
  name?: string
  createBy?: string
  tag?: string
}

const rows = ref<BackupRow[]>([])
const loading = ref(false)
const error = ref('')

const typeText: Record<string, string> = {
  api: '接口',
  function: '函数',
  'api-group': '接口分组',
  'function-group': '函数分组',
  datasource: '数据源'
}
function typeLabel(t?: string): string {
  return typeText[t || ''] || t || ''
}
function fmtDate(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function load(): void {
  loading.value = true
  error.value = ''
  request
    .send('backups', null, { method: 'get' })
    .success((data: BackupRow[]) => {
      loading.value = false
      rows.value = data || []
    })
    .exception(() => {
      loading.value = false
      error.value = '历史记录加载失败'
    })
}

function fullBackup(): void {
  request
    .send('backup/full', null, { method: 'post' })
    .success(() => {
      bus.$emit('status', '全量备份成功')
      load()
    })
    .exception(() => {
      bus.$emit('status', '全量备份失败')
    })
}

function onSwitchTab(target: string): void {
  if (target === 'history') load()
}

onMounted(load)
bus.$on('switch-tab', onSwitchTab)
onBeforeUnmount(() => bus.$off('switch-tab', onSwitchTab))
</script>

<template>
  <div class="ll-backup">
    <ul class="ll-panel-toolbar not-select">
      <li title="刷新" @click="load"><i class="ll-icon ll-icon-refresh"></i></li>
      <li title="全量备份" @click="fullBackup"><i class="ll-icon ll-icon-copy"></i></li>
    </ul>
    <div class="ll-backup-body">
      <div v-if="loading" class="ll-backup-empty">加载中…</div>
      <div v-else-if="error" class="ll-backup-empty">{{ error }}</div>
      <div v-else-if="!rows.length" class="ll-backup-empty">暂无历史记录</div>
      <div v-else class="ll-table">
        <div class="ll-table-row ll-table-header">
          <div>时间</div>
          <div>类型</div>
          <div>操作人</div>
          <div>名称</div>
        </div>
        <div v-for="(row, i) in rows" :key="row.id || i" class="ll-table-row">
          <div>{{ fmtDate(row.createDate) }}</div>
          <div>{{ typeLabel(row.type) }}</div>
          <div>{{ row.createBy || '' }}</div>
          <div>{{ row.name || '' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ll-backup {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--background);
  color: var(--color);
}

.ll-panel-toolbar {
  height: 24px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--tab-bar-border-color);
  padding-left: 4px;
}

.ll-panel-toolbar > li {
  height: 24px;
  line-height: 24px;
  padding: 0 6px;
  color: var(--icon-color);
  cursor: pointer;
}

.ll-panel-toolbar > li:hover {
  background: var(--toolbox-list-hover-background);
}

.ll-backup-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ll-backup-empty {
  padding: 12px;
  color: var(--desc-color, #888);
  font-size: 12px;
}

.ll-table {
  font-size: 12px;
}

.ll-table-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--tab-bar-border-color);
}

.ll-table-row > div {
  flex: 1;
  min-width: 0;
  height: 24px;
  line-height: 24px;
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ll-table-row > div:first-child {
  flex: 0 0 150px;
}

.ll-table-row > div:nth-child(2) {
  flex: 0 0 100px;
}

.ll-table-row > div:nth-child(3) {
  flex: 0 0 100px;
}

.ll-table-header {
  background: var(--toolbox-list-hover-background);
  font-weight: 600;
}

.ll-table > .ll-table-row:not(.ll-table-header):hover {
  background: var(--toolbox-list-hover-background);
}
</style>
