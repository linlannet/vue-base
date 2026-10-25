<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { linlanApi } from '@/api/linlanApi'
import type { LinlanApiEntity } from '@/api/linlanApi'
import type { I18n } from '@/i18n'
import { modal } from '@/components/common/modal/index'
import contants from '@/scripts/contants'
import { formatJson } from '@/scripts/utils'
import LinlanDialog from '@/components/common/modal/linlan-dialog.vue'
import LinlanInput from '@/components/common/linlan-input.vue'
import LinlanSelect from '@/components/common/linlan-select.vue'
import LinlanTextarea from '@/components/common/linlan-textarea.vue'
import LinlanTreeMenu from '@/components/resources/linlan-tree-menu.vue'
import { buildDatasourceMenu, copyToClipboard } from '@/components/resources/treeMenu'
import type { TreeMenuItem } from '@/components/resources/treeMenu'

const i18n = inject<I18n>('ll-i18n')!
// 左键点击数据源：在中间编辑区打开该数据源的 SQL 查询
const openSql = inject<(ds: { id?: string | null; name?: string; key?: string }) => void>('ll-ds-open-sql')!
// modal/index.ts 是 @ts-nocheck 的 JS 模块，参数 arity 未标注；沿用既有约定用 as any 调用
const modalAny = modal as any

// 数据源实体（对齐 backend DataSourceInfo：url/username/password/key/maxRows/driverClassName/type）
interface Datasource {
  id?: string | null
  // 表单绑定字段：LinlanInput 的 value 为 string | undefined，null 会导致模板绑定类型错误
  name?: string | undefined
  key?: string | undefined
  url?: string | undefined
  username?: string | undefined
  password?: string | undefined
  driverClassName?: string | undefined
  type?: string | undefined
  maxRows?: string | undefined
  groupId?: string | null
  [k: string]: unknown
}

// ===== magic-api 2.1.1（third-magic-api）真实端点契约 =====
//   列表：POST /resource 的 datasource 分支（容器节点 datasource:0 下的实体）
//   详情：GET  /resource/file/{id}
//   保存：POST /resource/file/datasource/save（后端 notNull(groupId)，固定 datasource:0）
//   测试：POST /datasource/jdbc/test（data === 'ok' 表示连通，其余为错误信息）
//   删除：POST /resource/delete（表单参数 id）
const DS_GROUP_ID = 'datasource:0'
const SAVE_FOLDER = 'datasource'
// 「其它配置」JSON 之外的固定字段；其余字段原样放入 JSON 编辑区，保存时合并回实体
const KNOWN_KEYS = ['id', 'name', 'key', 'maxRows', 'type', 'driverClassName', 'username', 'password', 'url', 'groupId']

const datasources = ref<Datasource[]>([])
const loading = ref(true)
const error = ref('')
const keyword = ref('')
const showDialog = ref(false)
const saving = ref(false)
const dsObj = ref<Datasource>(newDatasourceObj())
const extraJson = ref('{\r\n\t\r\n}')

function newDatasourceObj(): Datasource {
  return {
    id: null,
    name: '',
    key: '',
    url: '',
    username: '',
    password: '',
    driverClassName: '',
    type: '',
    maxRows: '-1'
  }
}

// 驱动类 / 连接池类型：内置常用项 + 宿主 Config 注入项（对齐官方 magic-datasource-list）
const drivers = computed(() =>
  [...new Set([
    'com.mysql.jdbc.Driver',
    'com.mysql.cj.jdbc.Driver',
    'oracle.jdbc.driver.OracleDriver',
    'org.postgresql.Driver',
    'com.microsoft.sqlserver.jdbc.SQLServerDriver',
    'com.ibm.db2.jcc.DB2Driver',
    ...((contants.JDBC_DRIVERS as string[]) || [])
  ])].map((it) => ({ text: it, value: it }))
)
const datasourceTypes = computed(() =>
  [...new Set([
    'com.zaxxer.hikari.HikariDataSource',
    'com.alibaba.druid.pool.DruidDataSource',
    'org.apache.tomcat.jdbc.pool.DataSource',
    'org.apache.commons.dbcp2.BasicDataSource',
    ...((contants.DATASOURCE_TYPES as string[]) || [])
  ])].map((it) => ({ text: it, value: it }))
)

