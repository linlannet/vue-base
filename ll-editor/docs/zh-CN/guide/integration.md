# 框架集成

`LLEditor` 核心是一个**框架无关**的 TypeScript 类，不依赖 Vue/React。下面给出三种集成方式。

## Vue 3

当前仓库 `ui/` 下的 `LLEditor.vue` 为演示组件，**未纳入 npm 包导出白名单**。生产集成建议直接用核心类封装一个组件：

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { LLEditor } from 'll-editor'
import 'll-editor/style.css'

const el = ref<HTMLElement | null>(null)
let editor: LLEditor | undefined

onMounted(() => {
  if (!el.value) return
  editor = new LLEditor(el.value, {
    storage: { type: 'local' },
    defaultTheme: 'light',
    locale: 'zh-CN'
  })
})

onBeforeUnmount(() => editor?.dispose())
</script>

<template>
  <div ref="el" style="height: 100%"></div>
</template>
```

## React

```tsx
import { useEffect, useRef } from 'react'
import { LLEditor } from 'll-editor'
import 'll-editor/style.css'

export function Editor() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const editor = new LLEditor(ref.current, { storage: { type: 'local' } })
    return () => editor.dispose()
  }, [])
  return <div ref={ref} style={{ height: '100%' }} />
}
```

## 原生 / 其他框架

直接 `new LLEditor(container, options)` 即可，宿主自行负责挂载与销毁（调用 `dispose()`）。

## 宿主需提供的环境

由于 `monaco-editor` 被 external，宿主必须确保：

1. 通过 importmap 或打包器解析 `monaco-editor`（见 `demo.html` 的 CDN 示例）。
2. 提供 `self.MonacoEnvironment.getWorkerUrl`（Vite 之外使用时），否则 Monaco 语言服务进入降级模式。库仅在该全局对象**未设置**时回退到内置 worker 配置。
