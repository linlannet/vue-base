// 当前登录用户状态（侧栏用户入口与状态栏共享）
import { computed, ref } from 'vue'
import request from '@/api/request'
import contants from '@/scripts/contants'
import store from '@/scripts/store'
import bus from '@/scripts/bus'
import { modal } from '@/components/common/modal/index'

export interface LoginUser {
  id?: string | null
  username?: string
  ip?: string
}

export interface SelfInfo {
  cid?: string
  username?: string
  ip?: string
}

/** /user 接口返回的当前登录用户 */
export const currentUser = ref<LoginUser | null>(null)
/** WebSocket 登录握手回执中的自身信息（含 IP） */
export const selfInfo = ref<SelfInfo | null>(null)

/** 拉取当前登录用户信息（登录成功后调用，异常不弹窗） */
export function fetchCurrentUser(): void {
  request
    .send('/user', null, { method: 'get' })
    .exception(() => {})
    .error(() => {})
    .success((u: LoginUser) => {
      currentUser.value = u
    })
}

/** 当前用户名（guest 显示为游客） */
export const displayName = computed(() => {
  const raw = currentUser.value?.username || selfInfo.value?.username || ''
  return raw === 'guest' ? '游客' : raw
})

/** 当前用户 IP */
export const displayIp = computed(
  () => selfInfo.value?.ip || currentUser.value?.ip || location.hostname
)

/** 注销登录并广播，成功后回调 */
export function logoutCurrentUser(onDone?: () => void): void {
  const name = currentUser.value?.username || selfInfo.value?.username || ''
  if (!name) return
  bus.$emit('status', '准备注销登录')
  ;(modal as any).linlanConfirm(`是否要注销登录「${name}」`, {
    title: '注销登录',
    onOk: () => {
      request.send('/logout', null, { method: 'get' }).success(() => {
        currentUser.value = null
        selfInfo.value = null
        contants.HEADER_MAGIC_TOKEN_VALUE = 'unauthorization'
        store.remove(contants.HEADER_MAGIC_TOKEN)
        bus.$emit('logout')
        bus.$emit('status', '成功注销登录')
        onDone?.()
      })
    }
  })
}
