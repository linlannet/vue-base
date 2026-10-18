<script lang="ts">
// @ts-nocheck
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanTextIcon',
  props: {
    value: String,
    modelValue: String
  },
  data(){
    return {
      colors: {
        GET: '#249C47',
        POST: '#FFB400',
        DELETE: ['DEL', '#EB2013'],
        PUT: '#097BED',
        'function': ['Fn', '#9012FE']
      }
    }
  },
  computed: {
    currentValue() {
      return this.value !== undefined ? this.value : this.modelValue
    },
    text: function() {
      let color = this.colors[this.currentValue]
      let text = this.currentValue
      if(color !== undefined && Array.isArray(color)) {
        text = color[0]
      }
      return text
    },
    color: function() {
      let color = this.colors[this.currentValue]
      if(color !== undefined && Array.isArray(color)) {
        return color[1]
      }
      return color || 'var(--icon-color)'
    }
  }
})
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="36" height="12" font-size="10" font-weight="bold">
    <text x="16" y="8" :fill="color" style="dominant-baseline: middle;text-anchor:middle;" >{{ text }}</text>
  </svg>
</template>

<style scoped>

</style>