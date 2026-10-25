<script lang="ts">
// @ts-nocheck
import { mountSubmenu, closeRoot } from '@/components/common/linlan-contextmenu/mountSubmenu'

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanContextmenuSubmenu',
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
    parentMenus: {
      type: Array,
      default: () => []
    },
    openTrend: {
      type: Array,
      default: () => [1, 1]
    }
  },
  data() {
    return {
      isShow: true,
      submenus: [],
      activeSubmenu: null,
      activeSubmenuIndex: -1,
      isSubmenu: true,
      isTop: false
    }
  },
  mounted() {
    this.isShow = true
    this.isSubmenu = true
    this.isTop = false
    this.$nextTick(() => this.initSelfPosition())
    this.mousewheelListener()
    this.mouseClickListener()
    this.mouseDownListener()
  },
  beforeUnmount() {
    this.removeListener()
  },
  methods: {
    initSelfPosition() {
      const el = this.$el.firstElementChild
      if (!el) return
      const sWidth = el.offsetWidth
      const sHeight = el.offsetHeight
      const winWidth = window.innerWidth
      const winHeight = window.innerHeight
      let left = this.position.x + sWidth > winWidth ? this.position.x - sWidth : this.position.x
      let top = this.position.y + sHeight > winHeight ? this.position.y - sHeight : this.position.y
      this.openTrend = [left === this.position.x ? 1 : -1, top === this.position.y ? 1 : -1]
      el.style.left = (left < 0 ? 0 : left) + 'px'
      el.style.top = (top < 0 ? 0 : top) + 'px'
    },
    enterItem(index, event) {
      if (this.activeSubmenuIndex === index) return
      this.hideSubmenu()
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
        const subEl = proxy.$el.firstElementChild
        const subWidth = subEl.offsetWidth
        const subHeight = subEl.offsetHeight
        const winW = window.innerWidth
        const winH = window.innerHeight
        let x = this.openTrend[0] === 1 ? rect.right : rect.left - subWidth
        let y = rect.top + subHeight > winH ? winH - subHeight : rect.top
        subEl.style.left = (x < 0 ? 0 : x) + 'px'
        subEl.style.top = (y < 0 ? 0 : y) + 'px'
      })
    },
    leaveItem(index) {
      if (this.activeSubmenu && this.activeSubmenuIndex === index) {
        this.hideSubmenu()
      }
    },
    clickItem(item, index, event) {
      if (item.onClick) item.onClick(event)
      closeRoot()
    },
    hideSubmenu() {
      if (this.activeSubmenu) {
        this.activeSubmenu.app.unmount()
        if (this.activeSubmenu.container.parentNode) {
          this.activeSubmenu.container.parentNode.removeChild(this.activeSubmenu.container)
        }
        this.activeSubmenu = null
        this.activeSubmenuIndex = -1
      }
    },
    close() {
      this.hideSubmenu()
      this.removeListener()
    },
    removeListener() {
      document.removeEventListener('mousewheel', this.mousewheel)
      document.removeEventListener('click', this.mouseClick)
      document.removeEventListener('mousedown', this.mouseDown, true)
    },
    mousewheelListener() {
      this.mousewheel = (e) => {
        if (!e.target.closest('.ll-contextmenu')) closeRoot()
      }
      document.addEventListener('mousewheel', this.mousewheel)
    },
    mouseClickListener() {
      this.mouseClick = () => closeRoot()
      document.addEventListener('click', this.mouseClick)
    },
    mouseDownListener() {
      this.mouseDown = (e) => {
        if (!e.target.closest('.ll-contextmenu')) closeRoot()
      }
      document.addEventListener('mousedown', this.mouseDown, true)
    }
  }
})
</script>

<template>
  <div class="linlan-context-menu-container">
    <ul class="ll-contextmenu" :class="commonClass" :style="style">
      <template v-for="(item, index) in menus">
        <li v-if="item.divided" class="ll-contextmenu-divided" :key="'d_' + index"></li>
        <li
          v-else
          :key="index"
          class="ll-contextmenu-item"
          :style="{ cursor: item.disabled ? 'not-allowed' : 'pointer' }"
          @click="item.disabled ? null : clickItem(item, index, $event)"
          @mouseenter="enterItem(index, $event)"
          @mouseleave="leaveItem(index)"
        >
          <i v-if="item.icon" class="ll-icon" :class="item.icon"></i>
          <span class="ll-contextmenu-item-title" :title="item.title">{{ item.title }}</span>
        </li>
      </template>
    </ul>
  </div>
</template>

<style>
.linlan-context-menu-container {
  display: inline-block;
}
.ll-contextmenu {
  position: fixed;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--background);
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px var(--drop-shadow-color);
  z-index: 1000;
  min-width: 120px;
}
.ll-contextmenu-item {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  line-height: 22px;
  color: var(--color);
}
.ll-contextmenu-item:hover {
  background: var(--select-background);
}
.ll-contextmenu-divided {
  height: 1px;
  margin: 4px 0;
  background: var(--border-color);
}
</style>
