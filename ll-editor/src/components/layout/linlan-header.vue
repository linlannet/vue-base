<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import * as monaco from 'monaco-editor'
import bus from '@/scripts/bus'
import store from '@/scripts/store'
import contants from '@/scripts/contants'
import { Themes } from '@/scripts/editor/theme'
import { modal } from '@/components/common/modal/index'
import request from '@/api/request'
import LinlanSearch from './linlan-search.vue'
import LinlanDialog from '@/components/common/modal/linlan-dialog.vue'
import LinlanInput from '@/components/common/linlan-input.vue'
import LinlanFile from '@/components/common/linlan-file.vue'
import LinlanResourceChoose from '@/components/resources/linlan-resource-choose.vue'
import type { I18n } from '@/i18n'
import type { LinlanApiEntity } from '@/api/linlanApi'

const props = defineProps<{
  mode: number
  path: string
  title?: string
  themeStyle: Record<string, string>
}>()
const emit = defineEmits<{
  (e: 'update:path', p: string): void
  (e: 'update:theme-style', style: Record<string, string>): void
  (e: 'run'): void
  (e: 'continue'): void
  (e: 'step'): void
  (e: 'save'): void
  (e: 'toggle-theme'): void
}>()
const i18n = inject<I18n>('ll-i18n')
const api = inject<Ref<LinlanApiEntity | null>>('ll-api')

const skinVisible = ref(false)
const searchRef = ref<InstanceType<typeof LinlanSearch> | null>(null)
const uploadFileRef = ref<InstanceType<typeof LinlanFile> | null>(null)
const resourceExportRef = ref<InstanceType<typeof LinlanResourceChoose> | null>(null)
const resourcePushRef = ref<InstanceType<typeof LinlanResourceChoose> | null>(null)
const showUploadDialog = ref(false)
const showPushDialog = ref(false)
const exportVisible = ref(false)
const pushTarget = ref('http://host:port/_magic-api-sync')
const pushSecretKey = ref('123456789')

const version = computed(() => contants.MAGIC_API_VERSION_TEXT || '(v?)')
const themeKeys = computed(() => Object.keys(Themes))
// 对齐 magic-header：groupName/name(groupPath/path)
// 仅接口模式（mode=1）显示当前打开的接口标题；函数/知识库模式回落到 path，
// 避免切到「函数」后顶部仍是接口的标题
const displayText = computed(() => {
  const info = api?.value as any
  if (props.mode === 1 && info && info.name) {
    const group = `${info.groupName ?? ''}/${info.name ?? ''}`
    const path = `${info.groupPath ?? ''}/${info.path ?? ''}`
    return `${group}(${path})`.replace(/\/+/g, '/')
  }
  return props.path || ''
})

// 换肤：清空并写入 CSS 变量（--xxx），同步 Monaco 主题
function switchTheme(name: string): void {
  Object.keys(props.themeStyle).forEach((key) => delete props.themeStyle[key])
  const theme = (Themes as Record<string, Record<string, string>>)[name] || {}
  Object.keys(theme).forEach((key) => {
    props.themeStyle[`--${key}`] = theme[key]
  })
  store.set('skin', name)
  monaco.editor.setTheme(name)
  emit('update:theme-style', props.themeStyle)
}

function onRun(): void {
  if (!api?.value && props.mode === 0) {
    ;(modal as any).linlanAlert(i18n ? i18n.t('toolbar.run') : '当前为知识库模式，无法运行接口')
    return
  }
  emit('run')
}

// ===== 历史记录：由 linlan-script-editor 监听 viewHistory 并加载 =====
function onHistory(): void {
  bus.$emit('viewHistory')
}

// ===== 上传接口（对齐 magic-header upload/doUpload） =====
function onUpload(): void {
  showUploadDialog.value = true
}
function doUpload(mode: 'increment' | 'full'): void {
  const file = (uploadFileRef.value as any)?.getFile?.()
  if (!file) return
  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('mode', mode)
  const _upload = () => {
    showUploadDialog.value = false
    bus.$emit('status', `准备${mode === 'full' ? '全量' : '增量'}上传`)
    request
      .send('/upload', formData, { method: 'post' })
      .success(() => {
        ;(modal as any).linlanAlert('上传成功!', { title: '上传接口' })
        bus.$emit('status', `${mode === 'full' ? '全量' : '增量'}上传成功`)
        bus.$emit('refresh-resource')
      })
  }
  if (mode === 'full') {
    ;(modal as any).linlanConfirm('全量模式上传时，以上传的数据为准进行覆盖更新操作，可能会删除其他接口<br>在非全量导出时，建议使用增量更新，是否继续？', {
      title: '上传接口',
      onOk: _upload
    })
  } else {
    _upload()
  }
}

