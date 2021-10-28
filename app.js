"use strict"
//启用nodejs严格模式
const { bot } = require("./main");//尚未启用机器人，调试的时候会报错
var conf = require("./main");
const ws = require("./Utils/Websocket");
const AES = require("./Utils/AES");
const MD5 = require("./Utils/MD5");
const http = require('http');
const PHelper = require("./Utils/PackHelper")   //WS发包
var fs = require('fs');
var ws_send = null //初始化全局websocket对象

var address = conf.address;
var servername = conf.servername;
var passwd = conf.ws_passwd;
var groupID = conf.groupID;

var client = ws.GetWebsocketClient(address , servername , passwd);

let cfg_path = conf.datapath
let regex_json = cfg_path+"/regex.json"
let mobs_json = cfg_path+"/mobs.json"
let players_info_json = cfg_path+"/players_info.json"

var k = "1234567890123456";
var iv = "1234567890123456";
k = MD5.MD5(passwd).toUpperCase().substring(0,16);
iv = MD5.MD5(passwd).toUpperCase().substring(16,32);


//控制台消息
function logger(e)
{
	console.log("[XBridge] "+e)
};

//配置文件初始化
function prepare(){
    if(!fs.existsSync(cfg_path)){   //创建config文件夹
        fs.mkdirSync(cfg_path)
    }

    try{        //正则配置初始化
        if(fs.openSync(regex_json,'r')){
			logger("正在加载正则配置...") 
		}
    }catch(err){
        logger("正则配置不存在，使用示例配置进行创建...");
        try{
            fs.copyFileSync("./example/regex_example.json",regex_json);
            logger("正则配置创建成功！")
        }
        catch(err){
            logger("正则配置创建失败：示例配置不存在，请到XBridge交流群寻求技术支持！")
        }
    }

    try{        //玩家数据初始化
        if(fs.openSync(players_info_json,'r')){
			logger("正在加载玩家数据...") 
		}
    }catch(err){
        logger("玩家数据不存在，正在初始化...")
        var file_open = fs.openSync(players_info_json,'w');
        fs.writeSync(file_open, "[]");
        fs.closeSync(file_open)
        logger("玩家数据初始化完成！")
    }

    try{        //实体数据初始化
        if(fs.openSync(mobs_json,'r')){
			logger("正在加载实体数据...") 
		}
    }catch(err){
        logger("实体数据不存在，使用示例配置进行创建...");
        try{
            fs.copyFileSync("./example/mobs_example.json",mobs_json);
            logger("实体数据创建成功！")
        }
        catch(err){
            logger("实体数据创建失败：示例配置不存在，请到XBridge交流群寻求技术支持！")
        }
    }
};
prepare();



bot.on("message.group", function(e){    //开始监听群消息
    if(e.group_id == groupID){
        logic_main(e)
    }
})

//公共方法1：玩家权限判断
function permission(e) {
    let players_info = JSON.parse(fs.readFileSync(players_info_json))
    for(var i=0 ; i<players_info.length ; i++){
        if(players_info[i].qqid == e.user_id){
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
    let open_players_info = fs.openSync(players_info_json,'w');
    fs.writeSync(open_players_info, players_info);
    fs.closeSync(open_players_info);
    e.reply("[CQ:at,qq="+e.user_id+"]\n"+content);
}

//公共方法3：玩家信息检索（加白名单）
function players_info_select_add(e,players_info_tmp,qqid,content){
    if(players_info_tmp.some((val) => val.qqid===qqid)){
        let s = players_info_tmp.indexOf(players_info_tmp.filter(d=>d.qqid === qqid)[0]);
        let reply_xboxid = players_info_tmp[s].name
        let reply_qqid = players_info_tmp[s].qqid

        switch(players_info_tmp[s].permission){ //权限判断
            case 0:
                var reply_permission = "普通成员"
            break;

            case 1:
                var reply_permission = "管理员"
            break;
        }

        switch(players_info_tmp[s].enable){ //白名单状态判断
            case true:
                var reply_wl_status = "已添加"
            break;

            case false:
                var reply_wl_status = "待添加"
            break;
        }
        e.reply("[CQ:at,qq="+qqid+"] "+content+"\nXbox ID："+reply_xboxid+"\nQQ："+reply_qqid+"\n权限等级："+reply_permission+"\n白名单状态："+reply_wl_status);
    }
    else{
        e.reply("[CQ:at,qq="+qqid+"]\n找不到玩家信息！");
    }
}

//公共方法4：玩家信息检索（删白名单）
function players_info_select_del(e,players_info_tmp,qqid,content){
    if(players_info_tmp.some( (val) => val.qqid===qqid)){
        let s = players_info_tmp.indexOf(players_info_tmp.filter(d=>d.qqid === qqid)[0]);
        ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,"whitelist remove \""+players_info_tmp[s].name+"\""));
        players_info_tmp.splice(s,1);
        return file_rw(e,players_info_tmp,content)
    }
    else{
        e.reply("[CQ:at,qq="+qqid+"]\n玩家未绑定！");
    }
}

