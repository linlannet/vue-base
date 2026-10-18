<script lang="ts">
// @ts-nocheck
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanTextarea',
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
    focus: {
      type: Function,
      default: () => {
      },
    },
  },
})
</script>

<template>
  <textarea :placeholder="placeholder" :value="value" @focus="focus"
            @input="(e) => $emit('update:value', e.target.value)"></textarea>
</template>

<style scoped>
textarea {
  outline: 0;
  line-height: 22px;
  border-radius: 0;
  outline: 0;
  border: 1px solid var(--input-border-color);
  resize: none;
  background: var(--input-background);
  color: var(--input-color)
}

textarea:focus {
  border-color: var(--input-border-foucs-color);
}
</style>