// ===== 导出接口（对齐 magic-header download/doExport） =====
// 注意：fetch 版 request.send 的 code===1 判断不适用于 blob，须走 execute + responseType:'blob'
// 内联 download 实现（等价 scripts/utils 的 download，避免 @ts-nocheck 模块的命名导入问题）
function downloadFile(blob: Blob, filename: string): void {
  const element = document.createElement('a')
  element.href = window.URL.createObjectURL(blob)
  element.download = filename
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
  window.URL.revokeObjectURL(element.href)
}
function onDownload(): void {
  exportVisible.value = true
  ;(resourceExportRef.value as any)?.initData?.()
}
function doExport(): void {
  const selected = (resourceExportRef.value as any)?.getSelected?.() ?? []
  if (selected.length === 0) return
  bus.$emit('status', '准备导出全部数据')
  request
    .execute({
      url: '/download',
      method: 'post',
      data: JSON.stringify(selected),
      headers: { 'Content-Type': 'application/json' },
      responseType: 'blob'
    } as any)
    .then((res: any) => {
      res.data.then((blob: Blob) => {
        downloadFile(blob, 'magic-api.zip')
        bus.$emit('status', '全部数据已导出完毕')
      })
    })
}

// ===== 远程推送（对齐 magic-header remotePush/doPush） =====
function onPush(): void {
  showPushDialog.value = true
  ;(resourcePushRef.value as any)?.initData?.()
}
function doPush(mode: 'increment' | 'full'): void {
  // 防御：远程地址为空时 fetch 会发空值头（部分链路剥离空值头），
  // 后端 @RequestHeader(required) 将抛 MissingRequestHeaderException——发送前拦截
  if (!pushTarget.value || !pushTarget.value.trim()) {
    ;(modal as any).linlanAlert('请输入远程地址', { title: '远程推送' })
    return
  }
  const selected = mode === 'full' ? [] : ((resourcePushRef.value as any)?.getSelected?.() ?? [])
  const _push = () => {
    bus.$emit('status', `准备${mode === 'full' ? '全量' : '增量'}推送`)
    request
      .send('/push', JSON.stringify(selected), {
        method: 'post',
        headers: {
          'magic-push-target': pushTarget.value,
          'magic-push-secret-key': pushSecretKey.value,
          'magic-push-mode': mode,
          'Content-Type': 'application/json'
        }
      })
      .success(() => {
        ;(modal as any).linlanAlert('推送成功!')
        bus.$emit('status', `${mode === 'full' ? '全量' : '增量'}推送成功`)
        showPushDialog.value = false
      })
  }
  if (mode === 'full') {
    ;(modal as any).linlanConfirm('全量模式推送时，以本地数据为准全量覆盖更新,是否继续？', {
      title: '远程推送',
      onOk: _push
    })
  } else if (selected.length > 0) {
    _push()
  }
}

// ===== 重新加载所有数据（对齐 magic-header refresh） =====
function onRefresh(): void {
  bus.$emit('status', '准备刷新资源')
  request
    .send('refresh', null, { method: 'get' })
    .success(() => {
      bus.$emit('status', '刷新资源成功')
    })
    .exception(() => {
      // 8088 等后端版本无 /refresh 端点（404）：静默降级，仅前端重载资源树，
      // 避免弹「请求异常」遮罩窗（send() 存在 exception 回调时默认不弹窗）
      bus.$emit('status', '后端不支持热刷新，已重载本地资源')
    })
  // 无论后端是否支持，前端始终重载资源树，与官方 refresh 的用户预期一致
  bus.$emit('refresh-resource')
}

const closeSkin = () => (skinVisible.value = false)
onMounted(() => {
  document.addEventListener('click', closeSkin)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeSkin)
})
</script>

