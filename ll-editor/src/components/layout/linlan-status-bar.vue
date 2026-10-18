<script setup lang="ts">
// 状态栏（对齐 magic-status-bar）：左侧 bus 'status' 消息 + KB 文档信息，右侧 链接图标 + 用户/注销
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import type { I18n } from '@/i18n'
import type { LLEditor } from '@/core/LLEditor'
import bus from '@/scripts/bus'
import request from '@/api/request'
import contants from '@/scripts/contants'
import store from '@/scripts/store'
import { modal } from '@/components/common/modal/index'

const editor = inject<LLEditor>('ll-editor')!
const i18n = inject<I18n>('ll-i18n')!
const state = inject<{
  openDocs: { id: string; name: string }[]
  activeId: string
  running: boolean
  paused: boolean
}>('ll-state')!

// ===== bus 'status' 消息（对齐 magic-status-bar） =====
const message = ref('')
function onStatus(msg: string): void {
  message.value = msg ?? ''
}
// ===== 当前登录用户（对齐 magic-status-bar login 事件后拉取 /user） =====
const user = ref<{ id?: string | null; username?: string } | null>(null)
function onLogin(): void {
  bus.$emit('status', '获取当前登录用户信息')
  request.send('/user', null, { method: 'get' }).success((u: any) => {
    user.value = u
  })
}

function open(url: string): void {
  window.open(url)
}
function logout(): void {
  if (!user.value) return
  bus.$emit('status', '准备注销登录')
  ;(modal as any).linlanConfirm(`是否要注销登录「${user.value.username}」`, {
    title: '注销登录',
    onOk: () => {
      request.send('/logout', null, { method: 'get' }).success(() => {
        user.value = null
        contants.HEADER_MAGIC_TOKEN_VALUE = 'unauthorization'
        store.remove(contants.HEADER_MAGIC_TOKEN)
        bus.$emit('logout')
        bus.$emit('status', '成功注销登录')
      })
    }
  })
}

onMounted(() => {
  bus.$on('status', onStatus)
  bus.$on('login', onLogin)
})
onBeforeUnmount(() => {
  bus.$off('status', onStatus)
  bus.$off('login', onLogin)
})
</script>

<template>
  <div class="ma-status-container ll-editor-statusbar">
    <!-- 左：status 消息优先，其次 KB 文档信息 -->
    <div class="ma-status-left">
      <span v-if="message" v-html="message"></span>
      <template v-else>
        <span>{{ i18n.t('status.docs') }}: {{ state.openDocs.length }}</span>
        <span v-if="editor.getPluginApi()?.getActiveDoc()">· {{ editor.getPluginApi()!.getActiveDoc()!.language }}</span>
        <span v-if="state.running" class="ll-status-run">· {{ i18n.t('status.running') }}</span>
        <span v-if="state.paused" class="ll-status-pause">· {{ i18n.t('status.paused') }}</span>
      </template>
    </div>
    <!-- 右：链接图标 + 用户/注销（对齐 magic-status-bar） -->
    <div class="ma-icons">
      <span title="Gitee" @click="open('https://gitee.com/ssssssss-team/magic-api')">
        <i class="ma-icon ma-icon-gitee"></i>
      </span>
      <span title="Github" @click="open('https://github.com/ssssssss-team/magic-api')">
        <i class="ma-icon ma-icon-git"></i>
      </span>
      <span title="帮助文档" @click="open('https://ssssssss.org')">
        <i class="ma-icon ma-icon-help"></i>
      </span>
      <span
        v-if="user && user.username"
        :title="user.username"
        @click="logout"
      >
        <i class="ma-icon ma-icon-logout" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.ma-status-container {
  position: absolute;
  bottom: 0px;
  height: 24px;
  width: 100%;
  border-top: 1px solid var(--footer-border-color);
  padding-left: 20px;
  line-height: 24px;
  background: var(--background);
  flex: none;
  text-align: left;
  color: var(--color);
  display: flex;
}
.ma-status-container > div {
  flex: 1;
}
.ma-status-container .ma-icons {
  flex: none;
  color: var(--header-default-color);
}
.ma-status-container .ma-icons span {
  cursor: pointer;
  padding: 0 4px;
  height: 20px;
  line-height: 20px;
  display: inline-block;
  vertical-align: middle;
  border-radius: 2px;
  text-align: center;
}
.ma-status-container .ma-icons span:hover {
  background: var(--button-hover-background);
}
</style>
