<script lang="ts">
// @ts-nocheck
  import LinlanJsonTreeFormat from '@/components/common/linlan-json-tree-format'
  import {deepClone} from '@/scripts/utils'
  // Vite/ESM 下不支持 CommonJS require()，改用静态 import 加载图片资源
  import imgArray from '../../assets/images/array.gif'
  import imgObject from '../../assets/images/object.gif'

  import { defineComponent } from 'vue'
export default defineComponent({
    name: 'LinlanJsonTree',
    inheritAttrs: false,
    data() {
      return {
        imgArray,
        imgObject,
      }
    },
    props: {
      jsonData: {
        type: Array,
        required: true
      },
      indentLevel: Array,
      forceUpdate: Boolean
    },
    components: {
      LinlanJsonTreeFormat
    },
    methods: {
      color(dataType) {
        let color = "color: #42b983; margin-left: 5px;";
        switch (dataType) {
          case 'Integer':
          case 'Double':
          case 'Long':
          case 'Short':
          case 'Float':
          case 'Byte':
            color = "color: #fc1e70; margin-left: 5px;";
            break;
          case 'Boolean':
            color = "color: #e08331; margin-left: 5px;";
            break;
        }
        return color;
      },
      createLevel(indentLevel, jsonData, item, index) {
        if (!indentLevel) {
          indentLevel = []
        }
        indentLevel[item.level] = jsonData.length === index + 1 ? 1 : 0
        return deepClone(indentLevel)
      },
      handleItemClick(item, index) {
        this.$emit('jsonClick', item)
        this.jsonData.map(item => {
          item.selected = false;
        })
        this.jsonData[index].selected = !this.jsonData[index].selected
        event.stopPropagation()
      }
    }
  })
</script>

<template>
   <ul class="ll-tree">
    <li v-for="(item, index) in jsonData" :key="index" @click="handleItemClick(item, index)">
      <!-- 解决子组件不强制刷新 -->
      <div v-show="forceUpdate"></div>
      <div class="item-inline"  :class="item.selected ? 'tree-item item-selected' : 'tree-item'">
        <linlan-json-tree-format :item="item" :index="index" :dataLength="jsonData.length" :indentLevel="indentLevel"/>
        <div class="item-inline">
          <template  v-if="item.dataType === 'Object' || item.dataType === 'Array'" >
            <img :src="imgObject" v-if="item.dataType === 'Object'"/>
            <img :src="imgArray" v-else/>
          </template>
        </div>
        <template  v-if="item.dataType === 'Object' || item.dataType === 'Array'" >
          <linlan-json-tree :jsonData="item.children" :indentLevel="createLevel(indentLevel, jsonData, item, index)" :forceUpdate="forceUpdate" v-bind="$attrs"/>
        </template>
      </div>
    </li>
  </ul>
</template>

<style>
  .ll-tree {
    font-size: 14px;
    line-height: 14px;
  }

  .ll-tree .tree-item {
    cursor: pointer;
  }

  .ll-tree .item-selected {
    background-color: var(--toolbox-list-hover-background);
  }

  .item-inline {
    display: flex;
    flex-direction: row;
    align-items: center;
    white-space: nowrap;
  }
</style>
