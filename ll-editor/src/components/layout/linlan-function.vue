<script lang="ts">
// @ts-nocheck
import LinlanInput from '@/components/common/linlan-input.vue'
import LinlanSelect from '@/components/common/linlan-select.vue'
import LinlanTextarea from '@/components/common/linlan-textarea.vue'

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanFunction',
  props: {
    info: Object
  },
  components: {
    LinlanInput,
    LinlanSelect,
    LinlanTextarea
  },
  data() {
    return {
      navs: ['函数参数', '函数描述'],
      types: [
        {value: 'java.lang.Number', text: '数值'},
        {value: 'java.lang.String', text: '字符串'},
        {value: 'java.util.Collection', text: '集合'},
        {value: 'java.util.Map', text: 'Map'},
        {value: 'java.lang.Object', text: 'Object'}
      ],
      showIndex: 0,
      parameterIndex: 0,
    }
  },
  methods: {
    addRow() {
      if (!this.info.parameters) {
        this.$linlanAlert({
          content: '请先添加或选择接口'
        })
        return
      }
      if (this.showIndex === 0) {
        this.info.parameters.push({name: '', type: '', description: ''})
        this.parameterIndex = this.info.parameters.length - 1
      } else if (this.showIndex === 1) {
        this.info.requestHeader.push({name: '', type: '', description: ''})
        this.headerIndex = this.info.requestHeader.length - 1
      }
      this.$forceUpdate()
    },
    removeRow() {
      if (!this.info.parameters) {
        this.$linlanAlert({
          content: '请先添加或选择函数'
        })
        return
      }
      this.info.parameters.splice(this.parameterIndex, 1)
      if (this.info.parameters.length === 0) {
        this.parameterIndex = 0
        this.addRow()
      } else if (this.info.parameters.length <= this.parameterIndex) {
        this.parameterIndex = this.info.parameters.length - 1
      }
      this.$forceUpdate()
    }
  }
})
</script>

<template>
  <div class="ll-request-wrapper">
    <div class="ll-api-info">
      <label>返回值</label>
      <linlan-select :options="types" v-model:value="info.returnType" defaultValue="Object"/>
      <label>函数名称</label>
      <linlan-input v-model:value="info.name" placeholder="请输入函数名称" style="flex:1 1 160px"/>
      <label>函数路径</label>
      <linlan-input v-model:value="info.path" placeholder="请输入函数路径" style="flex:2 1 260px"/>
    </div>
    <div class="ll-request-parameters">
      <ul class="not-select ll-nav-tab">
        <li v-for="(item, key) in navs" :key="'request_item_' + key" :class="{ selected: showIndex === key }"
            @click="showIndex = key;">{{ item }}
        </li>
      </ul>
      <div class="ll-layout">
        <div v-show="showIndex < 1" class="not-select ll-sider">
          <div @click="addRow"><i class="ll-icon ll-icon-plus"/></div>
          <div @click="removeRow"><i class="ll-icon ll-icon-minus"/></div>
        </div>
        <div v-show="showIndex === 0" class="ll-layout-container">
          <div class="ll-header ll-table-row">
            <div>参数名称</div>
            <div>类型</div>
            <div>描述</div>
          </div>
          <div class="ll-content">
            <div v-for="(item, key) in info.parameters" :key="'request_parameter_' + key"
                 class="ll-table-row">
              <div :class="{ focus: parameterIndex === key && !item.name }">
                <linlan-input :focus="() => (parameterIndex = key)" v-model:value="item.name"
                             style="width: 100%"/>
              </div>
              <div>
                <linlan-select :focus="() => (parameterIndex = key)" :options="types" v-model:value="item.type"  style="width: 100%"/>
              </div>
              <div>
                <linlan-input :focus="() => (parameterIndex = key)" v-model:value="item.description"
                             style="width: 100%"/>
              </div>
            </div>
          </div>
        </div>
        <div v-show="showIndex === 1" class="ll-layout-container" style="overflow: hidden; right: 0">
          <linlan-textarea v-model:value="info.description" style="width: 100%; height: 100%; margin: 2px"/>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ll-request-wrapper {
  background: var(--background);
  height: 100%;
  width: 100%;
  position: relative;
}

/* 窗口变窄时：返回值 / 函数名称 / 函数路径 保持同一行等比缩放，不换行 */
.ll-api-info {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  overflow: hidden;
  gap: 8px;
  padding: 5px 8px;
  border-bottom: 1px solid var(--tab-bar-border-color);
}

.ll-api-info * {
  display: inline-block;
}

/* 标签按文字自适应；shrink 取极小值，空间不够时优先压两个输入框 */
.ll-api-info label {
  flex: 0 0.05 auto;
  width: auto;
  min-width: 0;
  text-align: right;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
}

/* 下拉框只少量参与收缩 */
.ll-api-info > :deep(.ll-select) {
  flex: 0 0.2 auto;
  min-width: 90px;
}

/* input 容器：允许被压缩到 0（默认 min-width: auto 会卡在固有宽度，逼出换行） */
.ll-api-info > :deep(div:not(.ll-select)) {
  min-width: 0;
}

.ll-api-info :deep(input) {
  min-width: 0;
}

.ll-request-wrapper > div:not(.ll-api-info) {
  position: absolute;
  top: 33px;
  bottom: 0px;
  width: 100%;
  overflow: hidden;
  display: inline-block;
}

.ll-request-wrapper > div > h3 {
  color: var(--color);
  font-size: 12px;
  font-weight: inherit;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-bottom: 1px solid var(--tab-bar-border-color);
}

.ll-layout .ll-table-row > * {
  width: 20%;
}

.ll-layout .ll-table-row > *:last-child {
  width: 60%;
}
</style>
