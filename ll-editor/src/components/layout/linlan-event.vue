<script lang="ts">
// @ts-nocheck
import bus from '@/scripts/bus'
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LinlanEvent',
  data() {
    return {
      eventList: [],
    }
  },
  mounted() {
    this.init()
  },
  methods: {
    init(){
      this.eventList = bus.$getStatusLog();
      bus.$on('status', ()=>{
        this.$nextTick(()=> {
          this.eventList = bus.$getStatusLog();
        })
      })
      this.$forceUpdate()
    },
    clearLog(){
      bus.$clearStatusLog()
      this.$nextTick(()=> this.init())
    }
  }
})
</script>

<template>
  <div class="ll-event">
    <div class="ll-layout">
      <div class="not-select ll-sider">
        <div @click="clearLog"><i class="ll-icon ll-icon-clear" /></div>
      </div>
      <div class="ll-layout-container">
        <div class="ll-header ll-table-row">
          <div>时间</div>
          <div>事件内容</div>
        </div>
        <div class="ll-content">
          <div v-for="(item, key) in eventList" :key="'event_' + key" class="ll-table-row content-bg">
            <div>{{ item.timestamp }}</div>
            <div v-html="item.content"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ll-event {
  background: var(--background);
  height: 100%;
  width: 100%;
  position: relative;
  outline: 0;
}

.ll-event .ll-layout {
  height: 100%;
}

.ll-event .ll-layout .ll-content .content-bg span {
  color: var(--toolbox-list-span-color);
}

.ll-event .ll-layout .ll-content .content-bg:nth-child(even) {
  background: var(--table-even-background);
}
.ll-event .ll-layout .ll-content .content-bg:hover {
  background: var(--toolbox-list-hover-background);
}
.ll-layout .ll-table-row{
  display: flex;
}
.ll-layout .ll-table-row > * {
  width: 150px !important;
  background: none;
  padding:0 2px;
}

.ll-layout .ll-table-row > *:last-child {
  flex: 1;
  width: auto;
}
</style>
