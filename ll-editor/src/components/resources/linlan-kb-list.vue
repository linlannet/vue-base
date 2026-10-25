<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { Ref } from 'vue'
import type { I18n } from '@/i18n'
import type { KBFile, KBFolder, KnowledgeBase } from '@/core/types'
import { KB_UPLOAD_ACCEPT } from '@/components/editor/kbFiles'

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
  (e: 'add-file', kbId: string, parentId: string | null): void
  (e: 'add-resource', kbId: string): void
  (e: 'create-folder', kbId: string, parentId: string | null): void
  (e: 'rename-folder', kbId: string, folderId: string, currentName: string): void
  (e: 'delete-folder', kbId: string, folderId: string): void
  (e: 'move-file', kbId: string, fileId: string, folderId: string | null): void
  (e: 'rename-file', kbId: string, fileId: string, currentName: string): void
  (e: 'upload-files', kbId: string, files: FileList, parentId: string | null): void
  (e: 'delete-file', kbId: string, fileId: string): void
  (e: 'export-zip'): void
  (e: 'import-zip', file: File): void
}>()

interface TreeRow {
  type: 'folder' | 'file'
  id: string
  name: string
  depth: number
  kbId: string
  folder?: KBFolder
  file?: KBFile
  snippet?: string
}

const search = ref('')
const openFolders = ref<Set<string>>(new Set())
const uploadInput = ref<HTMLInputElement | null>(null)
const zipInput = ref<HTMLInputElement | null>(null)
const uploadKbId = ref('')
const uploadParentId = ref<string | null>(null)
const dragTarget = ref<string | null>(null)
let dragFile: { kbId: string; fileId: string } | null = null

const q = computed(() => search.value.trim().toLowerCase())

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

/** 搜索命中高亮（先按原文切分再转义，避免特殊字符被当成 HTML） */
function highlight(text: string, query: string): string {
  if (!query) return escapeHtml(text)
  const lower = text.toLowerCase()
  const parts: string[] = []
  let i = 0
  while (i <= text.length) {
    const idx = lower.indexOf(query, i)
    if (idx < 0) {
      parts.push(escapeHtml(text.slice(i)))
      break
    }
    parts.push(escapeHtml(text.slice(i, idx)))
    parts.push('<mark>', escapeHtml(text.slice(idx, idx + query.length)), '</mark>')
    i = idx + query.length
  }
  return parts.join('')
}

function foldersIn(kb: KnowledgeBase, parentId: string | null): KBFolder[] {
  return (kb.folders ?? []).filter((f) => (f.parentId ?? null) === parentId)
}

function filesIn(kb: KnowledgeBase, parentId: string | null): KBFile[] {
  return kb.files.filter((f) => (f.parentId ?? null) === parentId)
}

