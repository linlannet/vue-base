import { defineStore } from 'pinia'

export const useComStore = defineStore( {
  id:"com",
  // 为了完整类型推理，推荐使用箭头函数
  state: () => {
    return {
        // 所有这些属性都将自动推断出它们的类型
        Pt_Code: "linlan",          // 平台信息
        areaCode: '310000',
    }
  },
  actions: {
    setAreaCode:function(areaCode:any){
      this.areaCode = areaCode
	  },
    setPtCode:function(Pt_Code:string){
      this.Pt_Code = Pt_Code
    }
  },
  persist: {
    enabled: true , // 这个配置代表存储生效，而且是整个store都存储
    strategies: [
      { storage: localStorage, paths: ["Pt_Code", "areaCode"] },
    ]
  }
})
