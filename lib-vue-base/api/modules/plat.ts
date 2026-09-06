import baseAPI from '../baseAPI'
import request from '../http'
// 一级模块
class platInfo extends baseAPI{
    constructor(controller:string){
        super(`/api/plat`,`/gateway${controller}`)
    }
    platLogin(){
        const token =  window.APP_CONFIG.appSite
        const nonce = "123456789abcdefg";
        const timeStamp = Date.parse(new Date())/ 1000;
        const accountId = token;
        
        const str = timeStamp+token+nonce+","+accountId+",,,"+timeStamp;
        const sign = CryptoJS.SHA256(str).toString().toUpperCase();
        //兼容客户端，获取站点信息重置BaseUrl
        request.defaults.baseURL = APP_CONFIG!.baseUrl
        return request({
            url: '/platLogin',
            method: 'POST',
            headers: {
                "Content-Type":"application/json",
                "token": token,
                "x-ll-uid":token,
                "x-ll-timestamp":timeStamp,
                "x-ll-signature": sign,
                "x-ll-nonce":nonce,
                "ll-plat-id": accountId
            }
        })
    }
}
// 子模块
let childrenModules = ['V2']
let globalModules = {}
childrenModules.forEach(item=>{
    globalModules[item] = new platInfo(`/${item}`)
})
export default  globalModules