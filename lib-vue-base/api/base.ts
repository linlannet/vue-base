import request from './http'

export default {
    // 基础变量与方法
    getEntry(url,params) {
        return request({
            url: url,
            method: 'get',
            params: params
        })
    },
    postEntry(url,params) {
        return request({
            url: url,
            method: 'post',
            data: params
        })
    }
}