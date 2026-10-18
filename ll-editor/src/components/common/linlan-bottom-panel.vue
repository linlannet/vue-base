<script lang="ts">
// 自 third-magic-editor magic-bottom-panel.vue 移植：
// 底部选项面板的内容包装器（标题栏 + 自定义按钮 + 最小化 + 滚动内容区）。
import { defineComponent } from 'vue'

export interface BottomPanelButton {
  name: string
  icon: string
}

export default defineComponent({
  name: 'LinlanBottomPanel',
  props: {
    title: { type: String, default: '' },
    buttons: { type: Array as () => BottomPanelButton[], default: () => [] }
  },
  emits: ['update:selectedTab']
})
</script>

<template>
  <div class="ma-bottom-content-item">
    <div class="not-select">
      <label>{{ title }}</label>
      <span v-for="button in buttons" :key="'ma_button_' + button.name" :title="button.name">
        <i :class="'ma-icon ma-icon' + button.icon"></i>
      </span>
      <span title="最小化" @click="$emit('update:selectedTab', null)"><i class="ma-icon ma-icon-minimize"></i></span>
    </div>
    <div class="ma-item-body">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.ma-bottom-content-item {
  background: var(--background);
  overflow: auto;
  height: 100%;
  position: relative;
  color: var(--color);
}

.ma-bottom-content-item > div:first-child {
  background: var(--background);
  border-bottom: 1px solid var(--tab-bar-border-color);
  height: 24px;
  line-height: 24px;
  padding-left: 10px;
}

.ma-bottom-content-item > div:first-child > span {
  color: var(--icon-color);
  cursor: pointer;
  padding: 0 3px;
  display: inline-block;
  height: 24px;
  line-height: 24px;
}

.ma-bottom-content-item > div:first-child > span:last-child {
  float: right;
  margin-right: 12px;
}

.ma-bottom-content-item .ma-item-body {
  position: absolute;
  top: 24px;
  bottom: 0px;
  width: 100%;
  overflow: auto;
}
</style>
