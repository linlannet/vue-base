// @ts-nocheck
import { mountSubmenu, setRootClose, closeRoot } from './mountSubmenu'

const linlanContextmenu = (options: any) => mountSubmenu(options)

const LinlanContextmenuPlugin = {
  install(app: any) {
    app.config.globalProperties.$linlanContextmenu = linlanContextmenu
  }
}

export { linlanContextmenu, mountSubmenu, setRootClose, closeRoot, LinlanContextmenuPlugin }
export default LinlanContextmenuPlugin
