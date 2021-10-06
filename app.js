"use strict"
//启用nodejs严格模式
const { bot } = require("../../index");//尚未启用机器人，调试的时候会报错
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

let config = JSON.parse(fs.readFileSync("data/config.json"));
const address = config.ws_address;
const servername = config.server_name;
const password = config.password;
const groupID = config.qq_group;
var client = ws.GetWebsocketClient(servername , password);
client.ws.connect(address);
client.ws.on("connect",function(con){
    console.log("ws connect!")
    con.on("message",function(m){   
        try
        {
            var TempData = AES.decrypt(client.k,client.iv,JSON.parse(m.utf8Data).params.raw);
            console.log(AES.decrypt(client.k,client.iv,JSON.parse(m.utf8Data).params.raw));
            let data = JSON.parse(TempData)
            let cause = data.cause;
            let e = data.params;
            console.log(data,cause,params)
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
            console.log("err=",err.message);
        }
    })
    con.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    con.on('close', function() {
        console.log('Connection Closed');
    });
});
client.ws.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.Connect();