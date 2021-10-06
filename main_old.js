// "use strict"
//启用nodejs严格模式
// const { bot } = require("../../index");//尚未启用机器人，调试的时候会报错
const ws = require("./Utils/Websocket");
const AES = require("./Utils/AES");
const MD5 = require("./Utils/MD5");
var fs = require('fs');
let config_file = "data/XBridge/config.json"
let data_path = "data/XBridge"

//bot示例
// bot.on("message.group", function (e) {
    // if(e.raw_message == "test"){
        // e.reply("11132测试！");
    // }
// })

function logger(e)
{
	console.log("[XB]"+e)
}

function init(){
    if(!fs.existsSync(data_path))//文件夹自动创建
    {
        fs.mkdirSync(data_path)
    }
    try{
    if(fs.openSync(config_file,'r'))//配置文件创建
    {
        logger("配置文件存在，插件加载中...")
    }}catch(err){
        logger("配置文件不存在，插件初始化中...")
        let jsonData = {
            "ws_address": "ws://127.0.0.1:8080",
            "server_name": "生存服务器",
            "password": "password",
            "qq_group":[123456]
        };
        let text = JSON.stringify(jsonData,null,'\t');
        var fd = fs.openSync(config_file,'w');
		fs.writeSync(fd, text);
        logger("文件已写入！");
        fs.closeSync(fd);
    }
}

init();
logger("准备加载XBridge...");
let config = JSON.parse(fs.readFileSync(config_file));
const address = config.ws_address;
const servername = config.server_name;
const passwd = config.password;
const groupID = config.qq_group;
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
                    // bot.sendGroupMsg(groupID[0], str);
                };break;
                case "stop":{
                    let str = "服务器关闭！"
                    console.log(str);
                    // bot.sendGroupMsg(groupID[0], str);
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