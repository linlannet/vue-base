<script lang="ts">
// @ts-nocheck
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanCheckbox',
  props: {
    value: {
      type: [Number,Boolean],
      default: ()=> false
    },
    modelValue: {
      type: [Number,Boolean],
      default: ()=> false
    },
    checkedHalf: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      cboId: new Date().getTime() + '' + Math.floor(Math.random() * 1000)
    }
  },
  mounted() {
  },
  methods: {
    onChange() {
      const v = this.$refs.checkbox.checked;
      this.$emit('update:value', v);
      this.$emit('update:modelValue', v);
      this.$emit('change', v);
    }
  },
})
</script>

<template>
  <div class="ll-checkbox" @click.stop="e=>$emit('click',e)">
    <input :id="cboId" ref="checkbox" type="checkbox" @change="onChange" :checked="value !== undefined ? value : modelValue"/>
    <label :for="cboId" :class="{ checkedHalf: checkedHalf&&value }"/>
  </div>
</template>

<style scoped>
.ll-checkbox {
  width: 100%;
  height: 100%;
  text-align: center;
}

.ll-checkbox input {
  display: none;
}

.ll-checkbox input + label {
  position: relative;
  color: #c9c9c9;
  font-size: 12px;
  height: 24px;
  line-height: 24px;
  width: 24px;
  user-select: none;
  display: inline-block;
}

.ll-checkbox input + label::after {
  display: inline-block;
  background-color: var(--checkbox-background);
  border: 1px solid var(--checkbox-border);
  content: '';
  width: 16px;
  height: 16px;
  line-height: 16px;
  position: absolute;
  top: 2px;
  left: 3px;
  text-align: center;
  font-size: 12px;
  color: var(--checkbox-text-color);
}

.ll-checkbox input:checked + label::after {
  content: "\2714";
  background-color: var(--checkbox-selected-background);
  border-color: var(--checkbox-selected-border);
}
.ll-checkbox input+ label.checkedHalf::after {
  content: "\2501";
}
</style>