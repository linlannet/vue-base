/**
 * 知识库工作区（自 LLEditor.vue 抽离）：
 * 左侧知识库/文件树的增删改查，交互统一走 modal 组件
 * （modal.linlanPrompt 替代 window.prompt，modal.linlanConfirm 替代 window.confirm）。
 */
import type { Ref } from 'vue'
import type { I18n } from '@/i18n'
import type { KBFile, KnowledgeBase } from '@/core/types'
import { modal } from '@/components/common/modal/index'

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
    if (kb) {
      kb.name = name
      // 同步已打开 tab 的显示名
      state.openDocs.forEach((d) => {
        if (d.id === kbId) d.name = name
      })
    }
  }

  function onDeleteKb(kbId: string): void {
    modal.linlanConfirm(i18n.t('knowledge.confirmDeleteKb'), {
      confirm: () => {
        const idx = state.knowledgeBases.findIndex((k) => k.id === kbId)
        if (idx < 0) return
        state.knowledgeBases.splice(idx, 1)
        if (state.selectedKbId === kbId) {
          const next = state.knowledgeBases[0]
          state.selectedKbId = next?.id ?? ''
          state.selectedFileId = next?.files[0]?.id ?? ''
        }
      }
    })
  }

  async function onAddFile(kbId: string): Promise<void> {
    const kb = state.knowledgeBases.find((k) => k.id === kbId)
    if (!kb) return
    const name = await modal.linlanPrompt(
      i18n.t('knowledge.fileNamePrompt'),
      `file-${kb.files.length + 1}.md`
    )
    if (!name) return
    const language = name.endsWith('.py') ? 'python' : name.endsWith('.js') ? 'javascript' : name.endsWith('.json') ? 'json' : 'markdown'
    const kind: KBFile['kind'] = language === 'markdown' ? 'md' : language === 'python' || language === 'javascript' ? 'code' : 'text'
    const file: KBFile = { id: genId('f'), name, language, kind, content: '' }
    kb.files.push(file)
    state.selectedKbId = kbId
    state.selectedFileId = file.id
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
    state.selectedKbId = kbId
    state.selectedFileId = file.id
  }

  function onDeleteFile(kbId: string, fileId: string): void {
    modal.linlanConfirm(i18n.t('knowledge.confirmDeleteFile'), {
      confirm: () => {
        const kb = state.knowledgeBases.find((k) => k.id === kbId)
        if (!kb) return
        const idx = kb.files.findIndex((f) => f.id === fileId)
        if (idx >= 0) kb.files.splice(idx, 1)
        if (state.selectedFileId === fileId) {
          state.selectedFileId = kb.files[0]?.id ?? ''
        }
      }
    })
  }

  return { onCreateKb, onRenameKb, onDeleteKb, onAddFile, onAddResource, onDeleteFile }
}
