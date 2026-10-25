<script setup lang="ts">
// 最近打开（对齐官方 magic-recent-opened）：
// - Ctrl+E 呼出弹窗，列出最近打开的接口/函数（最多 30 条，localStorage 持久化）
// - 存储格式与官方一致：[[_type, id], ...]；显示信息每次打开弹窗时从资源树实时解析
// - 已删除的资源自动从列表清理；点击条目 → 切换到对应模式并打开详情
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { linlanApi } from '@/api/linlanApi'
import type { LinlanApiEntity } from '@/api/linlanApi'
import bus from '@/scripts/bus'
import store from '@/scripts/store'
import contants from '@/scripts/contants'
import Key from '@/scripts/hotkey'
import LinlanDialog from '@/components/common/modal/linlan-dialog.vue'
import LinlanTextIcon from '@/components/common/linlan-text-icon.vue'

const openApi = inject<(e: LinlanApiEntity) => void>('ll-api-open')!

interface RecentItem {
  _type: 'api' | 'function'
  id: string
  name?: string
  path?: string
  method?: string
  groupName: string
  groupPath: string
}

interface TreeBranch {
  node: Record<string, unknown>
  children?: TreeBranch[]
}

// 存储条目元组：[资源类型, id]
type RecentEntry = ['api' | 'function', string]

const visible = ref(false)
// 记录条目：[资源类型, id]，与官方存储格式一致，MRU 在前
const scripts = ref<RecentEntry[]>([])
// 弹窗打开时拉取的资源树快照：解析显示信息 + 清理已删资源
const treeSnapshot = ref<Record<string, TreeBranch> | null>(null)
const loading = ref(false)

// 递归在分支内按 id 查找节点，同时累积分组名称链 / 分组路径链（对齐官方 tmpName/tmpPath）
function findIn(
  nodes: TreeBranch[] | undefined,
  id: string,
  groupName: string,
  groupPath: string,
  type: 'api' | 'function'
): RecentItem | null {
  for (const c of nodes ?? []) {
    const n = c.node as Record<string, any>
    if (n.id === id) {
      return {
        _type: type,
        id,
        name: n.name,
        path: n.path,
        method: n.method,
        groupName,
        groupPath
      }
    }
    const nextName = (groupName ? groupName + '/' : '') + (n.name || '')
    const nextPath = (groupPath ? groupPath + '/' : '') + (n.path || '')
    const hit = findIn(c.children, id, nextName, nextPath, type)
    if (hit) return hit
  }
  return null
}

const fullItems = computed<RecentItem[]>(() => {
  const snap = treeSnapshot.value
  if (!snap) return []
  const out: RecentItem[] = []
  for (const [type, id] of scripts.value) {
    const branch = type === 'api' ? snap.api : snap.function
    const item = findIn(branch?.children, id, '', '', type)
    if (item) out.push(item)
  }
  return out
})

// 官方 displayText：合并连续斜杠
function displayName(str: string): string {
  return (str || '').replace(/\/+/g, '/')
}

async function show(): Promise<void> {
  const str = store.get(contants.RECENT_OPENED)
  if (str) {
    try {
      scripts.value = JSON.parse(str) as RecentEntry[]
    } catch {
      scripts.value = []
    }
  }
  visible.value = true
  loading.value = true
  try {
    treeSnapshot.value = (await linlanApi.fetchTree()) as unknown as Record<string, TreeBranch>
    // 官方行为：树中已不存在的资源从最近列表清理
    const alive = fullItems.value
    if (alive.length !== scripts.value.length) {
      scripts.value = alive.map((it) => [it._type, it.id] as RecentEntry)
      store.set(contants.RECENT_OPENED, scripts.value)
    }
  } catch {
    treeSnapshot.value = null
  } finally {
    loading.value = false
  }
}

// 打开条目：切到对应模式（position 事件会驱动 toolbar/editorMode）并加载详情
async function open(item: RecentItem): Promise<void> {
  visible.value = false
  if (item._type === 'api') bus.$emit('position-api', item.id)
  else bus.$emit('position-function', item.id)
  try {
    const entity = (await linlanApi.fetchApi(item.id)) as LinlanApiEntity
    openApi(entity)
  } catch (e) {
    console.error('[ll-editor] 最近打开失败:', e)
  }
}

// LLEditor.openApi 内发出：{_type, id}，仅记录已保存资源
function onRecorded(payload: { _type: 'api' | 'function'; id: string }): void {
  if (!payload?.id) return
  const idx = scripts.value.findIndex((it) => it[1] === payload.id)
  if (idx > -1) scripts.value.splice(idx, 1)
  scripts.value.unshift([payload._type, payload.id] as RecentEntry)
  if (scripts.value.length > 30) {
    scripts.value.splice(30, scripts.value.length)
  }
  store.set(contants.RECENT_OPENED, scripts.value)
}

onMounted(() => {
  bus.$on('ll-recent-record', onRecorded)
  // 官方：快捷键绑定在 .ll-container 上
  const el = document.getElementsByClassName('ll-container')[0]
  if (el) Key.bind(el, Key.Ctrl | Key.E, () => void show())
})
onBeforeUnmount(() => {
  bus.$off('ll-recent-record', onRecorded)
})
</script>

<template>
  <linlan-dialog
    :value="visible"
    title="最近打开"
    align="right"
    :moveable="false"
    width="340px"
    height="420px"
    padding="0"
    @onClose="visible = false"
  >
    <template #content>
      <div class="ll-recent-list">
        <div
          v-for="it in fullItems"
          :key="it._type + '_' + it.id"
          class="ll-recent-item"
          @click="open(it)"
        >
          <linlan-text-icon v-if="it._type === 'api'" :value="it.method || 'GET'" />
          <linlan-text-icon v-else value="function" />
          <label>{{ displayName(it.groupName + '/' + (it.name || '')) }}({{
            displayName(it.groupPath + '/' + (it.path || ''))
          }})</label>
        </div>
        <div v-if="!fullItems.length && !loading" class="ll-recent-empty">
          最近没有打开过的接口或函数
        </div>
      </div>
    </template>
  </linlan-dialog>
</template>

<style scoped>
.ll-recent-list {
  height: 380px;
  overflow: auto;
}

.ll-recent-item {
  white-space: nowrap;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 5px;
}

.ll-recent-item label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.ll-recent-empty {
  line-height: 380px;
  text-align: center;
  color: var(--color);
}
</style>
