<script lang="ts">
// @ts-nocheck

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanTreeItem',
  props: {
    item: Object,
    data: Array
  }
})
</script>

<template>
  <div class="ma-tree-item">
    <slot v-if="item.folder" :item="item" name="folder"></slot>
    <slot v-else :item="item" name="file"></slot>
    <slot :item="item"></slot>
    <div v-show="item.opened" class="ma-tree-sub-items">
      <linlan-tree-item v-for="(subItem, index) in data" :key="'ma_tree_item_' +index" :data="subItem.children"
                       :item="subItem">
        <template v-for="(value, key) in $slots" v-slot:[key]="{ item }">
          <slot :item="item" :name="key"></slot>
        </template>
      </linlan-tree-item>
    </div>
  </div>
</template>

<style></style>
