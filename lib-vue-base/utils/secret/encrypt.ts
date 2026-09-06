import { useFrontStore } from '../../stores/app'
export  function encrypt(content){
    var frontInfo = useFrontStore().frontInfo
    var PublicKey = frontInfo.aesKey.toString()
    var encrypt = new JSEncrypt()
    encrypt.setPublicKey(PublicKey)
    return encrypt.encrypt(content)
}