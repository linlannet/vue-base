<script lang="ts">
// @ts-nocheck
import * as monaco from 'monaco-editor'
import bus from '@/scripts/bus'
import {formatDate, isVisible} from '@/scripts/utils'
import request from '@/api/request'
import contants from '@/scripts/contants'

import { defineComponent, markRaw } from 'vue'
export default defineComponent({
  name: 'LinlanHistory',
  data() {
    return {
      displayText: '',
      timestampes: [],
      currentItem: {},
      scriptEditor: null,
      diffEditor: null,
      scriptModel: null,
      originalModel: null,
      isApi: true
    }
  },
  mounted() {
    // markRaw：Monaco 实例禁止放入 Vue 响应式对象，否则 layout() 触发重渲染死循环
    this.diffEditor = markRaw(monaco.editor.createDiffEditor(this.$refs.diffEditor, {
      enableSplitViewResizing: false,
      minimap: {
        enabled: false,
      },
      folding: false,
      lineDecorationsWidth: 20,
      fixedOverflowWidgets: false,
      renderWhitespace: 'none',
      fontFamily: contants.EDITOR_FONT_FAMILY,
      fontSize: contants.EDITOR_FONT_SIZE,
      fontLigatures: true
    }))
    bus.$on('update-window-size', this.layout)
  },
  methods: {
    open(item) {
      this.currentItem = item
      // 对齐 magic-api 2.1.1（MagicBackupController）：GET /backup?id=<资源id>&timestamp=<毫秒>
      // 返回 JsonBean<String>，data 即 entity.getScript() 的纯脚本字符串，非 JSON 对象
      request
          .send('backup', { id: item.id, timestamp: item.timestamp }, { method: 'get' })
          .success((script) => {
            const text = typeof script === 'string' ? script : ''
            if (!text) {
              this.originalModel = this.scriptModel
              this.diffEditor.setModel({
                original: this.scriptModel,
                modified: this.scriptModel,
              })
              this.layout()
              return
            }
            this.originalModel = markRaw(monaco.editor.createModel(text, 'magicscript'))
            this.diffEditor.setModel({
              original: this.originalModel,
              modified: this.scriptModel,
            })
            this.layout()
          })
    },
    load(timestampes, item, scriptEditor, isApi) {
      this.isApi = isApi;
      this.currentItem = {}
      this.scriptEditor = scriptEditor
      this.scriptModel = markRaw(monaco.editor.createModel(this.scriptEditor.getValue(), 'magicscript'))
      this.originalModel = this.scriptModel;
      // 备份记录来自 GET /backup/{资源id}（Backup 行：createDate 为毫秒、createBy、不含 content）
      this.timestampes = timestampes.map((t) => {
        return {id: item.id, timestamp: t.createDate, dateTime: formatDate(t.createDate), createBy: t.createBy}
      })
      if (this.timestampes.length > 0) {
        this.open(this.timestampes[0])
      }
    },
    layout() {
      this.$nextTick(() => {
        if (isVisible(this.$refs.diffEditor)) {
          this.$nextTick(() => this.diffEditor.layout())
        }
      })
    },
    reset() {
      this.scriptEditor.setValue(this.originalModel.getValue());
    }
  },
})
</script>

<template>
  <div class="ma-history">
    <ul class="not-select">
      <li v-for="(item, key) in timestampes" :key="'history_' + key" :class="{ selected: currentItem === item }"
          @click.stop="open(item)">
        {{ item.dateTime }} ({{item.createBy || 'guest'}})
      </li>
    </ul>
    <div class="version">
      <span class="version-time">{{ currentItem.dateTime }} ({{ currentItem.createBy || 'guest'}})</span>
      <span class="current">当前版本</span>
    </div>
    <div ref="diffEditor" class="diff-editor"></div>
  </div>
</template>

<style scoped>
.ma-history {
  overflow: auto;
  position: relative;
  width: 100%;
  height: 485px;
  border-top: 1px solid var(--border-color);
}

.ma-history ul {
  position: absolute;
  left: 0px;
  width: 210px;
  bottom: 5px;
  top: 0px;
  color: var(--color);
  overflow: auto;
  background: var(--toolbox-background);
}

.ma-history ul li {
  border-bottom: 1px solid var(--border-color);
  height: 20px;
  line-height: 20px;
  padding-left: 5px;
  white-space: nowrap;
}

.ma-history ul li:hover,
.ma-history ul li.selected {
  background: var(--history-select-background);
  color: var(--history-select-color);
}

.ma-history .version {
  position: absolute;
  left: 210px;
  right: 0px;
  line-height: 24px;
  height: 24px;
}

.ma-history .version span {
  float: left;
  display: block;
  padding: 0 10px;
}

.ma-history .version span.current {
  float: right;
}

.ma-history .diff-editor {
  position: absolute;
  left: 210px;
  right: 0px;
  top: 24px;
  bottom: 5px;
}
</style>
