<script setup lang="ts">
import { onMounted, onBeforeUnmount, provide, reactive, ref, shallowRef } from 'vue'
import { LLEditor } from '../core/LLEditor'
import type { LLEditorOptions } from '../core/types'
import { createI18n, type I18n } from '../i18n'
import Toolbar from './Toolbar.vue'
import Tabs from './Tabs.vue'
import Sidebar from './Sidebar.vue'
import BottomPanel from './BottomPanel.vue'
import StatusBar from './StatusBar.vue'

const props = defineProps<{ config?: LLEditorOptions }>()
const editorEl = ref<HTMLElement | null>(null)
const instance = shallowRef<LLEditor>()

const i18n: I18n = createI18n(props.config?.locale ?? 'zh-CN')
const state = reactive({
  openDocs: [] as { id: string; name: string }[],
  activeId: '',
  storedDocs: [] as { id: string; name: string; language: string }[]
})

const dummyApi = {
  getActiveDoc: () => undefined,
  listDocs: () => []
}

const editor = new Proxy({} as LLEditor, {
  get(_, key) {
    const target = instance.value
    if (key === 'getPluginApi') {
      return () => target ? target.getPluginApi() : dummyApi
    }
    if (key === 'list') {
      return () => target ? target.list() : Promise.resolve([])
    }
    if (!target) return undefined
    const value = (target as any)[key]
    return typeof value === 'function' ? value.bind(target) : value
  }
}) as LLEditor

provide('ll-editor', editor)
provide('ll-i18n', i18n)
provide('ll-state', state)

onMounted(() => {
  if (!editorEl.value) return
  instance.value = new LLEditor(editorEl.value, props.config ?? {})

  const sync = () => {
    const docs = instance.value!.getPluginApi().listDocs()
    state.openDocs = docs.map((d) => ({ id: d.id, name: d.name }))
    state.activeId = instance.value!.getPluginApi().getActiveDoc()?.id ?? ''
  }
  instance.value.bus.on('doc:opened', sync)
  instance.value.bus.on('doc:changed', sync)
  instance.value.bus.on('doc:saved', sync)
  instance.value.bus.on('tab:switched', sync)
  instance.value.bus.on('doc:closed', sync)
  sync()
})

onBeforeUnmount(() => instance.value?.dispose())
</script>

<template>
  <div class="ll-editor-root" :data-theme="config?.defaultTheme ?? 'light'">
    <Toolbar />
    <div class="ll-editor-body">
      <Sidebar v-if="config?.showSidebar !== false" />
      <div class="ll-editor-main">
        <Tabs />
        <div ref="editorEl" class="ll-editor-canvas"></div>
        <BottomPanel v-if="config?.showBottomPanel !== false" />
      </div>
    </div>
    <StatusBar />
  </div>
</template>