// 递归收集 datasource 分支：带 type === 'datasource' 的是容器/分组，其余是数据源实体
function collect(node: any, out: Datasource[]): void {
  ;(node?.children ?? []).forEach((c: any) => {
    const n = c?.node ?? {}
    if (n.type === 'datasource') collect(c, out)
    else out.push(n as Datasource)
  })
}

async function initData(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const tree = (await linlanApi.fetchTree()) as unknown as Record<string, any>
    const out: Datasource[] = []
    collect(tree?.datasource, out)
    datasources.value = out
  } catch (e) {
    error.value = (e as Error).message || i18n.t('datasource.loadFail')
    datasources.value = []
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return datasources.value
  return datasources.value.filter(
    (it: Datasource) => (it.name || '').toLowerCase().includes(kw) || (it.key || '').toLowerCase().includes(kw)
  )
})

// 「其它配置」= 实体中除固定字段外的剩余键（properties/script/createTime 等），保存时合并回去
function pickExtra(entity: Datasource): Record<string, unknown> {
  const extra: Record<string, unknown> = {}
  Object.keys(entity).forEach((k) => {
    if (!KNOWN_KEYS.includes(k)) extra[k] = entity[k]
  })
  return extra
}

function openDialog(entity: Datasource): void {
  dsObj.value = { ...newDatasourceObj(), ...entity, maxRows: String(entity.maxRows ?? '-1') }
  extraJson.value = (formatJson as (v: unknown) => string)(pickExtra(entity)) || '{\r\n\t\r\n}'
  showDialog.value = true
}

function newDatasource(): void {
  openDialog(newDatasourceObj())
}

// 官方：配置注册的只读数据源（无 id）不允许编辑
async function showDetail(item: Datasource): Promise<void> {
  if (!item.id) {
    modalAny.linlanAlert(i18n.t('datasource.cannotModify'))
    return
  }
  try {
    const detail = (await linlanApi.fetchApi(item.id)) as unknown as Datasource
    openDialog(detail)
  } catch (e) {
    error.value = (e as Error).message || i18n.t('datasource.loadFail')
  }
}

// 组装提交实体：固定字段 + 「其它配置」JSON 合并（未知键原样回填），groupId 兜底 datasource:0
function buildEntity(): Datasource {
  const temp: Datasource = {
    id: dsObj.value.id ?? null,
    name: dsObj.value.name ?? '',
    key: dsObj.value.key ?? '',
    maxRows: dsObj.value.maxRows ?? '-1',
    type: dsObj.value.type ?? '',
    driverClassName: dsObj.value.driverClassName ?? '',
    username: dsObj.value.username ?? '',
    password: dsObj.value.password ?? '',
    url: dsObj.value.url ?? '',
    groupId: dsObj.value.groupId ?? DS_GROUP_ID
  }
  let json: Record<string, unknown> = {}
  const text = (extraJson.value || '').trim()
  if (text) {
    try {
      json = JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new Error(i18n.t('datasource.jsonInvalid'))
    }
  }
  Object.keys(json || {}).forEach((k) => {
    if (!(k in temp)) temp[k] = json[k]
  })
  return temp
}

async function doTest(): Promise<void> {
  let entity: Datasource
  try {
    entity = buildEntity()
  } catch (e) {
    modalAny.linlanAlert((e as Error).message)
    return
  }
  if (!entity.url) {
    modalAny.linlanAlert(i18n.t('datasource.urlRequired'))
    return
  }
  try {
    const msg = await linlanApi.testDatasource(entity)
    if (msg === 'ok') {
      modalAny.linlanAlert(i18n.t('datasource.testSuccess'))
    } else {
      modalAny.linlanAlert('测试连接失败：' + (msg || i18n.t('datasource.unknownError')), {
        title: i18n.t('datasource.testFail')
      })
    }
  } catch (e) {
    modalAny.linlanAlert((e as Error).message || i18n.t('datasource.testFail'))
  }
}

