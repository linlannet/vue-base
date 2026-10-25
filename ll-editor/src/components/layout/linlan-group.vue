<script lang="ts">
// @ts-nocheck
import LinlanInput from '@/components/common/linlan-input.vue'
import LinlanSelect from '@/components/common/linlan-select.vue'
import request from '@/api/request'
import { requestGroup } from '@/scripts/utils'
import bus from '@/scripts/bus'
import contants from '@/scripts/contants'

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanGroup',
  props: {
    info: Object
  },
  components: {
    LinlanInput,
    LinlanSelect
  },
  data() {
    return {
      navs: ['路径变量','分组选项'],
      types: [
        {value: 'String', text: 'String'},
        {value: 'Integer', text: 'Integer'},
        {value: 'Double', text: 'Double'},
        {value: 'Long', text: 'Long'},
        {value: 'Short', text: 'Short'},
        {value: 'Float', text: 'Float'},
        {value: 'Byte', text: 'Byte'},
      ],
      validates: [
        {value: 'pass', text: '不验证'},
        {value: 'expression', text: '表达式验证'},
        {value: 'pattern', text: '正则验证'},
      ],
      defaultOptions: null,
      optionsMap: {},
      optionIndex: 0,
      showIndex: 0,
      pathIndex: 0
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
      if (this.info.options[index]) {
        this.info.options[index].name = value;
        let item = this.optionsMap[value];
        if (item) {
          if (item.description) {
            this.info.options[index].description = item.description
          }
          if (item.defaultValue) {
            this.info.options[index].value = item.defaultValue
          }
        }
      }
    },
    doSave() {
      if (!this.info.paths) {
        this.$linlanAlert({
          content: '请先添加或选择分组'
        })
        return
      }
      let saveObj = {...this.info}
      saveObj.paths =  saveObj.paths.filter(it => it.name)
      saveObj.options =  saveObj.options.filter(it => it.name)
      bus.$emit('status', `准备保存分组「{saveObj.name}」`)
      requestGroup('group/update', saveObj).success(data => {
        bus.$emit('update-group')
        bus.$emit('report', 'group_update')
        bus.$emit('status', `保存分组「{saveObj.name}」成功`)
      })
    },
    addRow() {
      if (!this.info.paths) {
        this.$linlanAlert({
          content: '请先添加或选择分组'
        })
        return
      }
      if (this.showIndex === 0) {
        this.info.paths.push({name: '', value: '', description: ''})
        this.pathIndex = this.info.paths.length - 1
      }else{
        this.info.options.push({name: '', value: '', description: ''})
        this.optionIndex = this.info.options.length - 1
      }
      this.$forceUpdate()
    },
    removeRow() {
      if (!this.info.paths) {
        this.$linlanAlert({
          content: '请先添加或选择分组'
        })
        return
      }
      if (this.showIndex === 0) {
        this.info.paths.splice(this.pathIndex, 1)
        if (this.info.paths.length === 0) {
          this.pathIndex = 0
          this.addRow()
        } else if (this.info.paths.length <= this.pathIndex) {
          this.pathIndex = this.info.paths.length - 1
        }
      }else{
        this.info.options.splice(this.optionIndex, 1)
        if (this.info.options.length === 0) {
          this.optionIndex = 0
          this.addRow()
        } else if (this.info.options.length <= this.optionIndex) {
          this.optionIndex = this.info.options.length - 1
        }
      }
      this.$forceUpdate()
    }
  }
})
</script>

<template>
  <div class="ll-request-wrapper">
    <div class="ll-api-info">
      <label>分组名称</label>
      <linlan-input v-model="info.name" placeholder="请输入分组名称" style="flex:1"/>
      <label>分组路径</label>
      <linlan-input v-model="info.path" placeholder="请输入分组路径" style="flex:2;margin-right: 10px"/>
      <button class="ll-button" @click="doSave">保存</button>
    </div>
    <div class="ll-request-parameters">
      <ul class="not-select ll-nav-tab">
        <li v-for="(item, key) in navs" :key="key" :class="{ selected: showIndex === key }" @click="showIndex = key;">{{ item }}
        </li>
      </ul>
      <div class="ll-layout">
        <div class="not-select ll-sider">
          <div @click="addRow"><i class="ll-icon ll-icon-plus"/></div>
          <div @click="removeRow"><i class="ll-icon ll-icon-minus"/></div>
        </div>
        <div v-show="showIndex === 0" class="ll-layout-container">
          <div class="ll-header ll-table-row ll-table-request-row">
            <div style="flex: 1">Key</div>
            <div style="flex: 1">Value</div>
            <div style="width: 100px">参数类型</div>
            <div style="width: 100px">验证方式</div>
            <div style="flex: 1">表达式或正则表达式</div>
            <div style="flex: 1">验证说明</div>
            <div style="flex: 2">Description</div>
          </div>
          <div class="ll-content">
            <div v-for="(item, key) in info.paths" :key="key"
                 class="ll-table-row ll-table-request-row">
              <div :class="{ focus: pathIndex === key && !item.name }" style="flex:1">
                <linlan-input :focus="() => (pathIndex = key)" v-model:value="item.name" style="width: 100%"/>
              </div>
              <div style="flex:1">
                <linlan-input :focus="() => (pathIndex = key)" v-model:value="item.value" style="width: 100%"/>
              </div>
              <div style="width:100px">
                <linlan-select :border="false" :focus="() => (pathIndex = key)" :options="types"
                              v-model:value="item.dataType" default-value="String" style="width: 100%"/>
              </div>
              <div style="width: 100px">
                <linlan-select :border="false" :focus="() => (pathIndex = key)" :options="validates"
                              v-model:value="item.validateType" default-value="pass" style="width: 100%"/>
              </div>
              <div style="flex:1">
                <linlan-input :focus="() => (pathIndex = key)" v-model:value="item.expression" style="width: 100%"/>
              </div>
              <div style="flex:1">
                <linlan-input :focus="() => (pathIndex = key)" v-model:value="item.error" style="width: 100%"/>
              </div>
              <div style="flex:2">
                <linlan-input :focus="() => (pathIndex = key)" v-model:value="item.description" style="width: 100%"/>
              </div>
            </div>
          </div>
        </div>
        <div v-show="showIndex === 1" class="ll-layout-container">
          <div class="ll-header ll-table-row">
            <div>键</div>
            <div>值</div>
            <div>描述</div>
          </div>
          <div class="ll-content">
            <div v-for="(item, key) in info.options" :key="key" class="ll-table-row">
              <div :class="{ focus: optionIndex === key && !item.name }">
                <linlan-select :focus="() => (optionIndex = key)"
                              :inputable="true"
                              :options="defaultOptions"
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
  </div>
</template>