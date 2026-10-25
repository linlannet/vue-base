<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import LinlanDialog from '@/components/common/modal/linlan-dialog.vue'

/**
 * 复制分组的目标分组选择对话框（接口树 / 函数树共用）。
 * 用法：<linlan-copy-group :value="visible" :groups="..." @onClose="..." @confirm="target => ..." />
 */
export default defineComponent({
  name: 'LinlanCopyGroup',
  components: { LinlanDialog },
  props: {
    value: { type: Boolean, default: false },
    title: { type: String, default: '复制分组' },
    groups: {
      type: Array as PropType<{ id: string; name: string; depth?: number }[]>,
      default: () => []
    },
    okText: { type: String, default: '确定' },
    cancelText: { type: String, default: '取消' },
    rootText: { type: String, default: '根分组' }
  },
  emits: ['onClose', 'confirm', 'input'],
  data() {
    return { target: '0' }
  },
  watch: {
    value(v) {
      if (v) this.target = '0'
    }
  },
  methods: {
    close() {
      this.$emit('onClose')
      this.$emit('input', false)
    },
    confirm() {
      this.$emit('confirm', this.target)
    }
  }
})
</script>

<template>
  <linlan-dialog
    :value="value"
    :title="title"
    width="360px"
    @onClose="close"
    @input="$emit('input', $event)"
  >
    <template #content>
      <div class="ll-copy-group-list">
        <div
          class="ll-copy-group-item"
          :class="{ selected: target === '0' }"
          @click="target = '0'"
        >{{ rootText }}</div>
        <div
          v-for="g in groups"
          :key="g.id"
          class="ll-copy-group-item"
          :class="{ selected: target === g.id }"
          :style="{ paddingLeft: 10 + (g.depth || 0) * 14 + 'px' }"
          @click="target = g.id"
        >{{ g.name }}</div>
      </div>
    </template>
    <template #buttons>
      <button class="ll-button active" @click="confirm">{{ okText }}</button>
      <button class="ll-button" @click="close">{{ cancelText }}</button>
    </template>
  </linlan-dialog>
</template>

<style scoped>
.ll-copy-group-list {
  max-height: 260px;
  overflow: auto;
  border: 1px solid var(--border-color, #cdcdcd);
  background: var(--background, #fff);
  padding: 4px 0;
}
.ll-copy-group-item {
  height: 22px;
  line-height: 22px;
  padding-left: 10px;
  padding-right: 8px;
  font-size: 12px;
  color: var(--resource-label-color, #333);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ll-copy-group-item:hover {
  background: var(--tree-hover-background-color, #d4d4d4);
}
.ll-copy-group-item.selected {
  background: var(--select-background, #cfe8fc);
}
</style>
