import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Library build for ll-editor.
// Vue and monaco-editor are externalized so the host app provides them.
// Note: .d.ts bundling via unplugin-dts is skipped (mirror has no compatible
// version); type safety is enforced by `vue-tsc --noEmit` in build/typecheck.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'LLEditor',
      formats: ['es', 'cjs'],
      fileName: (format) => `ll-editor.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: ['vue', 'monaco-editor', 'monaco-editor/esm/vs/editor/editor.api'],
      output: {
        globals: {
          vue: 'Vue',
          'monaco-editor': 'monaco'
        }
      }
    }
  }
})
