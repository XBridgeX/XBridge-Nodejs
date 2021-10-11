"use strict"
//启用nodejs严格模式
const { bot } = require("./main");//尚未启用机器人，调试的时候会报错
var conf = require("./main");
const ws = require("./Utils/Websocket");
const AES = require("./Utils/AES");
const MD5 = require("./Utils/MD5");
var fs = require('fs');

//bot示例
bot.on("message.group", function (e) {
    if(e.raw_message == "test"){
        e.reply("11132测试！");
    }
})

function logger(e)
{
	console.log("[XB]"+e)
};

logger("准备加载XBridge...");
var address = conf.address;
var servername = conf.servername;
var passwd = conf.ws_passwd;
var groupID = conf.groupID;
var client = ws.GetWebsocketClient(address , servername , passwd);

client.ws.on("connect",function(con){
    console.log("WS服务器连接成功！")
    con.on("message",function(m){   
        try
        {
            var TempData = AES.decrypt(client.k,client.iv,JSON.parse(m.utf8Data).params.raw);
            // console.log(AES.decrypt(client.k,client.iv,JSON.parse(m.utf8Data).params.raw));
            let data = JSON.parse(TempData)
            let cause = data.cause;
            let e = data.params;
            console.log(data,cause,e)
            switch(cause)
            {
                case "join":{};break;
                case "left":{};break;
                case "chat":{};break;
                case "runcmdfeedback":{};break;
                case "start":{
                    let str = "服务器启动！";
                    console.log(str);
                    bot.sendGroupMsg(groupID[0], str);
                };break;
                case "stop":{
                    let str = "服务器关闭！"
                    console.log(str);
                    bot.sendGroupMsg(groupID[0], str);
                };break;
                case "plantext":{};break;
                case "decodefailed":{};break;
            }

        }catch(err)
        {
            console.log("异常信息：",err.message);
        }
    })
    con.on('error', function(error) {
        console.log("WS连接出错: " + error.toString());
    });
    con.on('close', function() {
        console.log('WS连接已关闭！');
    });
});
client.ws.on('connectFailed', function(error) {
    console.log('WS连接失败: ' + error.toString());
});
client.Connect();