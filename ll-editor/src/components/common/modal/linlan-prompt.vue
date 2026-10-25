<script lang="ts">
// @ts-nocheck
import { defineComponent } from 'vue'
import LinlanDialog from '@/components/common/modal/linlan-dialog.vue'
import LinlanInput from '@/components/common/linlan-input.vue'

/**
 * 输入型对话框（替代 window.prompt）：
 * 结构对齐 magic-editor 中「magic-input + magic-dialog」的组合用法。
 */
export default defineComponent({
  name: 'LinlanPrompt',
  components: { LinlanDialog, LinlanInput },
  props: {
    title: {
      type: String,
      default: '提示'
    },
    content: String,
    defaultValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    ok: {
      type: String,
      default: '确定'
    },
    cancel: {
      type: String,
      default: '取消'
    },
    onOk: {
      type: Function,
      require: false
    },
    onCancel: {
      type: Function,
      require: false
    },
    onClose: {
      type: Function,
      require: false
    },
    value: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      text: this.defaultValue || ''
    }
  },
  methods: {
    close() {
      this.$refs.dialog.hide()
    },
    okHandle() {
      const text = (this.text || '').trim()
      if (!text) return
      // 先缓存 dialog 引用：onOk 内部会卸载组件，卸载后 $refs.dialog 变为 null
      const dialog = this.$refs.dialog
      if (typeof this.onOk === 'function') {
        this.onOk(text)
      }
      if (dialog) dialog.hide()
      this.closeHandle()
    },
    cancelHandle() {
      if (typeof this.onCancel === 'function') {
        this.onCancel()
      }
      this.close()
    },
    closeHandle() {
      if (typeof this.onClose === 'function') {
        this.onClose()
      }
    }
  }
})
</script>

<template>
  <linlan-dialog
    ref="dialog"
    :value="value"
    :title="title"
    align="right"
    width="350px"
    @input="$emit('input', $event)"
    @onClose="closeHandle"
  >
    <template #content>
      <div style="padding: 5px 0">
        <div v-if="content" style="margin-bottom: 5px">{{ content }}</div>
        <linlan-input v-model="text" :placeholder="placeholder" width="100%" :on-enter="okHandle" />
      </div>
    </template>
    <template #buttons>
      <button class="ll-button active" @click="okHandle">{{ ok }}</button>
      <button class="ll-button" @click="cancelHandle">{{ cancel }}</button>
    </template>
  </linlan-dialog>
</template>
