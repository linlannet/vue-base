declare module "*.vue" {
    import { DefineComponent } from "vue"
    const component:DefineComponent<{},{},any>
    export default component
}

// 外部变量
declare var APP_CONFIG:any;
declare var JSEncrypt:any;
declare var CryptoJS:any;
declare var currentVue:any;
declare var loadjs:any;


