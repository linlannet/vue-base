// 引入加密插件aes
import aes from './aes'
import { encrypt } from './encrypt'
import { useFrontStore } from '../../stores/app'

//允许api 不进行解密操作
let checkIsWhiteList = function(url){
    let frontInfo = useFrontStore().frontInfo
    if(frontInfo){
        let appConfig = frontInfo.appConf.appConfJson
        let tempObj = appConfig.CRYPT_NO_LIST.filter((item)=>{
            return url.indexOf(item) > -1
        })
        return tempObj.length > 0;
    }
    return true
}
//api 必须解密列表
let checkCryptList = function(url){
    let frontInfo = useFrontStore().frontInfo
    if(frontInfo){
        let appConfig = frontInfo.appConf.appConfJson
        var tempObj = appConfig.CRYPT_LIST.filter((item)=>{
            return !!item && url.indexOf(item) > -1
        })
        return tempObj.length > 0;
    }
    return false
    
}

let decrypt = function(resp) {
    let config = resp.config
    if(config.aesKey && config.aesIv && !checkIsWhiteList(config.url)){
        // 通过rsa解密的值
        resp.data = JSON.parse(aes.decrypt(resp.data,config.aesKey,config.aesIv));
    }
    // 强行加密代码
    if(checkCryptList(config.url)){
    	if(resp.data.data){
            var frontInfo = useFrontStore().frontInfo
            
            resp.data.data = JSON.parse(aes.decrypt(resp.data.data,
                aes.DecryptPrivate(frontInfo.appConf.appConfJson.ESK,frontInfo.appConf.appConfJson.configINIDINID),
                aes.DecryptPrivate(frontInfo.appConf.appConfJson.ESI,frontInfo.appConf.appConfJson.configINIDINID)))
        }
            
    }
    return resp.data
}
// 对post对象进行加密
let getEncryptData = function(config, AES_KEY, AES_IV) {
    if (config.data) {
        let dataStr = config.data
        if(typeof(dataStr) != 'string'){
            dataStr = JSON.stringify(dataStr)
        }
        config.data = aes.encrypt(dataStr, AES_KEY, AES_IV);
        return config.data;
    } else {
        return config.data
    }
}
// 信息加密
export function requestEncrypt(config){
    return config
}
// 信息解密
export function responseDecrypt(response){
    const resp = response;
    resp.data = decrypt(resp)
    return response
}

/// 敏感信息能用解密方法
export function DecryptPrivate(response) {
    const resp = response;
    if(resp.config.url.indexOf("api/plat/platLogin") > -1){
        return response
    }
    const frontInfo = useFrontStore().frontInfo
    if (frontInfo.isEncryt) {
        resp.data = decryptObject(response.data)
    }
    return response
}
let decryptString = function (key, val) {
    const frontInfo = useFrontStore().frontInfo
    var appConfig = frontInfo.appConf.appConfJson
    if (appConfig.ENCRYPT_COLUMNS.includes(key.toLowerCase())) {
        return aes.DecryptPrivate(val, appConfig.configINIDINID)
    }
    return val

}
let decryptArray = function(tpl){
    if (Array.isArray(tpl)) {
        let dataArray = []
        tpl.forEach((dataItem) => {
            dataArray.push(decryptObject(dataItem))
        })
        tpl = dataArray
    } else {
        //复制对象为空时，给空对象
        tpl = decryptObject(tpl)
    }
    return tpl
}
let decryptObject = function (tpl) {
    // 非对象类型直接返回。
    if (typeof(tpl) !== 'object') {
        return tpl
    }
    Object.keys(tpl).forEach((item) => {
        //对象不为 null 时执行
        if(tpl[item]){
            let objType = typeof (tpl[item])
            switch (objType) {
                case 'string':
                    tpl[item] = decryptString(item, tpl[item])
                    break
                case 'object':
                    tpl[item] = decryptArray(tpl[item])
                    break
            }
        }

    })
    return tpl
}
/// 敏感信息能用解密方法 -- 结束
