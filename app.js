"use strict"
//启用nodejs严格模式
const { bot } = require("./main");//尚未启用机器人，调试的时候会报错
var conf = require("./main");
const ws = require("./Utils/Websocket");
const AES = require("./Utils/AES");
const MD5 = require("./Utils/MD5");
const http = require('http');
const PHelper = require("./Utils/PackHelper")
var fs = require('fs');
var ws_send = null //初始化全局websocket对象

var address = conf.address;
var servername = conf.servername;
var passwd = conf.ws_passwd;
var groupID = conf.groupID;

var mobs = JSON.parse(fs.readFileSync("./data/mobs.json"))  //实体数据
var reg = JSON.parse(fs.readFileSync("./data/regex.json"))    //自动应答数据

var k = "1234567890123456";
var iv = "1234567890123456";
k = MD5.MD5(passwd).toUpperCase().substring(0,16);
iv = MD5.MD5(passwd).toUpperCase().substring(16,32);

var motd = "[xBridge] "
console.log(motd+"加载中，请稍后...");

//群消息监听
bot.on("message.group", function(e){
    if(e.group_id == groupID){
        logic_main(e)
    }
})

//公共方法1：玩家权限判断
function permission(e) {
    let players_info = JSON.parse(fs.readFileSync("./data/players_info.json"))  //转换玩家数据为对象
    for(var i=0 ; i<players_info.length ; i++){     //遍历玩家对象
        if(players_info[i].qqid == e.user_id){  //在玩家对象中，如果发信玩家的qq号和玩家对象中的qqid一致，
            let permission = players_info[i].permission
            switch(permission){
                case 0:{
                    return 0
                }
                case 1:{
                    return 1
                }
            }
        }
    }
}

//公共方法2：玩家数据读写
function file_rw(e,players_info_tmp,content){
    let players_info = JSON.stringify(players_info_tmp,null,'\t');
    let open_players_info = fs.openSync("./data/players_info.json",'w');
    fs.writeSync(open_players_info, players_info);
    fs.closeSync(open_players_info);
    e.reply("[CQ:at,qq="+e.user_id+"]\n"+content);
}

//主逻辑
function logic_main(e){
    for (var a=0 ; a<reg.length ; a++){    //遍历正则对象
        let re = new RegExp(reg[a].keywords,"g");   //新建一个局部正则对象，用于匹配关键词
        if(e.raw_message == e.raw_message.match(re)){     //若玩家发送的消息与正则中的关键词匹配
            let r = (reg.indexOf(reg.filter(d=>d.keywords===d.keywords)[a]))    //获取已匹配关键词所在的索引值
            if(reg[r].permission == 1 && permission(e) != 1){     //如果正则要求权限为1，但玩家非管理员，则告知无权，跳出循环
                e.reply("[CQ:at,qq="+e.user_id+"]\n您不是管理员，无权执行该操作！");
                continue
            }
            else{
                for (var b=0 ; b<reg[r].actions.length ; b++) {    //遍历动作列表
                    let type = reg[r].actions[b].type;
                    let content = reg[r].actions[b].content;
                    let succeed = reg[r].actions[b].succeed;
                    let failed = reg[r].actions[b].failed;
                    modules(e,re,type,content,succeed,failed)
                }
            }
        }
    }
}
function logger(e)
{
	console.log("[XB]"+e)
};

