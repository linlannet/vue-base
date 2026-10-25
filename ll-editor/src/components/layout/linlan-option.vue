<script lang="ts">
// @ts-nocheck
import request from '@/api/request'
import LinlanInput from '@/components/common/linlan-input.vue'
import LinlanSelect from '@/components/common/linlan-select.vue'
import contants from '@/scripts/contants'

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanOption',
  props: {
    info: Object
  },
  components: {
    LinlanInput,
    LinlanSelect
  },
  data() {
    return {
      defaultOptions: null,
      optionsMap: {},
      optionIndex: 0
    }
  },
  mounted() {
    let map = {}
      // 后端 /options 接受任意方法，运行版编辑器为 GET
      request.send('/options', null, { method: 'get' }).success(data => {
        data = data || []
        data = data.concat(contants.OPTIONS)
        this.defaultOptions = data&&data.map(e => {
          let item = {text: e[0], value: e[0], description: e[1], defaultValue: e[2]}
          this.optionsMap[item.value] = item;
          return item;
        })
      })
  },
  methods: {
    onSelect(value, index) {
      if (this.info.option[index]) {
        this.info.option[index].name = value;
        let item = this.optionsMap[value];
        if (item) {
          if (item.description) {
            this.info.option[index].description = item.description
          }
          if (item.defaultValue) {
            this.info.option[index].value = item.defaultValue
          }
        }
      }
    },
    addRow() {
      if (!this.info.option) {
        this.$linlanAlert({
          content: '请先添加或选择接口'
        })
        return
      }
      this.info.option.push({name: '', value: '', description: ''})
      this.optionIndex = this.info.option.length - 1
      this.$forceUpdate()
    },
    removeRow() {
      this.info.option.splice(this.optionIndex, 1)
      if (this.info.option.length === 0) {
        this.optionIndex = 0
        this.addRow()
      } else if (this.info.option.length <= this.optionIndex) {
        this.optionIndex = this.info.option.length - 1
      }
      this.$forceUpdate()
    }
  }
})
</script>

<template>
  <div class="ll-options">
    <div class="ll-layout">
      <div class="not-select ll-sider">
        <div @click="addRow"><i class="ll-icon ll-icon-plus"/></div>
        <div @click="removeRow"><i class="ll-icon ll-icon-minus"/></div>
      </div>
      <div class="ll-layout-container">
        <div class="ll-header ll-table-row">
          <div>键</div>
          <div>值</div>
          <div>描述</div>
        </div>
        <div class="ll-content">
          <div v-for="(item, key) in info.option" :key="'request_parameter_' + key" class="ll-table-row">
            <div :class="{ focus: optionIndex === key && !item.name }">
              <linlan-select :focus="() => (optionIndex = key)" :inputable="true" :options="defaultOptions"
                            :select="value => onSelect(value, key)"
                            v-model:value="item.name" style="width: 100%"/>
            </div>
            <div>
              <linlan-input :focus="() => (optionIndex = key)" v-model:value="item.value" style="width: 100%"/>
            </div>
            <div>
              <linlan-input :focus="() => (optionIndex = key)" v-model:value="item.description" style="width: 100%"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ll-options {
  background: var(--background);
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
}
</style>
