
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  // 为了完整类型推理，推荐使用箭头函数
  state: () => {
    return {
      // 所有这些属性都将自动推断出它们的类型
      userInfo:{},
    }
  },
  actions: {
    setUserInfo(userInfo:any) {
      this.userInfo = userInfo
    },
    initUserInfo(res:any) {
      let userInfo = {
        userInfo: {},
        roleName: ""
      }
      let adminUser = res.data
      userInfo.userInfo = adminUser
      userInfo.roleName = adminUser?.groupName
      this.userInfo = userInfo
    }
  },
  persist: {
    enabled: true , // 这个配置代表存储生效，而且是整个store都存储
    strategies: [
      { storage: localStorage, paths: ["userInfo"] }
    ]
  }
})