/** markdown 内容以 HTML 存储，搜索/摘要需先转成纯文本，避免匹配到标签 */
function plainContent(file: KBFile): string {
  const content = file.content ?? ''
  if (file.kind !== 'md') return content
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function fileHit(kbSelf: boolean, file: KBFile): boolean {
  if (!q.value || kbSelf) return true
  return (
    file.name.toLowerCase().includes(q.value) ||
    plainContent(file).toLowerCase().includes(q.value)
  )
}

/** 内容命中的片段（带高亮），仅在搜索时展示 */
function contentSnippet(file: KBFile, kbSelf: boolean): string {
  if (!q.value || kbSelf) return ''
  const content = plainContent(file)
  if (file.name.toLowerCase().includes(q.value)) return ''
  const idx = content.toLowerCase().indexOf(q.value)
  if (idx < 0) return ''
  const start = Math.max(0, idx - 18)
  const end = Math.min(content.length, idx + q.value.length + 34)
  const raw =
    (start > 0 ? '…' : '') +
    content.slice(start, end).replace(/\s+/g, ' ') +
    (end < content.length ? '…' : '')
  return highlight(raw, q.value)
}

function isKbOpen(kbId: string): boolean {
  return expandedKbIds.value.has(kbId)
}
function toggleKb(kbId: string): void {
  if (expandedKbIds.value.has(kbId)) expandedKbIds.value.delete(kbId)
  else expandedKbIds.value.add(kbId)
}
function isFolderOpen(folderId: string): boolean {
  return !!q.value || openFolders.value.has(folderId)
}
function toggleFolder(folderId: string): void {
  if (openFolders.value.has(folderId)) openFolders.value.delete(folderId)
  else openFolders.value.add(folderId)
}

/** 展开为可见行：搜索时只保留命中节点及其祖先路径，并自动展开 */
function rowsOf(kb: KnowledgeBase): TreeRow[] {
  const query = q.value
  const kbSelf = !!query && kb.name.toLowerCase().includes(query)
  const folderNameHit = (folder: KBFolder): boolean =>
    !query || kbSelf || folder.name.toLowerCase().includes(query)

  const hitCache = new Map<string, boolean>()
  function folderHasHit(folderId: string): boolean {
    if (hitCache.has(folderId)) return hitCache.get(folderId)!
    const hit =
      filesIn(kb, folderId).some((f) => fileHit(kbSelf, f)) ||
      foldersIn(kb, folderId).some((d) => folderNameHit(d) || folderHasHit(d.id))
    hitCache.set(folderId, hit)
    return hit
  }
  const folderVisible = (folder: KBFolder): boolean =>
    !query || kbSelf || folderNameHit(folder) || folderHasHit(folder.id)

  const rows: TreeRow[] = []
  function walk(parentId: string | null, depth: number): void {
    for (const folder of foldersIn(kb, parentId)) {
      if (!folderVisible(folder)) continue
      rows.push({
        type: 'folder',
        id: folder.id,
        name: folder.name,
        depth,
        kbId: kb.id,
        folder
      })
      if (isFolderOpen(folder.id)) walk(folder.id, depth + 1)
    }
    for (const file of filesIn(kb, parentId)) {
      if (!fileHit(kbSelf, file)) continue
      rows.push({
        type: 'file',
        id: file.id,
        name: file.name,
        depth,
        kbId: kb.id,
        file,
        snippet: contentSnippet(file, kbSelf)
      })
    }
  }
  walk(null, 0)
  return rows
}

/** KB 是否显示：名称、文件夹名、文件名或文件内容任一命中 */
function kbVisible(kb: KnowledgeBase): boolean {
  const query = q.value
  if (!query) return true
  if (kb.name.toLowerCase().includes(query)) return true
  if ((kb.folders ?? []).some((f) => f.name.toLowerCase().includes(query))) return true
  return kb.files.some(
    (f) => f.name.toLowerCase().includes(query) || plainContent(f).toLowerCase().includes(query)
  )
}

const visibleKbs = computed(() => state.knowledgeBases.filter(kbVisible))

function fileIcon(f: KBFile): string {
  if ((f as KBFile & { group?: string }).group === 'resource') return 'll-icon-push'
  if (f.kind === 'code') return 'll-icon-script'
  return 'll-icon-file-text'
}

function selectKb(kbId: string): void {
  state.selectedKbId = kbId
  const kb = state.knowledgeBases.find((k) => k.id === kbId)
  const first = kb?.files[0]
  if (first) selectFile(kbId, first.id)
  else expandedKbIds.value.add(kbId)
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

/** 选择上传文件时记录目标知识库/文件夹，change 事件里再统一派发给父组件 */
function pickUpload(kbId: string, parentId: string | null = null): void {
  uploadKbId.value = kbId
  uploadParentId.value = parentId
  uploadInput.value?.click()
}
function onUploadChange(e: Event): void {
  const input = e.target as HTMLInputElement
  if (input.files?.length) emit('upload-files', uploadKbId.value, input.files, uploadParentId.value)
  input.value = ''
}
function onZipChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('import-zip', file)
  input.value = ''
}

// ===== 拖拽移动文件 =====
function onDragStart(kbId: string, fileId: string): void {
  dragFile = { kbId, fileId }
}
function onDragEnd(): void {
  dragFile = null
  dragTarget.value = null
}
function onDragOver(targetId: string): void {
  dragTarget.value = targetId
}
function onDrop(kbId: string, folderId: string | null, e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  const fileId = e.dataTransfer?.getData('text/plain') || dragFile?.fileId
  const sourceKb = dragFile?.kbId ?? kbId
  if (fileId && sourceKb === kbId) emit('move-file', kbId, fileId, folderId)
  dragTarget.value = null
  dragFile = null
}
function rootTargetId(kbId: string): string {
  return `${kbId}::root`
}
</script>

<template>
  <div class="ll-sidebar">
    <div class="ll-sidebar-head">
      <span>{{ i18n.t('knowledge.title') }}</span>
      <span class="ll-sidebar-actions">
        <button class="ll-mini" :title="i18n.t('knowledge.create')" @click="emit('create-kb')">
          <i class="ll-icon ll-icon-plus"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('knowledge.importZip')" @click="zipInput?.click()">
          <i class="ll-icon ll-icon-upload"></i>
        </button>
        <button class="ll-mini" :title="i18n.t('knowledge.exportZip')" @click="emit('export-zip')">
          <i class="ll-icon ll-icon-save"></i>
        </button>
      </span>
    </div>

    <div class="ll-sidebar-search">
      <i class="ll-icon ll-icon-search"></i>
      <input v-model="search" :placeholder="i18n.t('knowledge.search')" type="text" />
    </div>

    <div v-if="!visibleKbs.length" class="ll-kb-empty">
      {{ q ? i18n.t('knowledge.noMatch') : i18n.t('knowledge.empty') }}
    </div>

    <div v-for="kb in visibleKbs" :key="kb.id" class="ll-kb">
      <div class="ll-kb-row" :class="{ open: isKbOpen(kb.id) }">
        <span class="ll-kb-caret" @click="toggleKb(kb.id)">{{ isKbOpen(kb.id) ? '▾' : '▸' }}</span>
        <div class="ll-kb-name" :class="{ active: state.selectedKbId === kb.id }" @click="selectKb(kb.id)">
          <i class="ll-icon ll-icon-list ll-kb-icon"></i>
          <span class="ll-kb-name-text" v-html="highlight(kb.name, q)"></span>
          <span class="ll-kb-count">{{ kb.files.length }}</span>
        </div>
        <div class="ll-kb-actions">
          <button
            class="ll-mini"
            :title="i18n.t('knowledge.addFile')"
            @click.stop="emit('add-file', kb.id, null)"
          >
            <i class="ll-icon ll-icon-plus"></i>
          </button>
          <button
            class="ll-mini"
            :title="i18n.t('knowledge.newFolder')"
            @click.stop="emit('create-folder', kb.id, null)"
          >
            <i class="ll-icon ll-icon-group-add"></i>
          </button>
          <button class="ll-mini" :title="i18n.t('knowledge.upload')" @click.stop="pickUpload(kb.id)">
            <i class="ll-icon ll-icon-upload"></i>
          </button>
          <button class="ll-mini" :title="i18n.t('knowledge.rename')" @click.stop="emit('rename-kb', kb.id, kb.name)">
            <i class="ll-icon ll-icon-format"></i>
          </button>
          <button class="ll-mini danger" :title="i18n.t('knowledge.delete')" @click.stop="emit('delete-kb', kb.id)">
            <i class="ll-icon ll-icon-delete"></i>
          </button>
        </div>
      </div>

      <div
        v-show="isKbOpen(kb.id)"
        class="ll-kb-body"
        :class="{ 'drop-root': dragTarget === rootTargetId(kb.id) }"
        @dragover.prevent="onDragOver(rootTargetId(kb.id))"
        @dragleave="dragTarget === rootTargetId(kb.id) && (dragTarget = null)"
        @drop="onDrop(kb.id, null, $event)"
      >
        <div v-if="!rowsOf(kb).length" class="ll-kb-empty-row">
          {{ q ? i18n.t('knowledge.noMatch') : i18n.t('knowledge.emptyFiles') }}
        </div>
        <template v-for="row in rowsOf(kb)" :key="row.id">
          <div
            v-if="row.type === 'folder'"
            class="ll-tree-folder"
            :class="{ 'drop-target': dragTarget === row.id }"
            :style="{ paddingLeft: 26 + row.depth * 12 + 'px' }"
            @click="toggleFolder(row.id)"
            @dragover.prevent.stop="onDragOver(row.id)"
            @dragleave.stop="dragTarget === row.id && (dragTarget = null)"
            @drop="onDrop(kb.id, row.id, $event)"
          >
            <span class="ll-folder-caret">{{ isFolderOpen(row.id) ? '▾' : '▸' }}</span>
            <i class="ll-icon ll-icon-list ll-file-icon"></i>
            <span class="ll-folder-name" v-html="highlight(row.name, q)"></span>
            <span class="ll-folder-actions">
              <button
                class="ll-mini"
                :title="i18n.t('knowledge.addFile')"
                @click.stop="emit('add-file', kb.id, row.id)"
              >
                <i class="ll-icon ll-icon-plus"></i>
              </button>
              <button
                class="ll-mini"
                :title="i18n.t('knowledge.newFolder')"
                @click.stop="emit('create-folder', kb.id, row.id)"
              >
                <i class="ll-icon ll-icon-group-add"></i>
              </button>
              <button
                class="ll-mini"
                :title="i18n.t('knowledge.rename')"
                @click.stop="emit('rename-folder', kb.id, row.id, row.name)"
              >
                <i class="ll-icon ll-icon-format"></i>
              </button>
              <button
                class="ll-mini danger"
                :title="i18n.t('knowledge.delete')"
                @click.stop="emit('delete-folder', kb.id, row.id)"
              >
                <i class="ll-icon ll-icon-delete"></i>
              </button>
            </span>
          </div>
          <div
            v-else
            class="ll-file"
            :class="{ active: state.selectedFileId === row.id && state.selectedKbId === kb.id }"
            :style="{ paddingLeft: 26 + row.depth * 12 + 'px' }"
            draggable="true"
            @dragstart="onDragStart(kb.id, row.id)"
            @dragend="onDragEnd"
            @click="selectFile(kb.id, row.id)"
          >
            <i class="ll-icon ll-file-icon" :class="fileIcon(row.file!)"></i>
            <span class="ll-file-text">
              <span class="ll-file-name" v-html="highlight(row.name, q)"></span>
              <span v-if="row.snippet" class="ll-file-snippet" v-html="row.snippet"></span>
            </span>
            <button
              class="ll-icon-btn ll-mini-fade"
              :title="i18n.t('knowledge.rename')"
              @click.stop="emit('rename-file', kb.id, row.id, row.name)"
            >
              <i class="ll-icon ll-icon-format"></i>
            </button>
            <button
              class="ll-icon-btn ll-mini-fade danger"
              :title="i18n.t('knowledge.delete')"
              @click.stop="emit('delete-file', kb.id, row.id)"
            >
              <i class="ll-icon ll-icon-delete"></i>
            </button>
          </div>
        </template>
      </div>
    </div>

    <input
      ref="uploadInput"
      class="ll-upload-input"
      type="file"
      multiple
      :accept="KB_UPLOAD_ACCEPT"
      @change="onUploadChange"
    />
    <input
      ref="zipInput"
      class="ll-upload-input"
      type="file"
      accept=".zip"
      @change="onZipChange"
    />
  </div>
</template>
