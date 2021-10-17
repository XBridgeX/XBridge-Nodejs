"use strict"
//启用nodejs严格模式
const { bot } = require("./main");//尚未启用机器人，调试的时候会报错
var conf = require("./main");
const ws = require("./Utils/Websocket");
const AES = require("./Utils/AES");
const MD5 = require("./Utils/MD5");
const PHelper = require("./Utils/PackHelper")
var fs = require('fs');
var ws = null //初始化全局websocket对象

//bot示例
bot.on("message.group", function (e) {
    if(e.raw_message == "test"){
        e.reply("11132测试！");
	ws.sendUTF(PHelper.GetRuncmdPack(...));  //主动发信示例
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
    ws = con //装载全局ws对象
    con.on("message",function(m){   
        try
        {
            var TempData = AES.decrypt(client.k,client.iv,JSON.parse(m.utf8Data).params.raw);
            let data = JSON.parse(TempData)
            let cause = data.cause;
            let e = data.params;
            console.log(data,cause,e)
            switch(cause)
            {
                case "join":{
                    let player = e.sender;
                    bot.sendGroupMsg(groupID[0], "玩家 "+player+" 进入了服务器！");
                };break;
                case "left":{
                    let player = e.sender;
                    bot.sendGroupMsg(groupID[0], "玩家 "+player+" 离开了服务器！");
                };break;
                case "chat":{
                    let player = e.sender;
                    let chat = e.text;
                    bot.sendGroupMsg(groupID[0], "[服聊] "+player+" >> "+chat);
                };break;
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
                case "decodefailed":{
                    bot.sendGroupMsg(groupID[0], "数据包解析异常，请前往后台查看");
                    console.log("数据包解析异常：",e.msg)
                };break;
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
