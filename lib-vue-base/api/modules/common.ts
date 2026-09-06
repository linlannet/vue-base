import request from '../http'
import axios from 'axios'

export default {
    getJSON: function (url) {
        return request({
            url: url,
            method: 'get'
        })
    },
    getDynamicTotal: function (url) {
        return this.getJSON(url)
    }

}