async function doSave(): Promise<void> {
  if (!dsObj.value.name) {
    modalAny.linlanAlert(i18n.t('datasource.nameRequired'))
    return
  }
  if (!dsObj.value.key) {
    modalAny.linlanAlert(i18n.t('datasource.keyRequired'))
    return
  }
  let entity: Datasource
  try {
    entity = buildEntity()
  } catch (e) {
    modalAny.linlanAlert((e as Error).message)
    return
  }
  saving.value = true
  try {
    await linlanApi.saveEntity(SAVE_FOLDER, entity as unknown as LinlanApiEntity, '0')
    showDialog.value = false
    await initData()
  } catch (e) {
    modalAny.linlanAlert((e as Error).message || i18n.t('datasource.saveFail'))
  } finally {
    saving.value = false
  }
}

function remove(item: Datasource): void {
  if (!item.id) return
  modalAny.linlanConfirm(i18n.t('datasource.confirmDelete').replace('{name}', item.name || ''), {
    onOk: async () => {
      try {
        await linlanApi.deleteResource(item.id as string)
        await initData()
      } catch (e) {
        modalAny.linlanAlert((e as Error).message || i18n.t('datasource.deleteFail'))
      }
    }
  })
}

// ===== 右键菜单（与接口树同一套组件，数据源专属菜单项）=====
const menu = reactive({
  visible: false,
  x: 0,
  y: 0,
  items: [] as TreeMenuItem[],
  item: null as Datasource | null
})
function closeMenu(): void {
  menu.visible = false
}
function onContextMenu(e: MouseEvent, item: Datasource): void {
  menu.item = item
  menu.x = e.clientX
  menu.y = e.clientY
  // 配置注册的只读数据源（无 id）不能编辑/删除/测试
  menu.items = buildDatasourceMenu(i18n, !!item.id, !!item.url)
  menu.visible = true
}

// 测试连接：列表项可能只有摘要字段，测试前取完整实体
async function testConnection(item: Datasource): Promise<void> {
  if (!item.id) {
    modalAny.linlanAlert(i18n.t('datasource.cannotModify'))
    return
  }
  try {
    const detail = (await linlanApi.fetchApi(item.id)) as unknown as Datasource
    const msg = await linlanApi.testDatasource(detail as Record<string, unknown>)
    if (msg === 'ok') {
      modalAny.linlanAlert(i18n.t('datasource.testSuccess'))
    } else {
      modalAny.linlanAlert('测试连接失败：' + (msg || i18n.t('datasource.unknownError')), {
        title: i18n.t('datasource.testFail')
      })
    }
  } catch (e) {
    modalAny.linlanAlert((e as Error).message || i18n.t('datasource.testFail'))
  }
}

function onMenuCommand(key: string): void {
  const item = menu.item
  closeMenu()
  if (!item) return
  switch (key) {
    case 'openSql':
      openSql({ id: item.id, name: item.name, key: item.key })
      break
    case 'edit':
      void showDetail(item)
      break
    case 'test':
      void testConnection(item)
      break
    case 'copyKey':
      void copyToClipboard(item.key || '')
      break
    case 'copyUrl':
      void copyToClipboard(item.url || '')
      break
    case 'refresh':
      void initData()
      break
    case 'delete':
      remove(item)
      break
    default:
      break
  }
}

onMounted(initData)
// useMagicRuntime 登录成功后调用 datasourceListRef.value?.initData?.() 刷新列表
defineExpose({ initData, refresh: initData })
</script>

