/**
 * 知识库工作区：
 * 左侧知识库/文件树的增删改查、文件上传与重命名，交互统一走 modal 组件
 * （modal.linlanPrompt 替代 window.prompt，modal.linlanConfirm 替代 window.confirm）。
 * 数据变更后由 useKbPersistence 自动写入 localStorage。
 */
import type { Ref } from 'vue'
import type { I18n } from '@/i18n'
import type { KBFile, KBFileKind, KBFolder, KnowledgeBase } from '@/core/types'
import { modal } from '@/components/common/modal/index'
import { MAX_IMPORT_SIZE, resolveFileMeta } from './kbFiles'
import { buildKbZip, parseKbZip } from './kbZip'

export interface KbWorkspaceState {
  knowledgeBases: KnowledgeBase[]
  selectedKbId: string
  selectedFileId: string
  openDocs: { id: string; name: string }[]
  activeId: string
}


export function useKbWorkspace(
  state: KbWorkspaceState,
  kbListExpand: Ref<Set<string>>,
  i18n: I18n
) {
  function genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  }

  /** 在左侧选中文件，并确保该文件在标签栏中打开 */
  function openFile(kbId: string, file: KBFile): void {
    state.selectedKbId = kbId
    state.selectedFileId = file.id
    state.activeId = file.id
    if (!state.openDocs.find((d) => d.id === file.id)) {
      state.openDocs.push({ id: file.id, name: file.name })
    }
    kbListExpand.value.add(kbId)
  }

  /** 同名文件自动追加序号，避免覆盖已有条目 */
  function uniqueName(kb: KnowledgeBase, name: string): string {
    if (!kb.files.some((f) => f.name === name)) return name
    const idx = name.lastIndexOf('.')
    const base = idx > 0 ? name.slice(0, idx) : name
    const ext = idx > 0 ? name.slice(idx) : ''
    let n = 1
    let next = `${base}(${n})${ext}`
    while (kb.files.some((f) => f.name === next)) {
      n += 1
      next = `${base}(${n})${ext}`
    }
    return next
  }

  async function onCreateKb(): Promise<void> {
    const name = await modal.linlanPrompt(
      i18n.t('knowledge.kbNamePrompt'),
      `KB-${state.knowledgeBases.length + 1}`
    )
    if (!name) return
    const kb: KnowledgeBase = { id: genId('kb'), name, storage: 'file', files: [] }
    state.knowledgeBases.push(kb)
    state.selectedKbId = kb.id
    state.selectedFileId = ''
    // 通知子组件展开的 KB（kb-list 是独立组件，通过 provide 共享展开状态）
    kbListExpand.value.add(kb.id)
  }

  async function onRenameKb(kbId: string, currentName: string): Promise<void> {
    const name = await modal.linlanPrompt(i18n.t('knowledge.kbNamePrompt'), currentName)
    if (!name || name === currentName) return
    const kb = state.knowledgeBases.find((k) => k.id === kbId)
    if (kb) kb.name = name
  }

  function onDeleteKb(kbId: string): void {
    modal.linlanConfirm(i18n.t('knowledge.confirmDeleteKb'), {
      confirm: () => {
        const idx = state.knowledgeBases.findIndex((k) => k.id === kbId)
        if (idx < 0) return
        const [removed] = state.knowledgeBases.splice(idx, 1)
        // 关闭该知识库下已打开的标签
        const fileIds = new Set((removed?.files ?? []).map((f) => f.id))
        state.openDocs = state.openDocs.filter((d) => !fileIds.has(d.id))
        if (!state.openDocs.find((d) => d.id === state.activeId)) {
          state.activeId = state.openDocs[0]?.id ?? ''
        }
        if (state.selectedKbId === kbId) {
          const next = state.knowledgeBases[0]
          state.selectedKbId = next?.id ?? ''
          state.selectedFileId = next?.files[0]?.id ?? ''
        }
      }
    })
  }

  async function onAddFile(kbId: string, parentId: string | null = null): Promise<void> {
    const kb = state.knowledgeBases.find((k) => k.id === kbId)
    if (!kb) return
    const name = await modal.linlanPrompt(
      i18n.t('knowledge.fileNamePrompt'),
      `file-${kb.files.length + 1}.md`
    )
    if (!name) return
    const meta = resolveFileMeta(name) ?? { language: 'markdown', kind: 'md' as KBFileKind }
    const file: KBFile = {
      id: genId('f'),
      name: uniqueName(kb, name),
      ...meta,
      content: '',
      parentId
    }
    kb.files.push(file)
    openFile(kbId, file)
  }

  /** 以给定内容直接向知识库新增文件（AI 对话成果落库），返回最终文件名 */
  function onCreateFileWithContent(kbId: string, name: string, content: string): string | null {
    const kb = state.knowledgeBases.find((k) => k.id === kbId)
    if (!kb) return null
    const meta = resolveFileMeta(name) ?? { language: 'markdown', kind: 'md' as KBFileKind }
    const file: KBFile = {
      id: genId('f'),
      name: uniqueName(kb, name || `file-${kb.files.length + 1}.md`),
      ...meta,
      content,
      parentId: null
    }
    kb.files.push(file)
    return file.name
  }

  /** 文件夹名在同级目录内去重 */
  function uniqueFolderName(kb: KnowledgeBase, name: string, parentId: string | null): string {
    const folders = kb.folders ?? []
    const sameLevel = folders.filter((f) => (f.parentId ?? null) === parentId)
    if (!sameLevel.some((f) => f.name === name)) return name
    let n = 1
    while (sameLevel.some((f) => f.name === `${name}(${n})`)) n += 1
    return `${name}(${n})`
  }

  async function onCreateFolder(kbId: string, parentId: string | null = null): Promise<void> {
    const kb = state.knowledgeBases.find((k) => k.id === kbId)
    if (!kb) return
    const name = await modal.linlanPrompt(
      i18n.t('knowledge.folderNamePrompt'),
      i18n.t('knowledge.newFolder')
    )
    if (!name) return
    if (!kb.folders) kb.folders = []
    const folder: KBFolder = {
      id: genId('d'),
      name: uniqueFolderName(kb, name, parentId),
      parentId
    }
    kb.folders.push(folder)
    kbListExpand.value.add(kbId)
  }

  async function onRenameFolder(
    kbId: string,
    folderId: string,
    currentName: string
  ): Promise<void> {
    const kb = state.knowledgeBases.find((k) => k.id === kbId)
    const folder = kb?.folders?.find((f) => f.id === folderId)
    if (!kb || !folder) return
    const name = await modal.linlanPrompt(i18n.t('knowledge.folderNamePrompt'), currentName)
    if (!name || name === currentName) return
    folder.name = uniqueFolderName(kb, name, folder.parentId ?? null)
  }

  /** 递归删除文件夹及其子文件夹、文件 */
  function onDeleteFolder(kbId: string, folderId: string): void {
    modal.linlanConfirm(i18n.t('knowledge.confirmDeleteFolder'), {
      confirm: () => {
        const kb = state.knowledgeBases.find((k) => k.id === kbId)
        if (!kb) return
        const folders = kb.folders ?? []
        const doomed = new Set<string>([folderId])
        let changed = true
        while (changed) {
          changed = false
          for (const f of folders) {
            if (!doomed.has(f.id) && f.parentId && doomed.has(f.parentId)) {
              doomed.add(f.id)
              changed = true
            }
          }
        }
        const removedFiles = kb.files.filter((f) => f.parentId && doomed.has(f.parentId))
        kb.files = kb.files.filter((f) => !(f.parentId && doomed.has(f.parentId)))
        kb.folders = folders.filter((f) => !doomed.has(f.id))
        const ids = new Set(removedFiles.map((f) => f.id))
        state.openDocs = state.openDocs.filter((d) => !ids.has(d.id))
        if (ids.has(state.selectedFileId)) {
          state.selectedFileId = kb.files[0]?.id ?? ''
          state.activeId = state.openDocs[0]?.id ?? ''
        }
      }
    })
  }

  /** 拖拽移动文件到目标文件夹（null = 根目录） */
  function onMoveFile(kbId: string, fileId: string, folderId: string | null): void {
    const kb = state.knowledgeBases.find((k) => k.id === kbId)
    const file = kb?.files.find((f) => f.id === fileId)
    if (!file) return
    if ((file.parentId ?? null) === folderId) return
    file.parentId = folderId
  }

  function download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /** 导出全部知识库为 zip */
  function onExportZip(): void {
    if (!state.knowledgeBases.length) return
    const blob = buildKbZip(state.knowledgeBases)
    const stamp = new Date().toISOString().slice(0, 10)
    download(blob, `knowledge-bases-${stamp}.zip`)
  }

  /** 导入 zip：顶层目录还原为知识库，散文件归入 zip 同名的知识库 */
  async function onImportZip(file: File): Promise<void> {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const imported = parseKbZip(bytes, file.name.replace(/\.zip$/i, ''))
      if (!imported.length) {
        modal.linlanAlert(i18n.t('knowledge.importZipEmpty'), {})
        return
      }
      let firstKb: KnowledgeBase | null = null
      for (const item of imported) {
        let name = item.name
        let n = 1
        while (state.knowledgeBases.some((k) => k.name === name)) {
          name = `${item.name}(${n})`
          n += 1
        }
        const kb: KnowledgeBase = {
          id: genId('kb'),
          name,
          storage: 'file',
          folders: item.folders,
          files: item.files
        }
        state.knowledgeBases.push(kb)
        kbListExpand.value.add(kb.id)
        if (!firstKb) firstKb = kb
      }
      if (firstKb) {
        state.selectedKbId = firstKb.id
        const first = firstKb.files[0]
        if (first) openFile(firstKb.id, first)
      }
    } catch (err) {
      console.error('[kb] import zip failed', err)
      modal.linlanAlert(i18n.t('knowledge.importZipFailed'), {})
    }
  }

  async function onAddResource(kbId: string): Promise<void> {
    const kb = state.knowledgeBases.find((k) => k.id === kbId)
    if (!kb) return
    const name = await modal.linlanPrompt(
      i18n.t('knowledge.resourceNamePrompt'),
      `resource-${kb.files.length + 1}`
    )
    if (!name) return
    const file: KBFile & { group: string; url: string } = {
      id: genId('r'),
      name,
      language: 'plaintext',
      kind: 'text',
      content: '',
      group: 'resource',
      url: ''
    }
    kb.files.push(file)
    openFile(kbId, file)
  }

  async function onRenameFile(kbId: string, fileId: string, currentName: string): Promise<void> {
    const kb = state.knowledgeBases.find((k) => k.id === kbId)
    const file = kb?.files.find((f) => f.id === fileId)
    if (!kb || !file) return
    const name = await modal.linlanPrompt(i18n.t('knowledge.fileRenamePrompt'), currentName)
    if (!name || name === currentName) return
    file.name = uniqueName(kb, name)
    // 后缀变化时同步语言/类别，便于编辑器按新类型处理
    const meta = resolveFileMeta(file.name)
    if (meta) {
      file.language = meta.language
      file.kind = meta.kind
    }
    const doc = state.openDocs.find((d) => d.id === fileId)
    if (doc) doc.name = file.name
  }

  /** 导入本地文本文件（超过 1MB 或二进制类型会跳过并提示） */
  async function onImportFiles(
    kbId: string,
    files: FileList | File[],
    parentId: string | null = null
  ): Promise<void> {
    const kb = state.knowledgeBases.find((k) => k.id === kbId)
    if (!kb) return
    const skipped: string[] = []
    let firstAdded: KBFile | null = null
    for (const f of Array.from(files)) {
      const meta = resolveFileMeta(f.name)
      if (!meta) {
        skipped.push(`${f.name}（${i18n.t('knowledge.uploadUnsupported')}）`)
        continue
      }
      if (f.size > MAX_IMPORT_SIZE) {
        skipped.push(`${f.name}（${i18n.t('knowledge.uploadTooLarge')}）`)
        continue
      }
      let content = ''
      try {
        content = await f.text()
      } catch {
        skipped.push(`${f.name}（${i18n.t('knowledge.uploadReadFailed')}）`)
        continue
      }
      const file: KBFile = {
        id: genId('f'),
        name: uniqueName(kb, f.name),
        ...meta,
        content,
        parentId
      }
      kb.files.push(file)
      if (!firstAdded) firstAdded = file
    }
    if (firstAdded) openFile(kbId, firstAdded)
    if (skipped.length) {
      modal.linlanAlert(`${i18n.t('knowledge.uploadSkipped')}：${skipped.join('、')}`, {})
    }
  }

  function onDeleteFile(kbId: string, fileId: string): void {
    modal.linlanConfirm(i18n.t('knowledge.confirmDeleteFile'), {
      confirm: () => {
        const kb = state.knowledgeBases.find((k) => k.id === kbId)
        if (!kb) return
        const idx = kb.files.findIndex((f) => f.id === fileId)
        if (idx >= 0) kb.files.splice(idx, 1)
        state.openDocs = state.openDocs.filter((d) => d.id !== fileId)
        if (state.selectedFileId === fileId) {
          const next = kb.files[0]
          state.selectedFileId = next?.id ?? ''
          state.activeId = next?.id ?? ''
        }
        if (state.activeId === fileId) {
          state.activeId = state.openDocs[0]?.id ?? ''
        }
      }
    })
  }

  return {
    onCreateKb,
    onRenameKb,
    onDeleteKb,
    onAddFile,
    onCreateFileWithContent,
    onAddResource,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    onMoveFile,
    onExportZip,
    onImportZip,
    onRenameFile,
    onImportFiles,
    onDeleteFile
  }
}
