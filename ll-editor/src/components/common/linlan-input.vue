<script lang="ts">
// @ts-nocheck
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanInput',
  props: {
    type: {
      type: String,
      default: 'text',
    },
    placeholder: {
      type: String,
      default: '',
    },
    value: String,
    modelValue: String,
    readonly: {
      type: Boolean,
      default: false
    },
    focus: {
      type: Function,
      default: () => {
      },
    },
    width: {
      type: String
    },
    icon: {
      type: String
    },
    onClick: {
      type: Function,
      default: () => {
      }
    },
    onEnter: {
      type: Function,
      default: () => {
      }
    }
  },
})
</script>

<template>
  <div @click="onClick" :style="{width}">
    <input :readonly="readonly" :placeholder="placeholder" :type="type" :value="value !== undefined ? value : modelValue" @focus="focus"
           @input="(e) => { const v = e.target.value; $emit('update:value', v); $emit('update:modelValue', v); $emit('input', v) }"
           @keyup.enter.stop="onEnter"/>
    <span v-if="icon"><i :class="'ll-icon ll-icon-' + icon"/></span>
  </div>
</template>

<style scoped>
input {
  outline: 0;
  height: 22px;
  line-height: 22px;
  border-radius: 0;
  outline: 0;
  border: 1px solid var(--input-border-color);
  padding-left: 5px;
  background: var(--input-background);
  color: var(--color);
  width: 100%;
}

input:focus {
  border-color: var(--input-border-foucs-color);
}

div {
  position: relative;
  display: inline-block;
}

span {
  position: absolute;
  right: 5px;
  color: var(--icon-color);
  cursor: pointer;
}

</style>