<template>
  <div class="ll-sidebar">
    <div class="ll-sidebar-head">
      <span>{{ i18n.t('datasource.title') }}</span>
      <span class="ll-sidebar-actions">
        <button class="ll-mini" :title="i18n.t('datasource.new')" @click="newDatasource">＋</button>
        <button class="ll-mini" :title="i18n.t('datasource.refresh')" @click="initData">⟳</button>
      </span>
    </div>
    <div class="ll-sidebar-search">
      <input v-model="keyword" :placeholder="i18n.t('datasource.search')" />
    </div>
    <div v-if="error" class="ll-tree-error">{{ error }}</div>
    <div v-if="!loading && !filtered.length" class="ll-empty">{{ i18n.t('datasource.empty') }}</div>
    <div
      v-for="item in filtered"
      :key="String(item.id || item.key || item.name)"
      class="ll-tree-api ll-ds-item"
      :title="(item.name || '') + '(' + (item.key || 'default') + ')'"
      @click="openSql({ id: item.id, name: item.name, key: item.key })"
      @contextmenu.prevent="onContextMenu($event, item)"
    >
      <i class="ll-icon ll-icon-datasource ll-ds-icon" />
      <span class="ll-name">{{ item.name || i18n.t('datasource.default') }}</span>
      <span class="ll-ds-key">({{ item.key || 'default' }})</span>
      <span v-if="item.id" class="ll-node-actions">
        <button class="ll-mini ll-mini-sm" :title="i18n.t('datasource.edit')" @click.stop="showDetail(item)">🖉</button>
        <button class="ll-mini ll-mini-sm" :title="i18n.t('datasource.delete')" @click.stop="remove(item)">🗑</button>
      </span>
    </div>

    <linlan-tree-menu
      v-if="menu.visible"
      :items="menu.items"
      :x="menu.x"
      :y="menu.y"
      @command="onMenuCommand"
      @close="closeMenu"
    />

    <!-- 挂到 body：脱离 .ll-sidebar(z-index:10) 层叠上下文，否则会被编辑器盖住 -->
    <Teleport to="body">
    <linlan-dialog
      :value="showDialog"
      :title="dsObj.id ? '修改数据源: ' + (dsObj.name || '') : '创建数据源'"
      align="right"
      width="480px"
      height="auto"
      @onClose="showDialog = false"
    >
      <template #content>
        <div class="ll-ds2">
          <!-- 基本信息 -->
          <div class="ll-ds2-section">
            <div class="ll-ds2-title">基本信息</div>
            <div class="ll-ds2-grid">
              <div class="ll-ds2-field">
                <label><i>*</i>名称</label>
                <linlan-input v-model:value="dsObj.name" placeholder="仅做展示使用" />
              </div>
              <div class="ll-ds2-field">
                <label><i>*</i>Key</label>
                <linlan-input v-model:value="dsObj.key" placeholder="代码中引用的数据库 key" />
              </div>
            </div>
          </div>
          <!-- 连接配置 -->
          <div class="ll-ds2-section">
            <div class="ll-ds2-title">连接配置</div>
            <div class="ll-ds2-field">
              <label><i>*</i>URL</label>
              <linlan-input v-model:value="dsObj.url" placeholder="jdbc:mysql://localhost:3306/your_db" />
            </div>
            <div class="ll-ds2-grid">
              <div class="ll-ds2-field">
                <label>用户名</label>
                <linlan-input v-model:value="dsObj.username" placeholder="数据库用户名" />
              </div>
              <div class="ll-ds2-field">
                <label>密码</label>
                <linlan-input v-model:value="dsObj.password" type="password" placeholder="数据库密码" />
              </div>
            </div>
            <div class="ll-ds2-grid">
              <div class="ll-ds2-field">
                <label>驱动类</label>
                <linlan-select
                  :inputable="true"
                  :border="true"
                  :options="drivers"
                  v-model:value="dsObj.driverClassName"
                  placeholder="可选，自动识别"
                />
              </div>
              <div class="ll-ds2-field">
                <label>类型</label>
                <linlan-select
                  :inputable="true"
                  :border="true"
                  :options="datasourceTypes"
                  v-model:value="dsObj.type"
                  placeholder="可选，手动输入指定"
                />
              </div>
            </div>
          </div>
          <!-- 高级选项 -->
          <div class="ll-ds2-section">
            <div class="ll-ds2-title">高级选项</div>
            <div class="ll-ds2-field">
              <label>maxRows</label>
              <linlan-input v-model:value="dsObj.maxRows" placeholder="最多返回条数，-1 为不限制" />
            </div>
            <div class="ll-ds2-field">
              <label>其它配置</label>
              <linlan-textarea v-model:value="extraJson" placeholder="JSON 格式的其它配置，如连接池参数" class="ll-ds-json" />
            </div>
          </div>
        </div>
      </template>
      <template #buttons>
        <button class="ll-ds2-btn" :disabled="saving" @click="doTest">测试连接</button>
        <button class="ll-ds2-btn" :disabled="saving" @click="showDialog = false">取消</button>
        <button class="ll-ds2-btn primary" :disabled="saving" @click="doSave">{{ dsObj.id ? '保存修改' : '创建' }}</button>
      </template>
    </linlan-dialog>
    </Teleport>
  </div>
