// 节流
export function throttle(func, wait, options) {
    let context, args, result;
    let timeout: any = null;
    let previous = 0;
    options || (options = {});
    function later() {
        previous = options.leading === false ? 0 : new Date().getTime();
        timeout = null;
        result = func.apply(context, args);
    }
    return function () {
        const now = new Date().getTime();
        if (!previous && options.leading === false) previous = now;
        const remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0) {
            clearTimeout(timeout);
            timeout = null;
            previous = now;
            result = func.apply(context, args);
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };
}
// 防抖
export function debounce(func, wait, immediate) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        const later = function () {
            timeout = null;
            if (!immediate) {
                func.apply(context, args);
            }
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) {
            func.apply(context, args);
        }
    };
}
// jsonClone
function stringify(obj) {
    return JSON.stringify(obj, (key, val) => {
        if (typeof val === 'function') {
            return `${val}`
        }
        return val
    })
}

function parse(str) {
    JSON.parse(str, (k, v) => {
        if (v.indexOf && v.indexOf('function') > -1) {
            return eval(`(${v})`)
        }
        return v
    })
}

export function jsonClone(obj) {
    return parse(stringify(obj))
}

// deepClone
// 深拷贝对象
export function deepClone(obj) {
    const _toString = Object.prototype.toString

    // null, undefined, non-object, function
    if (!obj || typeof obj !== 'object') {
        return obj
    }

    // DOM Node
    if (obj.nodeType && 'cloneNode' in obj) {
        return obj.cloneNode(true)
    }

    // Date
    if (_toString.call(obj) === '[object Date]') {
        return new Date(obj.getTime())
    }

    // RegExp
    if (_toString.call(obj) === '[object RegExp]') {
        const flags = []
        if (obj.global) { flags.push('g') }
        if (obj.multiline) { flags.push('m') }
        if (obj.ignoreCase) { flags.push('i') }

        return new RegExp(obj.source, flags.join(''))
    }

    const result = Array.isArray(obj) ? [] : obj.constructor ? new obj.constructor() : {}

    for (const key in obj) {
        result[key] = deepClone(obj[key])
    }

    return result
}

import { useFrontStore } from "../stores"
import { encrypt } from './secret/encrypt'
export function preImg(val) {
    if (!val) {
        return ''
    }
    // 互联网资源
    const newVal = val.toLowerCase()
    if (newVal.indexOf('http') == 0) {
        return val
    }
    // 本地资源    
    if (newVal.indexOf('/res/') >= 0) {
        return val
    }
    let frontInfo = useFrontStore().frontInfo
    let previewUrl = frontInfo?.appConf?.appConfJson?.ImgPreviewUrl
    if (previewUrl) {
        return APP_CONFIG.baseUrl + previewUrl + val + '&permissionKey=' + setPermissionKey(sessionStorage.getItem("token"))
    }
    // 资源库  
    return frontInfo.serverUrl + val
}
const setPermissionKey = function (str: string) {
    str = str + ',' + new Date().getTime();
    return encrypt(str)
}
