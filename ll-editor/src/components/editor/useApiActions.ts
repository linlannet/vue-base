/**
 * 接口动作（自 LLEditor.vue 抽离）：
 * 运行（含运行前自动保存）、保存、调试继续/单步。
 * 运行状态写入 linlanRun 的模块级共享 refs（apiTab/runLogs），
 * 与底部面板（linlan-options → 运行日志）联动。
 */
import type { Ref } from 'vue'
import { linlanApi } from '@/api/linlanApi'
import type { LinlanApiEntity } from '@/api/linlanApi'
import { runApi, apiTab, runLogs } from '@/api/linlanRun'

export interface ApiActionsDeps {
  /** 当前打开的接口实体（ll-api） */
  currentApi: Ref<LinlanApiEntity | null>
  /** linlan-script-editor 实例（取脚本内容与调试动作） */
  scriptRef: Ref<any>
}

export function useApiActions(deps: ApiActionsDeps) {
  async function onRun(): Promise<void> {
    const api = deps.currentApi.value
    if (!api) {
      console.log('[ll-editor] 当前无接口，无法运行')
      return
    }
    const script = deps.scriptRef.value?.getContent?.() ?? api.script ?? ''
    const entity: LinlanApiEntity = { ...api, script }
    try {
      // 运行前自动保存，确保执行的是最新脚本
      if (entity.groupId) {
        await linlanApi.saveApi(entity.groupId, entity, '1')
      } else {
        runLogs.value.push({ id: Date.now(), ts: Date.now(), level: 'error', text: '请先将接口保存到分组后再运行' })
        apiTab.value = 'logs'
        return
      }
      await runApi(entity)
      apiTab.value = 'logs'
    } catch (e) {
      runLogs.value.push({ id: Date.now(), ts: Date.now(), level: 'error', text: '运行失败: ' + (e as Error).message })
      apiTab.value = 'logs'
    }
  }

  async function onSave(): Promise<void> {
    const api = deps.currentApi.value
    if (!api) {
      deps.scriptRef.value?.save()
      return
    }
    const content = deps.scriptRef.value?.getContent?.() ?? ''
    try {
      await linlanApi.saveApi(api.groupId || '', { ...api, script: content }, api.id ? '0' : '1')
      console.info('[ll-editor] 接口已保存', api.name)
    } catch (e) {
      console.error('[ll-editor] 保存失败:', e)
    }
  }

  function onContinue(): void {
    deps.scriptRef.value?.continueDbg()
  }

  function onStep(): void {
    deps.scriptRef.value?.stepDbg()
  }

  return { onRun, onSave, onContinue, onStep }
}
