/**
 * OAuth 授权辅助工具
 *
 * 说明：本文件在抽取 lib-vue-base 时缺失，现仅依据 api/http.ts 中
 * `import * as oAuth from "../utils/o-auth"` 的引用点补全。
 * 当前 http.ts 对登录令牌自行处理，未调用本模块方法，如业务后续需要
 * 对接 OAuth2 授权（authorize/token）可在此基础上扩展。
 */

/** 从本地存储获取登录令牌 */
export function getToken(): string | null {
  return localStorage.getItem('Admin-Token')
}

/** 写入登录令牌 */
export function setToken(token: string): void {
  localStorage.setItem('Admin-Token', token)
}

/** 移除登录令牌 */
export function removeToken(): void {
  localStorage.removeItem('Admin-Token')
}

/** 生成 Authorization 请求头值 */
export function buildAuthorization(): string | null {
  const token = getToken()
  return token ? `Bearer ${token}` : null
}

export default {
  getToken,
  setToken,
  removeToken,
  buildAuthorization
}