<template>
  <div class="ma-header">
    <div class="ma-logo">
      <label :title="title || 'LL-Editor'">{{ title || 'LL-Editor' }}</label>
      <label class="version" :title="version">{{ version }}</label>
    </div>
    <div :title="displayText">{{ displayText }}</div>
    <span title="运行（Ctrl+Q）" @click="onRun">
      <i class="ma-icon ma-icon-run"></i>
    </span>
    <span title="保存（Ctrl+S）" @click="emit('save')">
      <i class="ma-icon ma-icon-save"></i>
    </span>
    <span title="全局搜索" @click="searchRef?.show()">
      <i class="ma-icon ma-icon-search"></i>
    </span>
    <span title="历史记录" @click="onHistory">
      <i class="ma-icon ma-icon-history"></i>
    </span>
    <span title="上传接口" @click="onUpload">
      <i class="ma-icon ma-icon-upload"></i>
    </span>
    <span title="导出接口" @click="onDownload">
      <i class="ma-icon ma-icon-download"></i>
    </span>
    <span title="远程推送" @click="onPush">
      <i class="ma-icon ma-icon-push"></i>
    </span>
    <span title="换肤" @click.stop="skinVisible = true">
      <i class="ma-icon ma-icon-skin"></i>
    </span>
    <span title="重新加载所有数据" @click="onRefresh">
      <i class="ma-icon ma-icon-refresh"></i>
    </span>
    <div v-show="skinVisible" class="ma-skin-selector">
      <ul>
        <li v-for="theme in themeKeys" :key="'theme_' + theme" @click="switchTheme(theme)">{{ theme }}</li>
      </ul>
    </div>
    <!-- 上传接口对话框 -->
    <linlan-dialog title="上传接口" :value="showUploadDialog" align="right" @onClose="showUploadDialog = false">
      <template #content>
        <linlan-file ref="uploadFileRef" placeholder="未选择文件" />
      </template>
      <template #buttons>
        <button class="ma-button active" @click="doUpload('increment')">增量上传</button>
        <button class="ma-button" @click="doUpload('full')">全量上传</button>
      </template>
    </linlan-dialog>
    <!-- 导出接口对话框 -->
    <linlan-dialog
      :value="exportVisible"
      title="导出"
      align="right"
      :moveable="false"
      width="340px"
      height="490px"
      className="ma-tree-wrapper"
      @onClose="exportVisible = false"
    >
      <template #content>
        <linlan-resource-choose ref="resourceExportRef" height="400px" max-height="400px" />
      </template>
      <template #buttons>
        <button class="ma-button" @click="(resourceExportRef as any)?.doSelectAll?.(true)">全选</button>
        <button class="ma-button" @click="(resourceExportRef as any)?.doSelectAll?.(false)">取消全选</button>
        <button class="ma-button active" @click="doExport">导出</button>
      </template>
    </linlan-dialog>
    <!-- 远程推送对话框 -->
    <linlan-dialog
      title="远程推送"
      :value="showPushDialog"
      align="right"
      :moveable="false"
      class="ma-remote-push-container ma-tree-wrapper"
      width="400px"
      height="540px"
      @onClose="showPushDialog = false"
    >
      <template #content>
        <linlan-resource-choose ref="resourcePushRef" height="400px" max-height="400px" />
        <div>
          <label>远程地址：</label>
          <linlan-input placeholder="请输入远程地址" v-model:value="pushTarget" width="300px" />
        </div>
        <div>
          <label>秘钥：</label>
          <linlan-input placeholder="请输入秘钥" v-model:value="pushSecretKey" width="300px" type="password" />
        </div>
      </template>
      <template #buttons>
        <button class="ma-button" @click="(resourcePushRef as any)?.doSelectAll?.(true)">全选</button>
        <button class="ma-button" @click="(resourcePushRef as any)?.doSelectAll?.(false)">取消全选</button>
        <button class="ma-button active" @click="doPush('increment')">增量推送</button>
        <button class="ma-button" @click="doPush('full')">全量推送</button>
      </template>
    </linlan-dialog>
    <linlan-search ref="searchRef" style="flex: none" />
  </div>
</template>

<style scoped>
.ma-header {
  height: 30px;
  line-height: 30px;
  text-align: right;
  color: var(--header-default-color);
  background: var(--background);
  display: flex;
  border-bottom: 1px solid var(--border-color);
  padding-right: 15px;
}

.ma-header > .ma-logo {
  float: left;
  color: var(--header-title-color);
  font-weight: bold;
  font-size: 0px;
  letter-spacing: 0px;
  background-repeat: no-repeat;
  background-position: 4px 7px;
  padding-left: 25px;
}

.ma-header > div:not(.ma-logo):not(.ma-skin-selector) {
  flex: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ma-header > div > label {
  font-size: 16px;
  display: inline-block;
  margin-right: 5px;
  text-align: left;
}

.ma-header > div > label.version {
  font-size: 12px;
  color: var(--header-version-color);
}

.ma-header > span {
  cursor: pointer;
  padding: 0 4px;
  height: 30px;
  line-height: 30px;
  display: inline-block;
  vertical-align: middle;
  border-radius: 2px;
  text-align: center;
}

.ma-header > span:last-child {
  margin-right: 15px;
}

.ma-header .ma-button-run {
  color: var(--button-run-color);
}

.ma-header .ma-icon-push {
  color: var(--button-run-color);
  font-weight: bold;
}

.ma-header > span:hover:not(.disabled) {
  background: var(--button-hover-background);
}

.ma-header > span.disabled {
  color: var(--button-disabled-background);
}

.ma-skin-selector {
  position: absolute;
  top: 30px;
  right: 100px;
  z-index: 20;
  background: var(--background);
  border: 1px solid var(--border-color);
  border-top: none;
}

.ma-skin-selector ul li:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
  padding: 2px 5px;
}

.ma-remote-push-container label {
  width: 80px;
  text-align: right;
  display: inline-block;
}

ul li {
  height: 24px;
  line-height: 24px;
  text-align: center;
  cursor: pointer;
}
</style>
