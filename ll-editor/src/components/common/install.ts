// 全局注册 common/ 下的运行时组件，供 linlan-editor 子树（_reference）以 <linlan-xxx> 形式使用。
// 这些组件在 linlan-api 原始工程里通过统一的 install 注册到全局；迁移到 Vue3 后在 demo 入口统一安装。
import LinlanCheckbox from './linlan-checkbox.vue'
import LinlanFile from './linlan-file.vue'
import LinlanInput from './linlan-input.vue'
import LinlanJsonTreeFormat from './linlan-json-tree-format.vue'
import LinlanJsonTree from './linlan-json-tree.vue'
import LinlanJson from './linlan-json.vue'
import LinlanLoading from './linlan-loading.vue'
import LinlanSelect from './linlan-select.vue'
import LinlanStructureArray from './linlan-structure-array.vue'
import LinlanStructureObject from './linlan-structure-object.vue'
import LinlanStructure from './linlan-structure.vue'
import LinlanTextIcon from './linlan-text-icon.vue'
import LinlanTextarea from './linlan-textarea.vue'
import LinlanTreeItem from './linlan-tree-item.vue'
import LinlanTree from './linlan-tree.vue'
import LinlanDialog from './modal/linlan-dialog.vue'

const components = {
  LinlanCheckbox,
  LinlanFile,
  LinlanInput,
  LinlanJsonTreeFormat,
  LinlanJsonTree,
  LinlanJson,
  LinlanLoading,
  LinlanSelect,
  LinlanStructureArray,
  LinlanStructureObject,
  LinlanStructure,
  LinlanTextIcon,
  LinlanTextarea,
  LinlanTreeItem,
  LinlanTree,
  LinlanDialog
}

// 把 PascalCase 转成 kebab-case：LinlanCheckbox -> linlan-checkbox
function toKebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

export function installCommonComponents(app: any): void {
  Object.entries(components).forEach(([name, comp]) => {
    app.component(toKebab(name), comp)
  })
}
