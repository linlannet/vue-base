/**
 * @description 存储 cookie 值
 * @param {String} name cookie name
 * @param {String} value cookie value
 * @param {Object} settings cookie settings
 */
export const cookieSet = function (name = 'default', value = '') {
    // 对 cookie 值进行编码以转义其中的分号、逗号和空格
    var cookie = name + "=" + encodeURIComponent(value);
    document.cookie = cookie
}

/**
 * @description 拿到 cookie 值
 * @param {String} name cookie name
 */
export const cookieGet = function (name = 'default') {
    // 拆分 cookie 字符串
    var cookieArr = document.cookie.split(";");
    // 循环遍历数组元素
    for(var i = 0; i < cookieArr.length; i++) {
        var cookiePair = cookieArr[i].split("=");
       
        /* 删除 cookie 名称开头的空白并将其与给定字符串进行比较 */
        if(name == cookiePair[0].trim()) {
            // 解码cookie值并返回
            return decodeURIComponent(cookiePair[1]);
        }
    }
    // 如果未找到，则返回null
    return null;
}