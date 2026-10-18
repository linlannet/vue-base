<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
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

const i18n = inject<I18n>('ll-i18n')!
// modal/index.ts 是 @ts-nocheck 的 JS 模块，参数 arity 未标注；沿用既有约定用 as any 调用
const modalAny = modal as any

// 数据源实体（对齐 backend DataSourceInfo：url/username/password/key/maxRows/driverClassName/type）
interface Datasource {
  id?: string | null
  name?: string | null
  key?: string | null
  url?: string | null
  username?: string | null
  password?: string | null
  driverClassName?: string | null
  type?: string | null
  maxRows?: string | number | null
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
    <div v-if="!loading && !filtered.length" class="ma-empty">{{ i18n.t('datasource.empty') }}</div>
    <div
      v-for="item in filtered"
      :key="String(item.id || item.key || item.name)"
      class="ll-tree-api ll-ds-item"
      :title="(item.name || '') + '(' + (item.key || 'default') + ')'"
      @click="showDetail(item)"
    >
      <i class="ma-icon ma-icon-datasource ll-ds-icon" />
      <span class="ll-name">{{ item.name || i18n.t('datasource.default') }}</span>
      <span class="ll-ds-key">({{ item.key || 'default' }})</span>
      <span v-if="item.id" class="ll-node-actions">
        <button class="ll-mini ll-mini-sm" :title="i18n.t('datasource.delete')" @click.stop="remove(item)">🗑</button>
      </span>
    </div>

    <linlan-dialog
      :value="showDialog"
      :title="dsObj.id ? '修改数据源:' + (dsObj.name || '') : '创建数据源'"
      align="right"
      width="450px"
      height="450px"
      @onClose="showDialog = false"
    >
      <template #content>
        <div class="ll-ds-form">
          <label>名称</label>
          <linlan-input v-model:value="dsObj.name" placeholder="数据源名称，仅做展示使用" />
        </div>
        <div class="ll-ds-form">
          <label>Key</label>
          <linlan-input v-model:value="dsObj.key" placeholder="数据库key，后续代码中使用" />
        </div>
        <div class="ll-ds-form">
          <label>URL</label>
          <linlan-input v-model:value="dsObj.url" placeholder="请输入jdbcurl，如：jdbc:mysql://localhost" />
        </div>
        <div class="ll-ds-form">
          <label>用户名</label>
          <linlan-input v-model:value="dsObj.username" placeholder="请输入数据库用户名" />
        </div>
        <div class="ll-ds-form">
          <label>密码</label>
          <linlan-input v-model:value="dsObj.password" type="password" placeholder="请输入数据库密码" />
        </div>
        <div class="ll-ds-form">
          <label>驱动类</label>
          <linlan-select
            :inputable="true"
            :border="true"
            :options="drivers"
            v-model:value="dsObj.driverClassName"
            placeholder="驱动类，可选，内部自动识别，也可以手动输入指定"
          />
        </div>
        <div class="ll-ds-form">
          <label>类型</label>
          <linlan-select
            :inputable="true"
            :border="true"
            :options="datasourceTypes"
            v-model:value="dsObj.type"
            placeholder="数据源类型，可选，也可以手动输入指定"
          />
        </div>
        <div class="ll-ds-form">
          <label>maxRows</label>
          <linlan-input v-model:value="dsObj.maxRows" placeholder="最多返回条数，-1为不限制" />
        </div>
        <div class="ll-ds-form ll-ds-form-block">
          <label>其它配置</label>
          <linlan-textarea v-model:value="extraJson" placeholder="JSON 格式的其它配置，如连接池参数" class="ll-ds-json" />
        </div>
      </template>
      <template #buttons>
        <button class="ma-button active" :disabled="saving" @click="doSave">{{ dsObj.id ? '修改' : '创建' }}</button>
        <button class="ma-button" :disabled="saving" @click="doTest">测试连接</button>
        <button class="ma-button" :disabled="saving" @click="showDialog = false">取消</button>
      </template>
    </linlan-dialog>
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

/* ===== 数据源编辑表单（对齐官方 .ds-form 布局） ===== */
.ll-ds-form {
  margin-bottom: 5px;
  display: flex;
  align-items: flex-start;
}

.ll-ds-form > label {
  margin-right: 5px;
  display: inline-block;
  width: 60px;
  text-align: right;
  height: 22px;
  line-height: 22px;
  flex-shrink: 0;
}

.ll-ds-form > *:not(label) {
  flex: 1;
  min-width: 0;
}

.ll-ds-json {
  width: 100%;
  height: 130px;
  box-sizing: border-box;
}
</style>
