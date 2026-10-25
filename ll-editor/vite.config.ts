import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
// @ts-ignore - 项目暂未安装 @types/node
import { fileURLToPath, URL } from 'node:url'

// Library build for ll-editor.
// Vue and monaco-editor are externalized so the host app provides them.
// Note: .d.ts bundling via unplugin-dts is skipped (mirror has no compatible
// version); type safety is enforced by `vue-tsc --noEmit` in build/typecheck.
//
// Dev proxy: forward /magic-api to the real magic-api backend.
// java-magic-api 默认端口 8088、context-path /magic-api。
// Override target with VITE_MAGIC_API_TARGET (e.g. http://localhost:8088).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (globalThis as { process?: { cwd(): string } }).process?.cwd?.() ?? '.', '')
  const target = env.VITE_MAGIC_API_TARGET || 'http://localhost:8088'
  // mode=app：构建可独立部署的编辑器页面（与 java-magic-api 的 magic-editor 同构）
  // 其它 mode：构建可被宿主集成的库（build.lib）
  const isApp = mode === 'app'
  return {
    base: isApp ? './' : undefined,
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
      // magic-api 运行时组件（_reference）采用无扩展名方式引用 .vue（源自 webpack 工程），
      // Vite 默认 resolve.extensions 不含 .vue，这里显式补上以便解析 @/components/common/magic-input 等。
      extensions: ['.vue', '.js', '.mjs', '.ts', '.jsx', '.tsx', '.json']
    },
    server: {
      proxy: {
        '/magic-api': {
          target,
          changeOrigin: true,
          ws: true
        }
      }
    },
    build: isApp
      ? {
          outDir: 'dist-app',
          emptyOutDir: true,
          rollupOptions: {
            output: {
              manualChunks: {
                vue: ['vue'],
                monaco: ['monaco-editor']
              }
            }
          }
        }
      : {
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
  }
})
