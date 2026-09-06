const modulesFiles = import.meta.glob("./modules/**/*.ts", { eager: true })

let modules:any = {}
for(const[key,value] of Object.entries(modulesFiles)){
  //提取文件名
   // /(\.\/modules\/|\.ts)/g
  let name = key.match(/[^\/]*(?=(\.ts)$)/g)[0]
  modules[name] = value.default
}

import {httpGet,httpPost} from './http'
import request from './http'
import baseAPI from './baseAPI'
export default {
  httpGet,
  httpPost,
  baseAPI,
  request,
  ...modules
}