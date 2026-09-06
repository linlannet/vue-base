/**
 * axios封装
 * 请求拦截、响应拦截、错误统一处理
 */
import axios, { AxiosInstance, AxiosResponse } from "axios"
import { requestEncrypt,responseDecrypt } from '../utils/secret/index'
import { useFrontStore } from '../stores/app'
import { debounce } from '../utils/core'
import * as oAuth from "../utils/o-auth"

interface Defults {
  baseURL: string | undefined
  withCredentials: boolean
  timeout: number
  headers: any
}

// 字段扩展声明
interface DAMNU_ENABLE {
  [key: string]: string
}

const baseURL = APP_CONFIG!.baseUrl

const setDefaults: Defults = {
  baseURL: `${baseURL}`,
  withCredentials: false,
  timeout: 10000,
  headers: {
		'Content-Type': 'application/json; charset=utf-8'
	}
}
// 创建axios实例
const instance: AxiosInstance = axios.create(setDefaults)
// 请求地址 instance.defaults.baseURL = baseURL.url;

/**
 * 请求拦截器
 * 每次请求前，如果存在token则在请求头中携带token
 * 登录流程控制中，根据本地是否存在token判断用户的登录情况
 * 但是即使token存在，也有可能token是过期的，所以在每次的请求头中携带token
 */

instance.interceptors.request.use(
  (config:any) => {

    // 用户信息
    if (!config.headers['Authorization'])
		  config.headers['Authorization'] = 'Bearer ' + localStorage.getItem("Admin-Token")
    
    // 防止缓存，GET请求默认带_t参数
    if (config.method === 'get') {
      let versions = new Date().getTime()
      config.params = {
        ...config.params,
        ...{ 't': versions }
      }
    }
   
    // 平台拦截
    if (config.params && !config.params.pubRange && localStorage.getItem("pubRange")) {
      config.params = {
        ...config.params,
        ...{ 'pubRange': localStorage.getItem("pubRange") }
      }
    }
    //加密
    config = requestEncrypt(config)
    return config
  },
  // 拦截失败
  error => Promise.reject(error)
)

/**
 * 响应拦截器
 * 后台根据携带的token判断用户的登录情况，并返回给我们对应的状态码
 * 而后我们可以在响应拦截器中，根据状态码进行一些统一的操作。
 * 但是即使token存在，也有可能token是过期的，所以在每次的请求头中携带token
 */

instance.interceptors.response.use(
  // 请求成功
  (response: AxiosResponse) => {
    //解密
    responseDecrypt(response)
    let frontStore = useFrontStore()
    // 配置拦截
    if(frontStore.axios && frontStore.axios.response){
      frontStore.axios.response(response)
    }
    const { code, msg } = response.data
    if (code == 0) return response.data
    else errorHandle(code, msg)
    // 请求成功，服务器返回错误数据
    return response.data
  },
  // 请求失败
  error => {
    const { status, data } = error.response // 获取错误状态码
    errorHandle(status, data, true) // 处理错误信息
    
    return Promise.reject(error)
  }
)


// 错误处理 ---请求错误触发error，返回错误结果warning
const errorHandle = (status: number | string, data: any, isErr: boolean = false) => {
  switch(status){
    case 401:
      break;
  }
}

// 为了安全多少只使用GET和POST方法
/**
 *  GET 请求
 * @param url 路径
 * @param params 参数可能是对象也可能是undefined
 * @param isPorxy 是否使用代理地址，正对指标或者数据端口
 * @returns Promise
 */
export function httpGet(url: string, params: any, isPorxy: boolean = false, besaUrl?: string) {
  return instance({
    url: url,
    method: 'get',
    params: params
})
}

/**
 * POST 请求数据
 * @param url 路径
 * @param params 参数可能是对象也可能是undefined
 * @param isPorxy 是否使用代理地址，正对指标或者数据端口
 * @returns Promise
 */
export function httpPost(url: string, params: any, isPorxy: boolean = false, besaUrl?: string) {
  return instance({
    url: url,
    method: 'post',
    data: params
  })
}

export default instance