</template>

<style scoped>
.ll-ds-item {
  padding-top: 4px;
  padding-bottom: 4px;
}

.ll-ds-icon {
  color: #089910;
  flex-shrink: 0;
}

.ll-ds-key {
  color: #999;
  font-size: 12px;
  flex-shrink: 0;
}

/* ===== 数据源编辑表单：分组 + 上置 label + 两列网格 ===== */
.ll-ds2-section {
  margin-bottom: 14px;
}

.ll-ds2-section:last-child {
  margin-bottom: 0;
}

.ll-ds2-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding-left: 7px;
  border-left: 3px solid var(--ll-primary, #3a8ee6);
  font-size: 12px;
  font-weight: 600;
  color: var(--color, #24292f);
}

.ll-ds2-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ll-ds2-field {
  min-width: 0;
  margin-bottom: 10px;
}

.ll-ds2-grid .ll-ds2-field {
  margin-bottom: 0;
}

.ll-ds2-field > label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: #57606a;
}

.ll-ds2-field > label i {
  margin-right: 2px;
  color: #e5534b;
  font-style: normal;
}

/* 统一输入控件观感：圆角、边框、focus 主蓝 */
/* 注意：linlan-select 内部多处固定 22px，不能整只拉高，否则文字错位；保持 22px 并垂直对齐 */
.ll-ds2 :deep(input) {
  height: 26px;
  line-height: 26px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #d0d7de);
  padding: 0 8px;
  font-size: 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.ll-ds2 :deep(input:focus) {
  border-color: var(--ll-primary, #3a8ee6);
  box-shadow: 0 0 0 2px rgba(58, 142, 230, 0.12);
}

.ll-ds2 :deep(.ll-select) {
  margin-top: 2px;
}

/* 还原可输入下拉内部 input：组件自带 22px 布局，不能套用外部输入样式，否则与箭头叠字 */
.ll-ds2 :deep(.ll-select input) {
  height: 22px;
  line-height: 22px;
  border: none;
  border-radius: 0;
  padding: 0 16px 0 5px; /* 右侧让出下拉箭头位置，避免长文字叠字 */
  box-shadow: none;
}

.ll-ds2 :deep(.ll-select input:focus) {
  border: none;
  box-shadow: none;
}

.ll-ds2 :deep(textarea) {
  border-radius: 6px;
  border: 1px solid var(--border-color, #d0d7de);
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.5;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.ll-ds2 :deep(textarea:focus) {
  border-color: var(--ll-primary, #3a8ee6);
  box-shadow: 0 0 0 2px rgba(58, 142, 230, 0.12);
  outline: none;
}

.ll-ds-json {
  width: 100%;
  height: 96px;
  box-sizing: border-box;
}

/* 底部按钮：主蓝主操作 + 幽灵次操作 */
.ll-ds2-btn {
  height: 26px;
  padding: 0 14px;
  border: 1px solid var(--border-color, #d0d7de);
  border-radius: 6px;
  background: var(--background, #fff);
  color: var(--color, #24292f);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ll-ds2-btn:hover:not(:disabled) {
  border-color: var(--ll-primary, #3a8ee6);
  color: var(--ll-primary, #3a8ee6);
  background: #f0f7ff;
}

.ll-ds2-btn.primary {
  border-color: var(--ll-primary, #3a8ee6);
  background: var(--ll-primary, #3a8ee6);
  color: #fff;
}

.ll-ds2-btn.primary:hover:not(:disabled) {
  background: #2f7fd4;
  border-color: #2f7fd4;
  color: #fff;
}

.ll-ds2-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
