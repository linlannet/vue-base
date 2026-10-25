import { createApp } from 'vue'
import LinlanEditorDemo from './LinlanEditorDemo.vue'
import { installCommonComponents } from '@/components/common/install'
import { LinlanModalPlugin } from '@/components/common/modal'
import { LinlanContextmenuPlugin } from '@/components/common/linlan-contextmenu'
// 主题变量（--background / --color 等）与全局样式
import '@/assets/iconfont/iconfont.css'
import '@/assets/index.css'

const app = createApp(LinlanEditorDemo)
installCommonComponents(app)
app.use(LinlanModalPlugin)
app.use(LinlanContextmenuPlugin)

app.mount('#app')
