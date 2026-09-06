<script setup lang="ts">
import { inject } from 'vue'
import type { I18n } from '../i18n'
const i18n = inject<I18n>('ll-i18n')!
</script>

<template>
  <div style="height:160px;border-top:1px solid #e5e7eb;padding:8px 10px;overflow:auto;font-size:12px;color:#57606a">
    {{ i18n.t('bottom.placeholder') }}
  </div>
</template>
