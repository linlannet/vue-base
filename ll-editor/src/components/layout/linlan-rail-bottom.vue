<script setup lang="ts">
// 右侧活动栏底部：在线人数（图标在上、数量在下）+ Gitee/GitHub/帮助/注销入口
// 底部状态栏已移除，这里同时接管它的后台职责：WS 在线用户推送、ping/pong 保活、login 后拉取用户信息
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import type { I18n } from '@/i18n'
import bus from '@/scripts/bus'
import { currentUser as user, displayIp, fetchCurrentUser, logoutCurrentUser } from '@/scripts/user'

const i18n = inject<I18n>('ll-i18n')!

interface OnlineUser {
  cid?: string
  username?: string
  ip?: string
}
const onlineUsers = ref<OnlineUser[]>([])
let selfCid = ''
function onLoginResponse(args: any[]): void {
  const [status, info] = args || []
  if (status === '1' && info) selfCid = info.cid ?? ''
}
function onUserLogin(args: any[]): void {
  const [u] = args || []
  if (!u || (selfCid && u.cid === selfCid)) return
  if (!onlineUsers.value.some((i) => i.cid === u.cid)) onlineUsers.value.push(u)
}
function onUserLogout(args: any[]): void {
  const [u] = args || []
  if (!u || (selfCid && u.cid === selfCid)) return
  onlineUsers.value = onlineUsers.value.filter((i) => i.cid !== u.cid)
}
function onOnlineUsers(args: any[]): void {
  const [list] = args || []
  if (!Array.isArray(list)) return
  onlineUsers.value = list.filter((u: OnlineUser) => u && !(selfCid && u.cid === selfCid))
}

const userTitle = computed(() => {
  const rawName = user.value?.username || ''
  const name = rawName === 'guest' ? '游客' : rawName
  return `用户名：${name || '-'}  IP：${displayIp.value}`
})
function fmt(tpl: string, val: string): string {
  return tpl.replace('{0}', val)
}
const onlineTitle = computed(() => fmt(i18n.t('online.onlines'), String(onlineUsers.value.length)))

function onPing(): void {
  // 保活：收到 ping 回 pong（对齐官方 Se.PING -> T.send(Se.PONG)）
  bus.$emit('message', 'pong')
}
function onLogin(): void {
  fetchCurrentUser()
}

function open(url: string): void {
  window.open(url)
}

onMounted(() => {
  bus.$on('login', onLogin)
  bus.$on('ws_login_response', onLoginResponse)
  bus.$on('ws_user_login', onUserLogin)
  bus.$on('ws_user_logout', onUserLogout)
  bus.$on('ws_online_users', onOnlineUsers)
  bus.$on('ws_ping', onPing)
})
onBeforeUnmount(() => {
  bus.$off('login', onLogin)
  bus.$off('ws_login_response', onLoginResponse)
  bus.$off('ws_user_login', onUserLogin)
  bus.$off('ws_user_logout', onUserLogout)
  bus.$off('ws_online_users', onOnlineUsers)
  bus.$off('ws_ping', onPing)
})
</script>

<template>
  <div class="ll-rail-bottom not-select">
    <!-- 在线人数：图标在上、数量在下 -->
    <span class="ll-rail-online" :title="onlineTitle">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M15 20v-1.2a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 4 18.8V20" />
        <circle cx="9.5" cy="7.5" r="3.2" />
        <path d="M20 20v-1.2a3.5 3.5 0 0 0-2.6-3.4" />
        <path d="M16.2 4.4a3.2 3.2 0 0 1 0 6.2" />
      </svg>
      <b>{{ onlineUsers.length }}</b>
    </span>
    <span class="ll-rail-sep"></span>
    <!-- 四个快捷入口：与状态栏同源的彩色圆形图标 -->
    <span class="ll-rail-entry" title="Gitee" @click="open('https://gitee.com/linlannet/vue-base')">
      <i class="ll-icon ll-icon-gitee ll-icon-badge ll-icon-badge-gitee"></i>
    </span>
    <span class="ll-rail-entry" title="Github" @click="open('https://gitee.com/linlannet/vue-base')">
      <i class="ll-icon ll-icon-git ll-icon-badge ll-icon-badge-git"></i>
    </span>
    <span class="ll-rail-entry" title="帮助文档" @click="open('https://gitee.com/linlannet/vue-base')">
      <i class="ll-icon ll-icon-help ll-icon-badge ll-icon-badge-help"></i>
    </span>
    <span v-if="user && user.username" class="ll-rail-entry" :title="userTitle" @click="logoutCurrentUser()">
      <i class="ll-icon ll-icon-logout ll-icon-badge ll-icon-badge-logout"></i>
    </span>
  </div>
</template>

<style scoped>
.ll-rail-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  border-top: 1px solid var(--border-color, #e5e7eb);
}

.ll-rail-online {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  color: #57606a;
  cursor: default;
}

.ll-rail-online svg {
  width: 15px;
  height: 15px;
}

.ll-rail-online b {
  font-size: 10px;
  line-height: 1;
  font-weight: 600;
  color: var(--ll-primary, #3a8ee6);
}

.ll-rail-sep {
  width: 18px;
  height: 1px;
  background: var(--border-color, #e5e7eb);
  margin: 1px 0;
}

.ll-rail-entry {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
}

.ll-rail-entry:hover {
  background: #eef2f6;
}

.ll-rail-entry .ll-icon.ll-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  line-height: 1;
  color: #fff;
  /* 统一主题蓝，替代原品牌杂色 */
  background: var(--ll-primary, #3a8ee6);
  border-radius: 50%;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.ll-rail-entry:hover .ll-icon-badge {
  transform: scale(1.12);
  filter: brightness(1.08);
}
</style>
