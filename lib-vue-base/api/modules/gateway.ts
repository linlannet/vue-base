import baseAPI from '../baseAPI'
import { encrypt } from '../../utils/secret/encrypt'
// 一级模块
class gateway extends baseAPI{
    constructor(controller:string){
        super(`/api/app`,`/gateway${controller}`)
    }
    login(data){
        return this.requestBase(`${this.baseUrl}${this.modelName}/login`,'post',{data:data})
    }

    modifyPwd(data){
        data.oldPassword = encrypt(data.oldPassword)
        data.password = encrypt(data.password)
        return this.requestBase(`${this.baseUrl}${this.modelName}/modifyPwd`,'post',{data:data})
    }
    modifyUserInfo(data){
        return this.requestBase(`${this.baseUrl}${this.modelName}/modifyUserInfo`,'post',{data:data})
    }
}
// 子模块
let childrenModules = ['V2']
let globalModules = {}
childrenModules.forEach(item=>{
    globalModules[item] = new gateway(`/${item}`)
})
export default  globalModules