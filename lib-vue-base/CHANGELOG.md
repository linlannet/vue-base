
### 版本号：1.1.0
- 更新日期：2026-10-16
- 更新内容：
1. api 请求层：封装统一 axios 实例，增加请求/响应拦截器，自动携带 Authorization 令牌、GET 请求防缓存时间戳与平台参数 pubRange，并统一处理错误码，对外提供 httpGet / httpPost
2. api 模块化：增加 baseAPI 基类与 requestBase 统一请求入口，通过 import.meta.glob 自动挂载 modules 下接口模块（common、gateway、plat），并由 request-module-url 按 APP_CONFIG.APIModule 配置拼装 模块/版本/动作 请求地址
3. plat 模块：增加 platLogin 平台登录接口，支持 token、x-ll-timestamp、x-ll-signature（SHA256 签名）、x-ll-nonce、ll-plat-id 等网关鉴权请求头，并兼容客户端重置 baseURL
4. gateway 模块：增加 login、modifyPwd、modifyUserInfo 接口，修改密码时采用 RSA 公钥对新旧密码加密后再提交
5. common 模块：增加 getJSON / getDynamicTotal 通用数据请求方法
6. 安全加密 utils.secret：增加 AES（CBC/PKCS7）加解密工具与 RSA 公钥加密 encrypt；提供 requestEncrypt / responseDecrypt 请求响应加解密，支持 CRYPT_NO_LIST 免解密白名单、CRYPT_LIST 强制解密及 ENCRYPT_COLUMNS 敏感字段按列解密
7. 基础工具 utils：增加 core（throttle 节流、debounce 防抖、deepClone / jsonClone 深拷贝、preImg 图片预览地址与 permissionKey 处理）、date（formatDate / getDate）、cookie（cookieSet / cookieGet）、base（replaceUrl / redirectUrl 内部路由与外部链接跳转）、water-mark 全屏水印、lazyLoadComponents 基于 IntersectionObserver 的组件懒加载
8. 认证工具 utils.o-auth：增加 getToken / setToken / removeToken / buildAuthorization，统一 Admin-Token 令牌读写
9. 状态管理 stores：基于 pinia + pinia-plugin-persist，增加 useFrontStore（站点/平台信息 frontInfo 及自定义 axios 响应钩子注入）、useUserStore（userInfo / initUserInfo）、useComStore（Pt_Code / areaCode），均支持本地持久化
10. 类型定义：补充 FrontInfo、AppConfigInfo、AppConfJson、WorkConfigInfo 等站点加解密配置 TS 类型声明
11. 统一导出入口 main.ts：对外导出 API、utils、useFrontStore、useUserStore
12. 构建发布：采用 node + vite lib 模式打包（ES/UMD 产物，external 排除 vue、axios、pinia），输出至 lib/lib-vue-base，release 脚本自动写入 package.json，并保留 npm 上传配置文件方法说明


### 版本号：1.0.0
- 更新日期：2025-08-23
- 更新内容：
1. 初始化工程目录
2. 增加根目录的README、Q&A、CHANGELOG
3. 采用node和nvm方式进行打包
4. 增加npm上传配置文件方法说明
