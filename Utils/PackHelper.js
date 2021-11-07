const AES = require("./AES");

function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/** 
* 执行命令数据包
* @param k 加密密匙
* @param iv 加密偏移量
* @param cmd 要执行的命令
*/
module.exports.GetRuncmdPack = function(k,iv,cmd){
    var p = {
        type : "pack",
        action : "runcmdrequest",
        params : {
            cmd : cmd,
            id : guid()
        }
    }
    return GetEncrypt(k,iv,JSON.stringify(p))
}
/** 
* 发送文本数据包
* @param k 加密密匙
* @param iv 加密偏移量
* @param text 发送到服务端的文本
*/
module.exports.GetSendTextPack = function(k,iv,text){
    var p = {
        type : "pack",
        action : "sendtext",
        params : {
            text : text,
            id : guid()
        }
    }
    return GetEncrypt(k,iv,JSON.stringify(p))
}

/** 
* 发送文本数据包
* @param k 加密密匙
* @param iv 加密偏移量
*/
module.exports.GetServerStartPack = function(k,iv){
    var p = {
        type : "pack",
        action : "startrequest",
        params : {
            id : guid()
        }
    }
    return GetEncrypt(k,iv,JSON.stringify(p))
}


function GetEncrypt(k,iv,pack){
    var p = {
        type : "encrypted",
        params : {
            mode : "aes_cbc_pck7padding",
            raw : AES.encrypt(k,iv,pack)
        }
    };
    return JSON.stringify(p);
}