//主逻辑
function logic_main(e){
    let reg = JSON.parse(fs.readFileSync(regex_json))
    for (var a=0 ; a<reg.length ; a++){
        let re = new RegExp(reg[a].keywords,"g");   //正则对象
        if(e.raw_message == e.raw_message.match(re)){   //通过正则匹配玩家消息
            let r = (reg.indexOf(reg.filter(d=>d.keywords===d.keywords)[a]))    //遍历 获取玩家权限
            if(reg[r].permission == 1 && permission(e) != 1){     //如果正则要求权限为1，但玩家非管理员，则告知无权并跳出循环
                e.reply("[CQ:at,qq="+e.user_id+"]\n您不是管理员，无权执行该操作！");
                continue
            }
            else{
                for (var b=0 ; b<reg[r].actions.length ; b++) {    //遍历动作列表
                    let type = reg[r].actions[b].type;  //动作类型
                    let content = reg[r].actions[b].content;
                    let succeed = reg[r].actions[b].succeed;
                    let failed = reg[r].actions[b].failed;
                    modules(e,re,type,content,succeed,failed)
                }
            }
        }
    }
}   

//功能模块（白名单加减、自定义命令等）
function modules(e,re,type,content,succeed,failed){
    switch(type)
    {
        case "runcmd":{     //执行命令
            ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,content))
        };
        break;

        case "group_message":{  //发送群消息
            e.reply("[CQ:at,qq="+e.user_id+"]\n"+content);
        };
        break;

        case "bind_whitelist":{    //自助绑定白名单（玩家）
            let xboxid = e.raw_message.replace(re,"$1");
            let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
            if(players_info_tmp.some( (val) => val.name===xboxid)){
                e.reply("[CQ:at,qq="+e.user_id+"]\n白名单申请已受理，请勿重复提交！");
            }
            else{
                let add_xboxid = {"name":xboxid,"qqid":e.user_id,"permission":0,"enable":false};
                players_info_tmp.push(add_xboxid);
                return file_rw(e,players_info_tmp,content)
            }
        };
        break;

        case "add_whitelist":{      //加白名单(管理员)
            for (var f=0 ; f<e.message.length ; f++){
                let at_qqid = e.message[f].data.qq
                let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
                if(e.message[f].type == "at" ){
                    if(players_info_tmp.some( (val) => val.qqid===at_qqid)){
                        let s = (players_info_tmp.indexOf(players_info_tmp.filter(d=>d.qqid===at_qqid)[0]))
                        if (players_info_tmp[s].enable){
                            e.reply("[CQ:at,qq="+e.user_id+"]\n该玩家已经绑定，且已添加过白名单过了！")
                        }
                        else{
                            ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,"whitelist add \""+players_info_tmp[s].name+"\""))
                            players_info_tmp[s].enable = true;
                            return file_rw(e,players_info_tmp,content)
                        }
                    }
                    else{
                        e.reply("[CQ:at,qq="+e.user_id+"]\n该玩家未绑定，无法为其添加白名单！");
                    }
                }
            }
        };
        break;

        case "bind_check_self":{   //查询本人绑定状态
            let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
            let qqid = e.user_id;
            players_info_select_add(e,players_info_tmp,qqid,content)
        };
        break

        case "bind_check":{     //查询目标玩家的绑定状态
            for (var j=0 ; j<e.message.length ; j++){
                let qqid = e.message[j].data.qq
                let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
                if(e.message[j].type == "at" ){
                    players_info_select_add(e,players_info_tmp,qqid,content);
                }
            }
        };
        break;

        case "unbind_whitelist":{   //解绑（玩家）
            let qqid = e.user_id
            let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
            players_info_select_del(e,players_info_tmp,qqid,content)
        };
        break;

        case "del_whitelist":{      //删白名单(管理员)
            for (var f=0 ; f<e.message.length ; f++){
                if(e.message[f].type == "at" ){
                    let qqid = e.message[f].data.qq
                    let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
                    players_info_select_del(e,players_info_tmp,qqid,content)
                }
            }

        };break;

        case "http_get":{   //发起http_get请求
            http.get(content,(res) => {
                //console.log(`${res.statusCode}OK`);
                e.reply(succeed)
                res.resume();

                }).on('error', (err) => {
                    e.reply(failed)
                    console.log(`${err.message}`);
                })
        };
        break
    }
}



client.Connect();                       //建立WS客户端连接
client.ws.on("connect",function(con){   //WS客户端连接成功
    logger("WS服务器连接成功！")
    ws_send = con //装载全局ws对象
    let mobs = JSON.parse(fs.readFileSync(mobs_json))  //实体数据
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
                    logger("数据包解析失败：",e.msg)
                };break;
            }
        }catch(err)
        {
            console.log(motd+"异常信息：",err.message);
        }
    })
    con.on('error', function(error) {
        logger("WS连接出错: " + error.toString());
    });
    con.on('close', function() {
        logger("WS连接已关闭！");
        bot.sendGroupMsg(groupID[0],"服务器已断开连接")
        setTimeout(function(){client.Connect()},5000)
    });
});

client.ws.on('connectFailed', function(error) {     //WS客户端连接失败
    logger("WS连接失败: " + error.toString());
    setTimeout(function(){client.Connect()},5000)
   
});