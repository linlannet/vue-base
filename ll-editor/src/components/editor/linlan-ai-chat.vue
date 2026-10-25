<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { I18n } from '@/i18n'
import { modal } from '@/components/common/modal/index'
import LinlanDialog from '@/components/common/modal/linlan-dialog.vue'
import LinlanInput from '@/components/common/linlan-input.vue'
import { renderMarkdown } from '@/languages/preview'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}

interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

interface AiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

const props = defineProps<{
  kbId?: string
  fileName?: string
  fileContent?: string
  /** 当前打开的全部文件（md / py / java / txt 等），一并作为上下文参与问答 */
  files?: { name: string; content: string }[]
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const i18n = inject<I18n>('ll-i18n')!
const createKbFile = inject<(name: string, content: string) => string | null>('ll-ai-create-file', () => null)

const CONFIG_KEY = 'll-ai-config'
const sessionKey = computed(() => `ll-ai-sessions:${props.kbId || 'global'}`)

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback
  } catch {
    return fallback
  }
}

const config = ref<AiConfig>(
  loadJson<AiConfig>(CONFIG_KEY, {
    baseUrl: '',
    apiKey: '',
    model: ''
  })
)

const sessions = ref<ChatSession[]>([])
const activeId = ref('')
const draft = ref('')
const sending = ref(false)
const error = ref('')
const showSettings = ref(false)
const showHistory = ref(false)
// 输入卡片左下「+」菜单
const plusOpen = ref(false)
const listEl = ref<HTMLDivElement | null>(null)
const settingsDraft = ref<AiConfig>({ ...config.value })

const activeSession = computed(() => sessions.value.find((s) => s.id === activeId.value) ?? null)
const messages = computed(() => activeSession.value?.messages ?? [])

function loadSessions(): void {
  try {
    const raw = localStorage.getItem(sessionKey.value)
    sessions.value = raw ? (JSON.parse(raw) as ChatSession[]) : []
  } catch {
    sessions.value = []
  }
  if (!sessions.value.length) {
    createSession()
  } else {
    activeId.value = [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)[0]!.id
  }
}

function saveSessions(): void {
  try {
    localStorage.setItem(sessionKey.value, JSON.stringify(sessions.value))
  } catch {
    /* 本地存储不可用时忽略 */
  }
}

function createSession(): void {
  const session: ChatSession = {
    id: genId('s'),
    title: i18n.t('ai.newSessionTitle'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: []
  }
  sessions.value.unshift(session)
  activeId.value = session.id
  saveSessions()
}

function switchSession(id: string): void {
  activeId.value = id
  showHistory.value = false
  nextTick(scrollToBottom)
}

function deleteSession(id: string): void {
  modal.linlanConfirm(i18n.t('ai.confirmDeleteSession'), () => {
    const idx = sessions.value.findIndex((s) => s.id === id)
    if (idx < 0) return
    sessions.value.splice(idx, 1)
    if (!sessions.value.length) {
      createSession()
    } else if (activeId.value === id) {
      activeId.value = sessions.value[0]!.id
    }
    saveSessions()
  })
}

function scrollToBottom(): void {
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

function openSettings(): void {
  settingsDraft.value = { ...config.value }
  showSettings.value = true
}

function saveSettings(): void {
  config.value = { ...settingsDraft.value }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config.value))
  showSettings.value = false
  error.value = ''
}

function endpoint(): string {
  const base = config.value.baseUrl.trim().replace(/\/+$/, '')
  return /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`
}

// 多文件上下文的规模限制：文件数与单文件字符数，避免超出模型上下文
const MAX_CONTEXT_FILES = 6
const PER_FILE_CHARS = 2500

/** 打开的全部文件摘要：md/py/java/txt 等一律按「文件名 + 内容片段」平铺给模型 */
function contextSummary(): string {
  const list = (props.files ?? []).filter((f) => f && f.content)
  if (!list.length) return ''
  const picked = list.slice(0, MAX_CONTEXT_FILES)
  const body = picked.map((f) => `### ${f.name}\n${f.content.slice(0, PER_FILE_CHARS)}`).join('\n\n')
  const more =
    list.length > picked.length ? `\n\n…（其余 ${list.length - picked.length} 个文件已省略）` : ''
  return `${i18n.t('ai.contextFiles').replace('{n}', String(list.length))}\n\n${body}${more}`
}

