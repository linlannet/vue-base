<script setup lang="ts">
// 登录框（对齐 magic-login）：用户名/密码 → /login → 存 token → onLogin
import { ref } from 'vue'
import request from '@/api/request'
import contants from '@/scripts/contants'
import store from '@/scripts/store'
import bus from '@/scripts/bus'
import { modal } from '@/components/common/modal/index'
import LinlanInput from '@/components/common/linlan-input.vue'
import LinlanDialog from '@/components/common/modal/linlan-dialog.vue'

const props = defineProps<{
  onLogin?: () => void
}>()

const username = ref('')
const password = ref('')

function doLogin(): void {
  request
    .send('/login', {
      username: username.value,
      password: password.value
    })
    .success((res: unknown, response: { headers?: Record<string, string> }) => {
      if (res) {
        bus.$emit('status', '登录成功')
        contants.HEADER_MAGIC_TOKEN_VALUE =
          (response?.headers?.[contants.HEADER_MAGIC_TOKEN] as string) ?? ''
        store.set(contants.HEADER_MAGIC_TOKEN, contants.HEADER_MAGIC_TOKEN_VALUE)
        props.onLogin?.()
      } else {
        bus.$emit('status', '登录失败')
        ;(modal as any).linlanAlert('登录失败,用户名或密码不正确', { title: '登录' })
      }
    })
}
</script>

<template>
  <linlan-dialog v-show="true" :moveable="false" :shade="true" :showClose="false" title="登录" :value="true">
    <template #content>
      <label>用户名：</label>
      <linlan-input :onEnter="doLogin" v-model:value="username" />
      <div style="height: 2px" />
      <label>密码：</label>
      <linlan-input :onEnter="doLogin" v-model:value="password" type="password" />
    </template>
    <template #buttons>
      <button class="ma-button active" @click="doLogin">登录</button>
    </template>
  </linlan-dialog>
</template>

<style scoped>
label {
  width: 80px;
  text-align: right;
  display: inline-block;
}
</style>
