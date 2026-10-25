<script lang="ts">
import store from '@/scripts/store'
import LinlanInput from '@/components/common/linlan-input.vue'

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanSettings',
  props: {
    message: String
  },
  components: {
    LinlanInput
  },
  data() {
    let parameters = JSON.parse(store.get('global-parameters') || '[]')
    let headers = JSON.parse(store.get('global-headers') || '[]')
    return {
      parameters,
      headers,
      navs: ['全局请求参数', '全局请求Header'],
      showIndex: 0,
      parameterIndex: 0,
      headerIndex: 0
    }
  },
  methods: {
    save() {
      store.set('global-parameters', this.parameters)
      store.set('global-headers', this.headers)
    },
    addRow() {
      if (this.showIndex == 0) {
        this.parameters.push({name: '', value: '', description: ''})
        this.parameterIndex = this.parameters.length - 1
      } else if (this.showIndex == 1) {
        this.headers.push({name: '', value: '', description: ''})
        this.headerIndex = this.headers.length - 1
      }
      this.$forceUpdate()
    },
    removeRow() {
      if (this.showIndex == 0) {
        this.parameters.splice(this.parameterIndex, 1)
        if (this.parameters.length == 0) {
          this.parameterIndex = 0
          this.addRow()
        } else if (this.parameters.length <= this.parameterIndex) {
          this.parameterIndex = this.parameters.length - 1
        }
      } else if (this.showIndex == 1) {
        this.headers.splice(this.headerIndex, 1)
        if (this.headers.length == 0) {
          this.headerIndex = 0
          this.addRow()
        } else if (this.headers.length <= this.headerIndex) {
          this.headerIndex = this.headers.length - 1
        }
      }
      this.$forceUpdate()
    }
  },
  watch: {
    headers: {
      deep: true,
      handler() {
        this.save()
      }
    },
    parameters: {
      deep: true,
      handler() {
        this.save()
      }
    }
  }
})
</script>

<template>
  <div class="ll-settings">
    <ul class="ll-nav not-select">
      <li v-for="(item, key) in navs" :key="'response_item_' + key" :class="{ selected: showIndex == key }"
          @click="showIndex = key">
        {{ item }}
      </li>
    </ul>
    <div class="ll-layout">
      <div v-if="showIndex < 2" class="not-select ll-sider">
        <div @click="addRow"><i class="ll-icon ll-icon-plus"/></div>
        <div @click="removeRow"><i class="ll-icon ll-icon-minus"/></div>
      </div>
      <div v-if="showIndex === 0" class="ll-layout-container">
        <div class="ll-header ll-table-row">
          <div>键</div>
          <div>值</div>
          <div>描述</div>
        </div>
        <div class="ll-content">
          <div v-for="(item, key) in parameters" :key="'request_parameter_' + key" class="ll-table-row">
            <div :class="{ focus: parameterIndex === key && !item.name }">
              <linlan-input :focus="() => (parameterIndex = key)" v-model:value="item.name" style="width: 100%"/>
            </div>
            <div>
              <linlan-input :focus="() => (parameterIndex = key)" v-model:value="item.value" style="width: 100%"/>
            </div>
            <div>
              <linlan-input :focus="() => (parameterIndex = key)" v-model:value="item.description" style="width: 100%"/>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showIndex === 1" class="ll-layout-container">
        <div class="ll-header ll-table-row">
          <div>键</div>
          <div>值</div>
          <div>描述</div>
        </div>
        <div class="ll-content">
          <div v-for="(item, key) in headers" :key="'request_header_' + key" class="ll-table-row">
            <div :class="{ focus: headerIndex === key && !item.name }">
              <linlan-input :focus="() => (headerIndex = key)" v-model:value="item.name" style="width: 100%"/>
            </div>
            <div>
              <linlan-input :focus="() => (headerIndex = key)" v-model:value="item.value" style="width: 100%"/>
            </div>
            <div>
              <linlan-input :focus="() => (headerIndex = key)" v-model:value="item.description" style="width: 100%"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ll-settings {
  background: var(--background);
  height: 100%;
  width: 100%;
  position: relative;
  outline: 0;
}

.ll-settings .ll-layout {
  height: calc(100% - 25px);
}
</style>
