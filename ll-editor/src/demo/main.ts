import { createApp } from 'vue'
import LLEditor from '@/components/LLEditor.vue'
// 引入 common/ 组件（ll-icon 等）图标生效（已包含蓝色线性图标覆盖）
import '@/assets/iconfont/iconfont.css'
import '@/assets/index.css'
import { LinlanModalPlugin } from '@/components/common/modal'
import { LinlanContextmenuPlugin } from '@/components/common/linlan-contextmenu'

// 注册 linlan-editor 运行时全局能力（this.$linlanAlert / this.$linlanConfirm / this.$linlanContextmenu 等）
// demo 跳过后端版本一致性校验（demo 前端无注入版本号，避免每次刷新弹「检测到新版本」）
const app = createApp(LLEditor, { Config: { ignoreVersion: true } })
app.use(LinlanModalPlugin)
app.use(LinlanContextmenuPlugin)
app.mount('#app')