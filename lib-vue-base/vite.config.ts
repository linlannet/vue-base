import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path, { format } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build:{
    outDir:'lib/lib-vue-base',
    target: "modules",
    sourcemap: false,
    lib:{
      name:'index',
      entry:path.resolve(__dirname,'main.ts'),
      fileName:(format)=> `index.${format}.js`
    },
    rollupOptions:{
      external:['axios','vue','pinia'],
      output:{
        globals:{
          vue:'Vue',
          axios:'axios',
          pinia: "pinia"
        }
      }
    }
  }

})
