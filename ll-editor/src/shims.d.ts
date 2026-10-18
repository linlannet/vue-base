declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '*.js' {
  const content: any
  export default content
  export const getQueryVariable: any
  export const replaceURL: any
  export const defineTheme: any
  export const mountSubmenu: any
  export const COMPONENT_NAME: any
  export const util: any
  export const constant: any
}

declare module '*?worker' {
  const workerConstructor: {
    new (): Worker
  }
  export default workerConstructor
}

declare module '@/components/common/modal' {
  const modal: any
  export const LinlanModalPlugin: any
  export default modal
}

declare module '@/components/common/linlan-contextmenu' {
  export const LinlanContextmenuPlugin: any
  export const ContextmenuProxy: any
  export const closeRoot: any
  const LinlanContextmenuPluginDefault: any
  export default LinlanContextmenuPluginDefault
}

import type { ComponentCustomProperties } from 'vue'

declare module 'vue' {
  interface ComponentCustomProperties {
    $linlanAlert: (options: any) => any
    $linlanConfirm: (options: any) => any
    $linlanContextmenu: (options: any) => any
  }
}
