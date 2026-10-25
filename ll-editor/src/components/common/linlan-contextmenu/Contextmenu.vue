<script lang="ts">
// @ts-nocheck
import { mountSubmenu } from '@/components/common/linlan-contextmenu/mountSubmenu'
import { COMPONENT_NAME } from '@/components/common/linlan-contextmenu/constant'

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanContextmenu',
  props: {
    menus: {
      type: Array,
      default: () => []
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    },
    commonClass: {
      type: Object,
      default: () => ({})
    },
    customClass: {
      type: String,
      default: ''
    },
    style: {
      type: Object,
      default: () => ({ minWidth: '120px', zIndex: 1000 })
    },
    destroy: {
      type: Function,
      default: null
    }
  },
  data() {
    return {
      isShow: true,
      openTrend: [1, 1],
      isSubmenu: false,
      parentMenus: [],
      container: null,
      activeSubmenu: null,
      activeSubmenuIndex: -1,
      mainMenuInstance: null,
      mainMenuApp: null,
      mainMenuContainer: null,
      isTop: true
    }
  },
  mounted() {
    this.commonClass = {
      'll-contextmenu': true,
      [this.customClass]: this.customClass
    }
    this.isShow = true
    this.openTrend = [1, 1]
    this.isSubmenu = false
    this.parentMenus = []
    this.isTop = true
    this.style = this.style || { minWidth: '120px', zIndex: 1000 }
    const { app, proxy, container } = mountSubmenu({
      menus: this.menus,
      position: this.position,
      commonClass: this.commonClass,
      customClass: this.customClass,
      style: this.style,
      openTrend: this.openTrend
    })
    this.mainMenuInstance = proxy
    this.mainMenuApp = app
    this.mainMenuContainer = container
    this.container = container
    // 顶层的 Contextmenu 自身不渲染 DOM，真正的菜单由 mainMenuInstance 承载
    if (this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el)
    }
    this.mousewheelListener()
    this.mouseClickListener()
    this.mouseDownListener()
    this.initSubmenuPosition(this.mainMenuInstance)
  },
  methods: {
    initSubmenuPosition(instance) {
      const sWidth = instance.$el.offsetWidth
      const sHeight = instance.$el.offsetHeight
      const winWidth = window.innerWidth
      const winHeight = window.innerHeight
      const left = this.position.x + sWidth > winWidth ? this.position.x - sWidth : this.position.x
      const top = this.position.y + sHeight > winHeight ? this.position.y - sHeight : this.position.y
      this.openTrend = [left === this.position.x ? 1 : -1, top === this.position.y ? 1 : -1]
      instance.position.x = left
      instance.position.y = top
      instance.openTrend = this.openTrend
    },
    enterItem(index, event) {
      if (this.activeSubmenuIndex === index) return
      if (this.activeSubmenu) {
        this.activeSubmenu.app.unmount()
        if (this.activeSubmenu.container.parentNode) {
          this.activeSubmenu.container.parentNode.removeChild(this.activeSubmenu.container)
        }
        this.activeSubmenu = null
        this.activeSubmenuIndex = -1
      }
      const menuItem = this.menus[index]
      if (!menuItem.children || menuItem.children.length === 0) return
      const { app, proxy, container } = mountSubmenu({
        menus: menuItem.children,
        position: { x: 0, y: 0 },
        commonClass: this.commonClass,
        customClass: this.customClass,
        style: this.style,
        parentMenus: this.parentMenus.concat(menuItem),
        openTrend: this.openTrend
      })
      this.activeSubmenu = { app, proxy, container }
      this.activeSubmenuIndex = index
      this.$nextTick(() => {
        const rect = event.currentTarget.getBoundingClientRect()
        const sub = this.activeSubmenu.proxy
        const subEl = sub.$el
        const subWidth = subEl.offsetWidth
        const subHeight = subEl.offsetHeight
        const winW = window.innerWidth
        const winH = window.innerHeight
        const x = this.openTrend[0] === 1 ? rect.right : rect.left - subWidth
        const y = rect.top + rect.height > winH ? winH - subHeight : rect.top
        sub.position.x = x < 0 ? 0 : x
        sub.position.y = y < 0 ? 0 : y
      })
    },
    leaveItem(index) {
      if (this.activeSubmenu && this.activeSubmenuIndex === index) {
        this.activeSubmenu.app.unmount()
        if (this.activeSubmenu.container.parentNode) {
          this.activeSubmenu.container.parentNode.removeChild(this.activeSubmenu.container)
        }
        this.activeSubmenu = null
        this.activeSubmenuIndex = -1
      }
    },
    close() {
      if (this.activeSubmenu) {
        this.activeSubmenu.app.unmount()
        if (this.activeSubmenu.container.parentNode) {
          this.activeSubmenu.container.parentNode.removeChild(this.activeSubmenu.container)
        }
        this.activeSubmenu = null
      }
      if (this.mainMenuApp) {
        this.mainMenuApp.unmount()
        if (this.mainMenuContainer && this.mainMenuContainer.parentNode) {
          this.mainMenuContainer.parentNode.removeChild(this.mainMenuContainer)
        }
      }
      this.removeListener()
      this.$emit('destroy')
    },
    removeListener() {
      document.removeEventListener('mousewheel', this.mousewheel)
      document.removeEventListener('click', this.mouseClick)
      document.removeEventListener('mousedown', this.mouseDown, true)
    },
    mousewheelListener() {
      this.mousewheel = (e) => {
        if (!e.target.closest('.ll-contextmenu')) this.close()
      }
      document.addEventListener('mousewheel', this.mousewheel)
    },
    mouseClickListener() {
      this.mouseClick = () => this.close()
      document.addEventListener('click', this.mouseClick)
    },
    mouseDownListener() {
      this.mouseDown = (e) => {
        if (!e.target.closest('.ll-contextmenu')) this.close()
      }
      document.addEventListener('mousedown', this.mouseDown, true)
    }
  }
})
</script>

<template>
  <div class="ll-contextmenu-wrapper"></div>
</template>

<style>
.ll-contextmenu-wrapper {
  display: none;
}
</style>
