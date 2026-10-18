<script lang="ts">
// @ts-nocheck
import LinlanTreeItem from '@/components/common/linlan-tree-item.vue'

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanTree',
  props: {
    data: Array,
    // 解决子组件不强制刷新
    forceUpdate: Boolean,
    loading: {
      type: Boolean,
      default: false
    },
    loadingTime: {
      type: Number,
      default: 500
    }
  },
  components: {
    LinlanTreeItem
  },
  data() {
    return {
      showLoading: false
    }
  },
  watch: {
    loading(newVal) {
      if (newVal) {
        this.showLoading = newVal
      } else {
        setTimeout(() => {
          this.showLoading = newVal
        }, this.loadingTime)
      }
    }
  },
  mounted() {
    this.showLoading = this.loading
  }
})
</script>

<template>
  <div class="ma-tree-container">
    <!-- 解决子组件不强制刷新 -->
    <div v-show="forceUpdate"></div>
    <div v-show="!showLoading">
      <template v-for="item in data" :key="'tree_' + item.id">
        <linlan-tree-item :data="item.children" :item="item">
          <template v-for="(value, key) in $slots" :key="key" v-slot:[key]="{ item }">
            <slot :item="item" :name="key"></slot>
          </template>
        </linlan-tree-item>
      </template>
    </div>
  </div>
</template>

<style>
.ll-tree-container {
  position: relative;
}
.ll-tree-container .loading i {
  color: var(--color);
  font-size: 20px;
}
.ll-tree-container .loading .icon .ll-icon {
  padding: 0;
}
.ll-tree-container .loading .icon {
  width: 20px;
  margin: 0 auto;
  line-height: normal;
  animation: rotate 1s linear infinite;
}
.ll-tree-container .loading {
  color: var(--color);
  position: absolute;
  text-align: center;
  width: 100%;
  top: 50%;
  margin-top: -20px;
}
.ll-tree-container .no-data {
  color: var(--color);
  position: absolute;
  top: 50%;
  left: 50%;
  margin-left: -20px;
}
</style>
