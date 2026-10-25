<script lang="ts">
// @ts-nocheck

  import LinlanInput from '@/components/common/linlan-input.vue'
  import LinlanSelect from '@/components/common/linlan-select.vue'
  import LinlanCheckbox from '@/components/common/linlan-checkbox.vue'
  import LinlanJsonTree from '@/components/common/linlan-json-tree'

  import { defineComponent } from 'vue'
export default defineComponent({
    name: 'LinlanJson',
    props: {
      jsonData: {
        type: [Object, Array, String, Number, Boolean, Function],
        required: true
      },
      // 解决子组件不强制刷新
      forceUpdate: Boolean,
      type: String
    },
    data() {
      return {
        validates: [
          {value: 'pass', text: '不验证'},
          {value: 'expression', text: '表达式验证'},
          {value: 'pattern', text: '正则验证'},
        ],
        bodyTypes: [
          {value: 'String', text: 'String'},
          {value: 'Integer', text: 'Integer'},
          {value: 'Double', text: 'Double'},
          {value: 'Long', text: 'Long'},
          {value: 'Short', text: 'Short'},
          {value: 'Float', text: 'Float'},
          {value: 'Byte', text: 'Byte'},
          {value: 'Boolean', text: 'Boolean'},
        ],
        fieldObj: {dataType: "Object"},
        activeNodeFlag: false
      }
    },
    components: {
      LinlanInput,
      LinlanSelect,
      LinlanCheckbox,
      LinlanJsonTree
    },
    watch: {
      jsonData: {
        handler(newVal, oldVal) {
          if (newVal && newVal.length > 0) {
            this.activeNodeFlag = false;
            this.getActiveNode(newVal)
            if (!this.activeNodeFlag) {
              this.fieldObj = newVal[0];
            }
          } else {
            this.fieldObj = {dataType: "Object"}
          }
        },
        deep: true
      }
    },
    methods: {
      getActiveNode(node) {
        node.forEach(item => {
          if (item.selected) {
            this.fieldObj = item;
            this.activeNodeFlag = true;
            return;
          } else {
            this.getActiveNode(item.children)
          }
        })
      },
      recurveChildren(children) {
        children.map(item => {
          item.selected = false;
          item.children = this.recurveChildren(item.children)
        })
        return children
      },
      handleJsonClick(e) {
        this.jsonData.map(item => {
          item.selected = false;
          item.children = this.recurveChildren(item.children)
        })
        this.fieldObj = e;
      }
    }
  })
</script>

<template>
  <div class="ll-json-container">
    <div class="json-view f_c">
      <!-- 解决子组件不强制刷新 -->
      <div v-show="forceUpdate"></div>
      <div class="header">视图</div>
      <linlan-json-tree :jsonData="jsonData" :forceUpdate="forceUpdate" class="view-box" v-on:jsonClick="handleJsonClick"></linlan-json-tree>
    </div>
    <div class="json-panel f_c">
      <div class="header">属性</div>
      <div class="panel-box f_c" v-if="fieldObj.dataType && fieldObj.dataType !== 'Object' && fieldObj.dataType !== 'Array'">
        <div class="box-item">
          <div class="item-title">Key</div>
          <div class="item-content">{{fieldObj.name}}</div>
        </div>
        <div class="box-item">
          <div class="item-title">Value</div>
          <div class="item-content">{{fieldObj.value}}</div>
        </div>
        <div class="box-item">
          <div class="item-title">参数类型</div>
          <div class="item-content">
            <linlan-select :options="bodyTypes" v-model:value="fieldObj.dataType" default-value="String" style="width: 100%"/>
          </div>
        </div>
        <template v-if="type == 'request'">
          <div class="box-item">
            <div class="item-title">是否必填</div>
            <div class="item-content">
              <div style="width: 25px; height: 25px;"><linlan-checkbox v-model:value="fieldObj.required"/></div>
            </div>
          </div>
          <div class="box-item">
            <div class="item-title">默认值</div>
            <div class="item-content">
              <linlan-input v-model:value="fieldObj.defaultValue" style="width: 100%"/>
            </div>
          </div>
          <div class="box-item">
            <div class="item-title">验证方式</div>
            <div class="item-content">
              <linlan-select :options="validates" v-model:value="fieldObj.validateType" default-value="pass" style="width: 100%"/>
            </div>
          </div>
          <div class="box-item">
            <div class="item-title">表达式或正则表达式</div>
            <div class="item-content">
              <linlan-input v-model:value="fieldObj.expression" style="width: 100%"/>
            </div>
          </div>
          <div class="box-item">
            <div class="item-title">验证说明</div>
            <div class="item-content">
              <linlan-input v-model:value="fieldObj.error" style="width: 100%"/>
            </div>
          </div>
        </template>

<template v-if="type == 'request'">
          <div class="box-item">
            <div class="item-title">是否必填</div>
            <div class="item-content">
              <div style="width: 25px; height: 25px;"><linlan-checkbox v-model:value="fieldObj.required"/></div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .ll-json-container {
    display: flex;
    flex-direction: row;
    height: 100%;
  }

  .f_c {
    display: flex;
    flex-direction: column;
  }

  .json-view {
    width: 50%;
    margin: 0px 10px;
    border: 1px solid var(--border-color);
    border-top: none;
  }

  .json-view .view-box {
    padding: 5px 0;
    height: 100%;
    overflow: auto;
  }

  .json-panel {
    width: 50%;
    margin: 0px 10px;
    border: 1px solid var(--border-color);
    border-top: none;
    overflow: auto;
  }

  .json-panel .panel-box {
    padding: 5px;
  }

  .json-panel .panel-box .box-item {
    min-height: 35px;
    display: flex;
    flex-direction: row;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
  }
  .json-panel .panel-box .box-item .item-title {
    width: 125px;
  }
  .json-panel .panel-box .box-item .item-content {
    flex: 1;
    word-break: break-all;
  }
  .header {
    height: 30px;
    line-height: 30px;
    font-size: 14px;
    text-align: left;
    padding-left: 20px;
    background-color: var(--background);
    border-bottom: 1px solid var(--border-color);
    width: 100%;
  }
</style>