logger("准备加载XBridge...");
//功能模块（白名单加减、自定义命令等）
function modules(e,re,type,content,succeed,failed){
    switch(type)
    {
        case "runcmd":{     //执行命令
            ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,content))
        };break;

        case "group_message":{  //发送群消息
            e.reply("[CQ:at,qq="+e.user_id+"]\n"+content);
        };break;

        case "bind_whitelist":{    //自助绑定白名单（玩家）
            let xboxid = e.raw_message.replace(re,"$1");   //匹配玩家输入的xboxid
            let players_info_tmp = JSON.parse(fs.readFileSync("./data/players_info.json"));  //读取玩家数据文件并转换为对象
            if(players_info_tmp.some( (val) => val.name===xboxid)){
                e.reply("[CQ:at,qq="+e.user_id+"]\n白名单申请已受理，请勿重复提交！");
            }
            else{
                let add_xboxid = {"name":xboxid,"qqid":e.user_id,"permission":0,"enable":false};
                players_info_tmp.push(add_xboxid);
                return file_rw(e,players_info_tmp,content)
            }
        };break;

        case "add_whitelist":{      //加白名单(管理员)
            for (var f=0 ; f<e.message.length ; f++){   //遍历消息
                let at_qqid = e.message[f].data.qq     //获取管理员所艾特的那个人的qq
                let players_info_tmp = JSON.parse(fs.readFileSync("./data/players_info.json"));  //读取玩家数据文件并转换为对象
                if(e.message[f].type == "at" ){  //检测到消息类型为at时
                    if(players_info_tmp.some( (val) => val.qqid===at_qqid)){     //当玩家数据中的qqid和艾特的qq一致时候
                        for(var p=0 ; p<players_info_tmp.length ; p++){
                            let s = (players_info_tmp.indexOf(players_info_tmp.filter(d=>d.qqid===at_qqid)[p]))    //获取玩家qqid所在对象的索引值
                            if (players_info_tmp[s].enable){
                                e.reply("[CQ:at,qq="+e.user_id+"]\n该玩家已经绑定过了！")
                            }
                            else{
                                ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,"whitelist add \""+players_info_tmp[s].name+"\""))   //通过索引值，将玩家相应的xboxid添加到服务器白名单
                                players_info_tmp[s].enable = true;
                                return file_rw(e,players_info_tmp,content)
                            }
                        }
                    }
                    else{
                        e.reply("[CQ:at,qq="+e.user_id+"]\n该玩家未绑定，无法为其添加白名单！");
                    }
                }
            }
        };break;

        case "unbind_whitelist":{   //解绑（玩家）
            let players_info_tmp = JSON.parse(fs.readFileSync("./data/players_info.json"));  //读取玩家数据文件并转换为对象
            if(players_info_tmp.some((val) => val.qqid===e.user_id)){
                for(var q=0 ; q<players_info_tmp.length ; q++){
                    let s = players_info_tmp.indexOf(players_info_tmp.filter(d=>d.qqid === e.user_id)[q]);
                    ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,"whitelist remove \""+players_info_tmp[s].name+"\""))
                    players_info_tmp.splice(s,1);
                    return file_rw(e,players_info_tmp,content)
                }
            }
            else{
                e.reply("[CQ:at,qq="+e.user_id+"]\n你还没有绑定！");
            }
        };break;

        case "del_whitelist":{      //删白名单(管理员)
            for (var f=0 ; f<e.message.length ; f++){   //遍历消息
                let at_qqid = e.message[f].data.qq     //获取管理员所艾特的那个人的qq
                let players_info_tmp = JSON.parse(fs.readFileSync("./data/players_info.json"));  //读取玩家数据文件并转换为对象
                if(e.message[f].type == "at" ){  //检测到消息类型为at时
                    if(players_info_tmp.some( (val) => val.qqid===at_qqid)){     //当玩家数据中的qqid和艾特的qq一致时
                        for(var p=0 ; p<players_info_tmp.length ; p++){
                            let s = players_info_tmp.indexOf(players_info_tmp.filter(d=>d.qqid === at_qqid)[p]);    //获取玩家qqid所在对象的索引值
                            ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,"whitelist remove \""+players_info_tmp[s].name+"\""));
                            players_info_tmp.splice(s,1);   //通过索引值，从对象中删除该玩家的xboxid
                            return file_rw(e,players_info_tmp,content)
                        }
                    }
                    else{
                        e.reply("[CQ:at,qq="+e.user_id+"]\n该玩家未绑定！");
                    }
                }
            }

        };break;

        case "http_get":{   //发起http_get请求
            http.get(content,(res) => {
                //console.log(`${res.statusCode}OK`);
                e.reply(succeed)
                res.resume();
                }).on('error', (e) => {
                    e.reply(failed)
                console.log(`${e.message}`);
                })
        };break
    }
}

var client = ws.GetWebsocketClient(address , servername , passwd);
client.ws.on("connect",function(con){
    console.log(motd+"WS服务器连接成功！")
    ws_send = con //装载全局ws对象
    con.on("message",function(m){   
        try
        {
            var TempData = AES.decrypt(client.k,client.iv,JSON.parse(m.utf8Data).params.raw);
            let data = JSON.parse(TempData);
            let cause = data.cause;
            let e = data.params;

            switch(cause)
            {
                case "join":{
                    let player = e.sender;
                    bot.sendGroupMsg(groupID[0], "玩家 "+player+" 杀进了服务器");
                };break;
                case "left":{
                    let player = e.sender;
                    bot.sendGroupMsg(groupID[0], "玩家 "+player+" 爬出了服务器");
                };break;
                case "mobdie":{     //玩家死亡事件
                    if (e.mobname == e.mobtype)
                    {
                        let srctype = e.srctype
                        let diepl = e.mobname

                        for (var key in mobs){
                            if(srctype == key){
                                let str = diepl+"被"+mobs[srctype]+"干趴了";
                                bot.sendGroupMsg(groupID[0],str);
                                break;
                            }
                        };
                        if(srctype == "unknown"){
                            bot.sendGroupMsg(groupID[0],diepl+"啪唧一下死掉了（不知道怎么死的）")
                        }
                    }
                };break;
                case "chat":{
                    let player = e.sender;
                    let chat = e.text;
                    bot.sendGroupMsg(groupID[0], "["+servername+"] <"+player+">\n "+chat);
                };break;
                case "runcmdfeedback":{
                    bot.sendGroupMsg(groupID[0],e.result)
                };break;
                case "start":{
                    let str = "服务器已启动";
                    console.log(str);
                    bot.sendGroupMsg(groupID[0], str);
                };break;
                case "stop":{
                    let str = "服务器已关闭"
                    console.log(str);
                    bot.sendGroupMsg(groupID[0], str);
                };break;
                case "plantext":{};break;
                case "decodefailed":{
                    bot.sendGroupMsg(groupID[0], "数据包解析失败，请前往后台查看");
                    console.log("数据包解析失败：",e.msg)
                };break;
            }
        }catch(err)
        {
            console.log(motd+"异常信息：",err.message);
        }
    })
    con.on('error', function(error) {
        console.log(motd+"WS连接出错: " + error.toString());
    });
    con.on('close', function() {
        console.log(motd+"WS连接已关闭！");
        bot.sendGroupMsg(groupID[0],"服务器已关闭")
        setTimeout(function(){client.Connect()},5000)
    });
});
client.ws.on('connectFailed', function(error) {
    console.log(motd+"WS连接失败: " + error.toString());
    setTimeout(function(){client.Connect()},5000)
   
});

client.Connect();
