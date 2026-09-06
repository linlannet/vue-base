import { defineStore } from 'pinia'

/**
 * 站点级加解密配置（来源：后端 appConf.appConfJson，各平台差异配置）
 */
export interface AppConfJson {
  // 不做加解密（白名单）的接口关键字
  CRYPT_NO_LIST?: string[]
  // 强制解密接口关键字列表
  CRYPT_LIST?: string[]
  // AES 密钥（使用 configINIDINID 对应 RSA 私钥加密后的串）
  ESK?: string
  // AES 偏移量 IV（同样经 RSA 私钥加密）
  ESI?: string
  // 后端 RSA 私钥标识，用于解密 ESK/ESI
  configINIDINID?: string
  // 敏感字段名（需按列解密），匹配字段名小写
  ENCRYPT_COLUMNS?: string[]
  // 图片预览前缀
  ImgPreviewUrl?: string
  [key: string]: any
}

/**
 * 应用配置（对应后端 AppConfigDto.appConf）
 */
export interface AppConfigInfo {
  platId?: string | number
  appId?: string
  topXzqhId?: string
  appConfJson?: AppConfJson
  [key: string]: any
}

/**
 * 工作台配置（对应后端 workConfig）
 */
export interface WorkConfigInfo {
  layout?: string
  [key: string]: any
}

/**
 * 站点/平台信息（对应后端 WebLayoutDto，
 * platLogin -> WebLayoutService.getPlatConfInfoDto 返回结构）
 */
export interface FrontInfo {
  // 平台 ACCOUNT_ID
  id?: string
  isAdmin?: boolean
  // 是否开启敏感信息加密
  isEncryt?: boolean
  // RSA 登录公钥
  publicKey?: string
  // RSA 公钥字符串（toString() 后用于 JSEncrypt）
  aesKey?: string
  clientId?: string
  serverUrl?: string
  serverConf1?: string
  appConf?: AppConfigInfo
  isWork?: boolean
  workConfig?: WorkConfigInfo
  [key: string]: any
}

/**
 * 站点信息 store：
 * 站点(平台)信息在 platLogin 成功后由业务方 setFrontInfo 写入，
 * 供 api/http.ts、utils/secret 加密/解密、图片预览等模块使用。
 */
export const useFrontStore = defineStore('siteApp', {
  state: () => {
    return {
      // 站点/平台信息
      frontInfo: null as FrontInfo | null,
      // 业务方可注入自定义 axios 实例，http 响应拦截中调用其 response 钩子
      axios: null as any
    }
  },
  actions: {
    setFrontInfo(frontInfo: FrontInfo | null) {
      this.frontInfo = frontInfo
    },
    setAxios(axios: any) {
      this.axios = axios
    },
    clear() {
      this.frontInfo = null
      this.axios = null
    }
  }
})
