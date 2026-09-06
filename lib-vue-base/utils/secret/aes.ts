
export default {
    encrypt(word, keyStr, ivkey) {
        let key = CryptoJS.enc.Utf8.parse(keyStr)
        var iv = CryptoJS.enc.Utf8.parse(ivkey);
        let srcs = CryptoJS.enc.Utf8.parse(word)

        var encrypted = CryptoJS.AES.encrypt(srcs, key, {iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7});
        return encrypted.toString()
    },

    // 前端解密
    decrypt(word,keyStr,ivStr){
        //APP AES
        var key = CryptoJS.enc.Utf8.parse(keyStr)
        //APP IV KEY
        var iv = CryptoJS.enc.Utf8.parse(ivStr)

        var decrypt = CryptoJS.AES.decrypt(word, key, { iv: iv,mode:CryptoJS.mode.CBC,padding: CryptoJS.pad.Pkcs7});
        var decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
        return decryptedStr.toString();
    },
    // 解密敏感信息
    DecryptPrivate(encryptedData, key) {
        key = CryptoJS.enc.Utf8.parse(key)
        var encryptedHexStr = CryptoJS.enc.Hex.parse(encryptedData)
        var encryptedBase64Str = CryptoJS.enc.Base64.stringify(encryptedHexStr)
        var decryptedData = CryptoJS.AES.decrypt(encryptedBase64Str, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        })

        var decryptedStr = decryptedData.toString(CryptoJS.enc.Utf8)
        return decryptedStr;
    }
}
