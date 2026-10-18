<script lang="ts">
// @ts-nocheck
import LinlanStructureArray from '@/components/common/linlan-structure-array'
import LinlanStructureObject from '@/components/common/linlan-structure-object'

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanStructure',
  props: {
    data: String,
    type: String
  },
  data() {
    let displayText = (this.type || '').startsWith('java.lang');
    let jsonObject;
    let dataType;
    if (!displayText) {
      jsonObject = this.data && JSON.parse(this.data);
      if (!Array.isArray(jsonObject) && typeof jsonObject !== 'object') {
        displayText = true
        dataType = typeof jsonObject
      }
    } else {
      dataType = this.type.substring(10).toLowerCase()
    }
    return {
      dataType,
      displayText,
      jsonData: displayText ? null : jsonObject
    }
  },
  components: {
    LinlanStructureObject,
    LinlanStructureArray
  },
})
</script>

<template>
  <div class="ma-structure-container">
    <span :class="dataType" v-if="displayText">{{ data }}</span>
    <span class="boolean" v-else-if="!type">null</span>
    <linlan-structure-array v-else-if="Array.isArray(jsonData)" :data="jsonData"/>
    <linlan-structure-object v-else :data="jsonData"/>
  </div>
</template>

<style>
.ll-structure-container {
  display: flex;
  flex-direction: row;
  height: 100%;
  font-size: 14px;
}

.ll-structure-container label {
  padding-right: 2px;
}

.ll-structure-container span {
  display: inline-block;
  color: var(--color);
}

.ll-structure-container .number {
  color: var(--text-number-color);
  font-weight: bold;
}

.ll-structure-container .string {
  color: var(--text-string-color);
  font-weight: bold;
}

.ll-structure-container .boolean {
  color: var(--text-boolean-color);
  font-weight: bold;
}

.ll-structure-container .property,.ll-structure-container .class {
  color: var(--text-key-color);
  font-weight: bold;
}

.ll-structure-container .ll-icon {
  font-size: 12px;
  color: var(--color);
}
</style>
