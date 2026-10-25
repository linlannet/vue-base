<script lang="ts">
// @ts-nocheck
import LinlanDialog from '@/components/common/modal/linlan-dialog.vue'

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanConfirm',
  components: {
    LinlanDialog
  },
  props: {
    title: {
      type: String,
      default: '提示'
    },
    content: String,
    ok: {
      type: String,
      default: '是'
    },
    cancel: {
      type: String,
      default: '否'
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
  methods: {
    close() {
      const dialog = this.$refs.dialog
      if (dialog) dialog.hide()
    },
    okHandle() {
      this.close()
      if (typeof this.onOk === 'function') {
        this.onOk()
      }
      this.closeHandle()
    },
    cancelHandle() {
      this.close()
      if (typeof this.onCancel === 'function') {
        this.onCancel()
      }
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
  <linlan-dialog ref="dialog" :value="value" @input="$emit('input', $event)" :title="title" align="right" @onClose="closeHandle">
    <template #content>
      <div v-html="content"/>
    </template>

    <template #buttons>
      <button class="ll-button active" @click="okHandle">{{ ok }}</button>
      <button class="ll-button" @click="cancelHandle">{{ cancel }}</button>
    </template>
  </linlan-dialog>
</template>
