<script lang="ts">
// @ts-nocheck
import LinlanDialog from '@/components/common/modal/linlan-dialog.vue'

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanAlert',
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
      default: 'OK'
    },
    onOk: {
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
      this.$refs.dialog.close()
    },
    okHandle() {
      this.close()
      if (typeof this.onOk === 'function') {
        this.onOk()
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
  <linlan-dialog v-if="value" ref="dialog" :value="value" @input="$emit('input', $event)" :title="title" @onClose="closeHandle">
    <template #content>
      {{ content }}
    </template>

    <template #buttons>
      <button class="ll-button active" @click="okHandle">{{ ok }}</button>
    </template>
  </linlan-dialog>
</template>
