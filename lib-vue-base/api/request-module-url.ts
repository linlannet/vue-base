
export default function (moduleName,actionName,type = "member") {
  let module = APP_CONFIG.APIModule[moduleName]
  let version = module.version || "V1"
  let preUrl = module[type]
  return `${preUrl}${moduleName}/${version}/${actionName}`
}
