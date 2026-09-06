import { AxiosRequestConfig } from 'axios'
import request from './http'
class baseAPI {
    baseUrl:string;
    modelName:string;
    constructor(baseUrl: string,modelName: string){
        this.baseUrl = baseUrl
        this.modelName = modelName
    }
    // 基础变量与方法
    requestBase(url: string,method: string,opts: AxiosRequestConfig<any>){
        // 根据请求类型处理 api 路径
        return request({
            url: url,
            method: method,
            ...opts
        })
    }
}
export default  baseAPI
