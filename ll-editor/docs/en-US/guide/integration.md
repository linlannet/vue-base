# Framework Integration

The `LLEditor` core is a **framework-agnostic** TypeScript class with no Vue/React dependency. Three integration patterns are shown below.

## Vue 3

The `LLEditor.vue` under `ui/` is a demo component and is **not** part of the npm export whitelist. For production, wrap the core class in your own component:

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

## Vanilla / other frameworks

Just `new LLEditor(container, options)`. The host owns mounting and teardown (call `dispose()`).

## What the host must provide

Because `monaco-editor` is externalized, the host must ensure:

1. `monaco-editor` resolves via importmap or a bundler (see the CDN example in `demo.html`).
2. `self.MonacoEnvironment.getWorkerUrl` is provided (when used outside Vite), otherwise Monaco's language services run in degraded mode. The library only falls back to its built-in worker config when this global object is **unset**.