function buildSystemPrompt(): string {
  const file = props.fileName ? `【${props.fileName}】` : ''
  const content = (props.fileContent ?? '').slice(0, 6000)
  return [
    i18n.t('ai.systemPrompt'),
    content ? `${i18n.t('ai.currentFile')}${file}\n${content}` : '',
    contextSummary()
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildRequestMessages(): Array<{ role: string; content: string }> {
  const history = (activeSession.value?.messages ?? [])
    .filter((m) => m.content)
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }))
  return [{ role: 'system', content: buildSystemPrompt() }, ...history]
}

async function send(): Promise<void> {
  const text = draft.value.trim()
  if (!text || sending.value) return
  if (!config.value.baseUrl.trim() || !config.value.model.trim()) {
    error.value = i18n.t('ai.notConfigured')
    openSettings()
    return
  }
  let session = activeSession.value
  if (!session) {
    createSession()
    session = activeSession.value
  }
  if (!session) return
  session.messages.push({ id: genId('m'), role: 'user', content: text, ts: Date.now() })
  if (session.messages.filter((m) => m.role === 'user').length === 1) {
    session.title = text.replace(/\s+/g, ' ').slice(0, 24) || i18n.t('ai.newSessionTitle')
  }
  session.updatedAt = Date.now()
  draft.value = ''
  error.value = ''
  sending.value = true
  saveSessions()
  nextTick(scrollToBottom)

  const payload = buildRequestMessages()
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (config.value.apiKey.trim()) headers.Authorization = `Bearer ${config.value.apiKey.trim()}`
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: config.value.model.trim(), messages: payload, temperature: 0.6 })
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} ${res.statusText}${body ? ` - ${body.slice(0, 200)}` : ''}`)
    }
    const data = await res.json()
    const content: string = data?.choices?.[0]?.message?.content ?? ''
    if (!content) throw new Error(i18n.t('ai.emptyResponse'))
    session.messages.push({ id: genId('m'), role: 'assistant', content, ts: Date.now() })
  } catch (e) {
    error.value = `${i18n.t('ai.errorPrefix')}${(e as Error)?.message ?? e}`
  } finally {
    sending.value = false
    session.updatedAt = Date.now()
    saveSessions()
    nextTick(scrollToBottom)
  }
}

function toMarkdown(content: string): string {
  return renderMarkdown(content)
}

function saveToKb(message: ChatMessage): void {
  const firstLine =
    message.content
      .split('\n')
      .map((l) => l.replace(/^#+\s*/, '').trim())
      .find(Boolean) ?? i18n.t('ai.assistant')
  const name = `${firstLine.replace(/[\\/:*?"<>|]/g, '').slice(0, 20) || 'AI'}.md`
  const saved = createKbFile(name, message.content)
  if (saved) {
    modal.linlanAlert(`${i18n.t('ai.saved')}：${saved}`, {})
  } else {
    modal.linlanAlert(i18n.t('ai.saveFailed'), {})
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString()
}

onMounted(() => {
  loadSessions()
  document.addEventListener('click', onDocClick, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick, true)
})
watch(sessionKey, loadSessions)

function onDocClick(e: MouseEvent): void {
  const t = e.target as HTMLElement | null
  if (!t?.closest('.ll-ai-plus')) plusOpen.value = false
}

/** 清空当前会话消息 */
function clearSession(): void {
  const s = activeSession.value
  if (!s || !s.messages.length) return
  s.messages.length = 0
  s.updatedAt = Date.now()
  saveSessions()
  plusOpen.value = false
}
</script>

<template>
  <div class="ll-ai-chat">
    <div class="ll-ai-chat-head not-select">
      <span class="ll-ai-chat-title">
        <svg class="ll-ai-chat-logo" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.5l1.9 4.9 4.9 1.9-4.9 1.9L12 16.1l-1.9-4.9L5.2 9.3l4.9-1.9L12 2.5z"
            fill="currentColor"
          />
          <path d="M19 14.4l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" fill="currentColor" />
        </svg>
        {{ i18n.t('ai.title') }}
      </span>
      <span v-if="(files || []).length" class="ll-ai-chat-ctx">{{ (files || []).length }} files</span>
      <span class="ll-ai-chat-ctx model" :title="config.model || i18n.t('ai.notConfiguredShort')">
        {{ config.model || i18n.t('ai.notConfiguredShort') }}
      </span>
      <div class="ll-ai-chat-actions">
        <button :title="i18n.t('ai.newSession')" @click="createSession">
          <i class="ll-icon ll-icon-plus" />
        </button>
        <button :title="i18n.t('ai.history')" @click="showHistory = true">
          <i class="ll-icon ll-icon-history" />
        </button>
        <button :title="i18n.t('ai.settings')" @click="openSettings">
          <i class="ll-icon ll-icon-settings" />
        </button>
        <button :title="i18n.t('ai.close')" @click="emit('close')">
          <i class="ll-icon ll-icon-close" />
        </button>
      </div>
    </div>

    <div ref="listEl" class="ll-ai-chat-body">
      <div v-if="!messages.length && !sending" class="ll-ai-chat-empty">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.5l1.9 4.9 4.9 1.9-4.9 1.9L12 16.1l-1.9-4.9L5.2 9.3l4.9-1.9L12 2.5z"
            fill="currentColor"
          />
        </svg>
        <p>{{ i18n.t('ai.empty') }}</p>
      </div>
      <div v-for="m in messages" :key="m.id" class="ll-ai-msg" :class="m.role">
        <div class="ll-ai-msg-role">{{ m.role === 'user' ? i18n.t('ai.you') : i18n.t('ai.assistant') }}</div>
        <div class="ll-ai-msg-bubble">
          <div v-if="m.role === 'assistant'" class="ll-ai-msg-md" v-html="toMarkdown(m.content)"></div>
          <div v-else class="ll-ai-msg-text">{{ m.content }}</div>
          <div v-if="m.role === 'assistant' && m.content" class="ll-ai-msg-tools">
            <button @click="saveToKb(m)">
              <i class="ll-icon ll-icon-save" />
              {{ i18n.t('ai.saveToKb') }}
            </button>
          </div>
        </div>
      </div>
      <div v-if="sending" class="ll-ai-msg assistant">
        <div class="ll-ai-msg-role">{{ i18n.t('ai.assistant') }}</div>
        <div class="ll-ai-msg-bubble ll-ai-thinking">{{ i18n.t('ai.thinking') }}</div>
      </div>
    </div>

    <div v-if="error" class="ll-ai-error">{{ error }}</div>

    <!-- 输入卡片：大圆角淡蓝卡片，工具行内置（+ 菜单 / 模型 / 发送） -->
    <div class="ll-ai-composer">
      <div class="ll-ai-composer-card">
        <textarea
          v-model="draft"
          class="ll-ai-input"
          rows="3"
          :placeholder="i18n.t('ai.placeholder')"
          @keydown.enter.exact.prevent="send"
        />
        <div class="ll-ai-composer-tools">
          <div class="ll-ai-plus">
            <button class="ll-ai-tool-btn" :title="i18n.t('ai.newSession')" @click.stop="plusOpen = !plusOpen">+</button>
            <ul v-show="plusOpen" class="ll-ai-plus-menu" @click.stop>
              <li @click="createSession(); plusOpen = false">
                <i class="ll-icon ll-icon-plus" />{{ i18n.t('ai.newSession') }}
              </li>
              <li @click="showHistory = true; plusOpen = false">
                <i class="ll-icon ll-icon-history" />{{ i18n.t('ai.history') }}
              </li>
              <li @click="openSettings(); plusOpen = false">
                <i class="ll-icon ll-icon-settings" />{{ i18n.t('ai.settings') }}
              </li>
              <li class="danger" @click="clearSession">
                <i class="ll-icon ll-icon-delete" />{{ i18n.t('ai.clearSession') }}
              </li>
            </ul>
          </div>
          <span class="ll-ai-tools-right">
            <button class="ll-ai-model-pill" :title="config.model || i18n.t('ai.notConfiguredShort')" @click="openSettings">
              <i class="ll-icon ll-icon-settings" />{{ config.model || i18n.t('ai.notConfiguredShort') }}
              <b>▾</b>
            </button>
            <button
              class="ll-ai-send-btn"
              :disabled="sending || !draft.trim()"
              :title="sending ? i18n.t('ai.thinkingShort') : i18n.t('ai.send')"
              @click="send"
            >
              <i class="ll-icon ll-icon-arrow-bottom" />
            </button>
          </span>
        </div>
      </div>
      <!-- 卡片下方信息行 -->
      <div class="ll-ai-composer-sub not-select">
        <span class="ll-ai-sub-item" @click="showHistory = true">
          <i class="ll-icon ll-icon-history" />{{ i18n.t('ai.history') }} ({{ sessions.length }})
        </span>
        <span class="ll-ai-sub-item danger" @click="clearSession">
          <i class="ll-icon ll-icon-delete" />{{ i18n.t('ai.clearSession') }}
        </span>
      </div>
    </div>

    <!-- AI 接口设置 -->
    <linlan-dialog
      :title="i18n.t('ai.configTitle')"
      :value="showSettings"
      align="right"
      width="460px"
      height="440px"
      @onClose="showSettings = false"
    >
      <template #content>
        <div class="ll-ai-form">
          <label>{{ i18n.t('ai.baseUrl') }}</label>
          <linlan-input v-model:value="settingsDraft.baseUrl" placeholder="https://api.openai.com/v1" />
          <p class="ll-ai-form-hint">{{ i18n.t('ai.baseUrlHint') }}</p>
        </div>
        <div class="ll-ai-form">
          <label>{{ i18n.t('ai.model') }}</label>
          <linlan-input v-model:value="settingsDraft.model" placeholder="gpt-4o-mini" />
        </div>
        <div class="ll-ai-form">
          <label>{{ i18n.t('ai.apiKey') }}</label>
          <linlan-input v-model:value="settingsDraft.apiKey" type="password" placeholder="sk-..." />
        </div>
        <p class="ll-ai-form-hint">{{ i18n.t('ai.configHint') }}</p>
      </template>
      <template #buttons>
        <button class="ll-button active" @click="saveSettings">{{ i18n.t('ai.confirm') }}</button>
        <button class="ll-button" @click="showSettings = false">{{ i18n.t('ai.cancel') }}</button>
      </template>
    </linlan-dialog>

    <!-- 历史会话 -->
    <linlan-dialog
      :title="i18n.t('ai.history')"
      :value="showHistory"
      align="right"
      width="420px"
      height="480px"
      @onClose="showHistory = false"
    >
      <template #content>
        <div v-if="!sessions.length" class="ll-ai-history-empty">{{ i18n.t('ai.sessionEmpty') }}</div>
        <div v-else class="ll-ai-history">
          <div
            v-for="s in sessions"
            :key="s.id"
            class="ll-ai-history-item"
            :class="{ active: s.id === activeId }"
            @click="switchSession(s.id)"
          >
            <div class="ll-ai-history-main">
              <span class="ll-ai-history-title">{{ s.title }}</span>
              <span class="ll-ai-history-time">{{ formatTime(s.updatedAt) }}</span>
            </div>
            <button class="ll-ai-history-del" :title="i18n.t('ai.deleteSession')" @click.stop="deleteSession(s.id)">
              <i class="ll-icon ll-icon-delete" />
            </button>
          </div>
        </div>
      </template>
    </linlan-dialog>
  </div>
</template>

<style scoped>
.ll-ai-chat {
  flex: none;
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid var(--border-color, #e5e7eb);
  font-size: 12px;
  color: #24292f;
}

.ll-ai-chat-head {
  flex: none;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 10px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  background: #f8fafc;
}

.ll-ai-chat-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: bold;
  color: #1f2328;
}

.ll-ai-chat-logo {
  width: 14px;
  height: 14px;
  color: var(--ll-icon-blue, #2f8ef7);
}

.ll-ai-chat-ctx {
  margin-left: auto;
  margin-right: 4px;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
  border-radius: 9px;
  background: #e7f0ff;
  color: #2563eb;
  font-size: 11px;
}

.ll-ai-chat-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.ll-ai-chat-actions button {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #57606a;
  cursor: pointer;
}

.ll-ai-chat-actions button:hover {
  background: #e8edf3;
  color: var(--ll-icon-blue, #2f8ef7);
}

.ll-ai-chat-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px;
  background: #fff;
}

.ll-ai-chat-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8b949e;
  text-align: center;
  padding: 0 18px;
}

.ll-ai-chat-empty svg {
  width: 26px;
  height: 26px;
  color: #b9d6ff;
}

.ll-ai-msg {
  margin-bottom: 10px;
}

.ll-ai-msg-role {
  font-size: 11px;
  color: #8b949e;
  margin-bottom: 3px;
}

.ll-ai-msg-bubble {
  border-radius: 6px;
  padding: 7px 9px;
  line-height: 1.55;
  word-break: break-word;
}

.ll-ai-msg.user .ll-ai-msg-bubble {
  background: #e7f0ff;
  border: 1px solid #c9ddff;
}

.ll-ai-msg.assistant .ll-ai-msg-bubble {
  background: #f6f8fa;
  border: 1px solid #e5e7eb;
}

.ll-ai-msg-text {
  white-space: pre-wrap;
}

.ll-ai-msg-md :deep(p) {
  margin: 0 0 6px;
}

.ll-ai-msg-md :deep(p:last-child) {
  margin-bottom: 0;
}

.ll-ai-msg-md :deep(pre) {
  margin: 6px 0;
  padding: 8px;
  background: #0d1117;
  color: #e6edf3;
  border-radius: 4px;
  overflow: auto;
  font-size: 11px;
}

.ll-ai-msg-md :deep(code) {
  font-family: Menlo, Consolas, monospace;
  font-size: 11px;
}

.ll-ai-msg-md :deep(ul),
.ll-ai-msg-md :deep(ol) {
  margin: 4px 0;
  padding-left: 18px;
}

.ll-ai-msg-tools {
  margin-top: 6px;
  display: flex;
  justify-content: flex-end;
}

.ll-ai-msg-tools button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 7px;
  font-size: 11px;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  background: #fff;
  color: #57606a;
  cursor: pointer;
}

.ll-ai-msg-tools button:hover {
  border-color: var(--ll-icon-blue, #2f8ef7);
  color: var(--ll-icon-blue, #2f8ef7);
}

.ll-ai-thinking {
  color: #8b949e;
}

.ll-ai-thinking::after {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 4px;
  border-radius: 50%;
  background: var(--ll-icon-blue, #2f8ef7);
  animation: ll-ai-blink 1s infinite;
}

@keyframes ll-ai-blink {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}

.ll-ai-error {
  flex: none;
  margin: 0 8px 6px;
  padding: 6px 8px;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  background: #fff2f0;
  color: #cf1322;
  font-size: 11px;
  word-break: break-all;
}

/* ===== 输入卡片：大圆角淡蓝卡片（对齐 Trae 风格截图） ===== */
.ll-ai-composer {
  flex: none;
  padding: 8px 8px 4px;
  background: var(--background, #fff);
}

.ll-ai-composer-card {
  position: relative;
  border: 1px solid #cfe3fb;
  border-radius: 12px;
  background: #f2f8ff;
  padding: 6px 8px 6px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.ll-ai-composer-card:focus-within {
  border-color: var(--ll-primary, #3a8ee6);
  box-shadow: 0 0 0 2px rgba(58, 142, 230, 0.12);
}

.ll-ai-input {
  display: block;
  width: 100%;
  resize: none;
  box-sizing: border-box;
  border: none;
  border-radius: 8px;
  padding: 6px 6px 2px;
  font-size: 12px;
  line-height: 1.5;
  font-family: inherit;
  outline: none;
  background: transparent;
  color: var(--color, #24292f);
}

/* 卡片内工具行：左 +，右 模型 pill + 发送圆钮 */
.ll-ai-composer-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.ll-ai-plus {
  position: relative;
}

.ll-ai-tool-btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #57606a;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.ll-ai-tool-btn:hover {
  background: rgba(58, 142, 230, 0.12);
  color: var(--ll-primary, #3a8ee6);
}

.ll-ai-plus-menu {
  position: absolute;
  left: 0;
  bottom: 30px;
  min-width: 108px;
  margin: 0;
  padding: 3px 0;
  list-style: none;
  background: var(--background, #fff);
  border: 1px solid var(--border-color, #d0d7de);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 30;
}

.ll-ai-plus-menu li {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
  white-space: nowrap;
  color: var(--color, #24292f);
  cursor: pointer;
}

.ll-ai-plus-menu li:hover {
  background: #eef5ff;
}

.ll-ai-plus-menu li.danger {
  color: #cf1322;
}

.ll-ai-plus-menu li.danger:hover {
  background: #fff1f0;
}

.ll-ai-tools-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ll-ai-model-pill {
  max-width: 130px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #57606a;
  font-size: 11px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ll-ai-model-pill:hover {
  background: rgba(58, 142, 230, 0.12);
  color: var(--ll-primary, #3a8ee6);
}

.ll-ai-model-pill b {
  font-size: 9px;
  color: #8b949e;
}

.ll-ai-send-btn {
  flex: none;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #d7e8fc;
  color: var(--ll-primary, #3a8ee6);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.ll-ai-send-btn i {
  transform: rotate(180deg);
}

.ll-ai-send-btn:hover:not(:disabled) {
  background: var(--ll-primary, #3a8ee6);
  color: #fff;
}

.ll-ai-send-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* 卡片下方信息行 */
.ll-ai-composer-sub {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 6px 2px;
}

.ll-ai-sub-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 11px;
  color: #57606a;
  cursor: pointer;
}

.ll-ai-sub-item:hover {
  background: #eef5ff;
  color: var(--ll-primary, #3a8ee6);
}

.ll-ai-sub-item.danger {
  color: #cf1322;
}

.ll-ai-sub-item.danger:hover {
  background: #fff1f0;
}

.ll-ai-chat-ctx.model {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f1f5f9;
  color: #475569;
}

.ll-ai-form {
  padding: 10px 14px 0;
}

.ll-ai-form label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  color: #57606a;
}

.ll-ai-form-hint {
  margin: 5px 0 0;
  font-size: 11px;
  color: #8b949e;
  line-height: 1.4;
}

.ll-ai-history {
  padding: 6px 8px;
}

.ll-ai-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 7px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.ll-ai-history-item:hover {
  background: #f3f4f6;
}

.ll-ai-history-item.active {
  background: #e7f0ff;
}

.ll-ai-history-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ll-ai-history-title {
  font-size: 12px;
  color: #24292f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ll-ai-history-time {
  font-size: 11px;
  color: #8b949e;
}

.ll-ai-history-del {
  flex: none;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  border-radius: 3px;
  color: #8b949e;
  cursor: pointer;
  opacity: 0;
}

.ll-ai-history-item:hover .ll-ai-history-del {
  opacity: 1;
}

.ll-ai-history-del:hover {
  background: #ffe5e5;
  color: #cf1322;
}

.ll-ai-history-empty {
  padding: 40px 0;
  text-align: center;
  color: #8b949e;
}
</style>
