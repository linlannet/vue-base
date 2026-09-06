import { useComStore,useUserStore } from '../stores'
import API from '../api'

let _BaseUrl = function(url,linkCall){
    if(!url){
        return false
    }
    let vueObj = window.currentApp.config.globalProperties;
    let tUrl = url.toLowerCase()
    // 外部 http 外链
    if(tUrl.startsWith("http")){
        linkCall(url)
    }
    else{
        vueObj.$router.push(url)
    }
}
let redirectBaseUrl = function(url){
    _BaseUrl(url,(goUrl)=>{
        setTimeout(() => {
            location.href = goUrl
        }, 200);
    })
}
export function replaceUrl(url){
    _BaseUrl(url,(goUrl)=>{
        setTimeout(() => {
            location.replace(goUrl)
        }, 200);
    })
}

// 平台统一转向方式调整
export function redirectUrl(url){
    redirectBaseUrl(url)
}

