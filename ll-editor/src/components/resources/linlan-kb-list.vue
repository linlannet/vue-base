<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { Ref } from 'vue'
import type { I18n } from '@/i18n'
import type { KBFile, KnowledgeBase } from '@/core/types'

const i18n = inject<I18n>('ll-i18n')!
const state = inject<{
  knowledgeBases: KnowledgeBase[]
  selectedKbId: string
  selectedFileId: string
  openDocs: { id: string; name: string }[]
  activeId: string
}>('ll-state')!
// 展开状态由父组件提供，便于外部代码（新建 KB 等）控制展开
const expandedKbIds = inject<Ref<Set<string>>>('ll-kb-expand', ref(new Set()))

const emit = defineEmits<{
  (e: 'create-kb'): void
  (e: 'rename-kb', kbId: string, currentName: string): void
  (e: 'delete-kb', kbId: string): void
  (e: 'add-file', kbId: string): void
  (e: 'add-resource', kbId: string): void
  (e: 'delete-file', kbId: string, fileId: string): void
}>()

const search = ref('')

const filteredKbs = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return state.knowledgeBases
  return state.knowledgeBases.filter((kb) => {
    if (kb.name.toLowerCase().includes(q)) return true
    if (kb.files.some((f) => f.name.toLowerCase().includes(q))) return true
    return false
  })
})

function fileIcon(f: KBFile): string {
  return (f as KBFile & { group?: string }).group === 'resource' ? '🔗' : '📄'
}

function selectKb(kbId: string): void {
  state.selectedKbId = kbId
  const kb = state.knowledgeBases.find((k) => k.id === kbId)
  const first = kb?.files[0]
  if (first) selectFile(kbId, first.id)
}
function selectFile(kbId: string, fileId: string): void {
  state.selectedKbId = kbId
  state.selectedFileId = fileId
  state.activeId = fileId
  const kb = state.knowledgeBases.find((k) => k.id === kbId)
  const file = kb?.files.find((f) => f.id === fileId)
  if (file && !state.openDocs.find((o) => o.id === fileId)) {
    state.openDocs.push({ id: file.id, name: file.name })
  }
  expandedKbIds.value.add(kbId)
}
function isKbOpen(kbId: string): boolean {
  return expandedKbIds.value.has(kbId)
}
function toggleKb(kbId: string): void {
  if (expandedKbIds.value.has(kbId)) expandedKbIds.value.delete(kbId)
  else expandedKbIds.value.add(kbId)
}
</script>

<template>
  <div class="ll-sidebar">
    <div class="ll-sidebar-head">
      <span>{{ i18n.t('knowledge.title') }}</span>
      <span class="ll-sidebar-actions">
        <button class="ll-mini" :title="i18n.t('knowledge.create')" @click="emit('create-kb')">＋</button>
      </span>
    </div>

    <div class="ll-sidebar-search">
      <input v-model="search" :placeholder="i18n.t('knowledge.search')" type="text" />
    </div>

    <div v-if="!filteredKbs.length" class="ll-kb-empty">{{ i18n.t('knowledge.empty') }}</div>

    <div v-for="kb in filteredKbs" :key="kb.id" class="ll-kb">
      <div class="ll-kb-row" :class="{ open: isKbOpen(kb.id) }">
        <span class="ll-kb-caret" @click="toggleKb(kb.id)">{{ isKbOpen(kb.id) ? '▾' : '▸' }}</span>
        <div class="ll-kb-name" :class="{ active: state.selectedKbId === kb.id }" @click="selectKb(kb.id)">
          <span class="ll-kb-icon">📚</span>
          <span class="ll-kb-name-text">{{ kb.name }}</span>
          <span class="ll-kb-store" :class="kb.storage">{{
            kb.storage === 'file' ? i18n.t('knowledge.storageFile') : i18n.t('knowledge.storageDb')
          }}</span>
        </div>
        <div class="ll-kb-actions">
          <button class="ll-mini" :title="i18n.t('knowledge.addFile')" @click="emit('add-file', kb.id)">＋</button>
          <button class="ll-mini" :title="i18n.t('knowledge.rename')" @click="emit('rename-kb', kb.id, kb.name)">✎</button>
          <button class="ll-mini danger" :title="i18n.t('knowledge.delete')" @click="emit('delete-kb', kb.id)">✕</button>
        </div>
      </div>

      <div v-show="isKbOpen(kb.id)" class="ll-kb-body">
        <div v-if="!kb.files.length" class="ll-kb-empty-row">—</div>
        <div
          v-for="f in kb.files"
          :key="f.id"
          class="ll-file"
          :class="{ active: state.selectedFileId === f.id && state.selectedKbId === kb.id }"
          @click="selectFile(kb.id, f.id)"
        >
          <span class="ll-file-icon">{{ fileIcon(f) }}</span>
          <span class="ll-file-name">{{ f.name }}</span>
          <button class="ll-mini danger ll-mini-fade" @click.stop="emit('delete-file', kb.id, f.id)">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>