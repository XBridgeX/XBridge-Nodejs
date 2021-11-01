"use strict"
//启用nodejs严格模式
const { bot } = require("./main");//尚未启用机器人，调试的时候会报错
var conf = require("./main");
const ws = require("./Utils/Websocket");
const AES = require("./Utils/AES");
const MD5 = require("./Utils/MD5");
const http = require('http');
const osUtils = require('os-utils');
const os = require('os');
const PHelper = require("./Utils/PackHelper")   //WS发包
var fs = require('fs');
var ws_send = null //初始化全局websocket对象

var address = conf.address;
var servername = conf.servername;
var passwd = conf.ws_passwd;
var groupID = conf.groupID;

var client = ws.GetWebsocketClient(address , servername , passwd);

let cfg_path = conf.datapath;
let regex_json = cfg_path+"/regex.json";
let mobs_json = cfg_path+"/mobs.json";
let players_info_json = cfg_path+"/players_info.json";
let players_event_json = cfg_path+"/players_event.json";

var k = "1234567890123456";
var iv = "1234567890123456";
k = MD5.MD5(passwd).toUpperCase().substring(0,16);
iv = MD5.MD5(passwd).toUpperCase().substring(16,32);

String.prototype.format= function() {
    if(arguments.length === 0) return this;
    var param = arguments[0], str= this;
    if(typeof(param) === 'object') {
        for(var key in param)
            str = str.replace(new RegExp("\\{" + key + "\\}", "g"), param[key]);
        return str;
    } else {
        for(var i = 0; i < arguments.length; i++)
            str = str.replace(new RegExp("\\{" + i + "\\}", "g"), arguments[i]);
        return str;
    }
}


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
        logger("正则配置不存在，正在初始化...");
        let regex_obj = [{"regex":"^百度$","permission":0,"actions":[{"type":"http_get","content":"http://www.baidu.com","succeed":"百度一下，你就知道","failed":"请求失败,请检查网络"}]},{"regex":"^查服$","permission":0,"actions":[{"type":"runcmd","content":"list"}]},{"regex":"^绑定 ([A-Za-z0-9 ]{4,20})$","permission":0,"actions":[{"type":"bind_whitelist","content":"白名单申请已发送，请等待管理员审核！","whitelist_already_apply":"你已经申请过白名单了，请勿重复提交！"}]},{"regex":"^关于我$","permission":0,"actions":[{"type":"bind_check_self","content":"我的信息：","player_not_bind":"请先绑定白名单！"}]},{"regex":"^查绑定 (.+$)","permission":0,"actions":[{"type":"bind_check","content":"查询结果：","player_not_bind":"该玩家未绑定，未查询到任何信息！"}]},{"regex":"^加白名单 (.+$)","permission":1,"actions":[{"type":"add_whitelist","content":"已将该玩家添加到所有服务器的白名单!","whitelist_already_add":"该玩家已经绑定，且已添加过白名单过了！","player_not_bind":"该玩家未绑定，无法为其添加白名单！"}]},{"regex":"^删白名单 (.+$)","permission":1,"actions":[{"type":"del_whitelist","content":"已将该玩家从所有服务器的白名单中移除!","player_not_bind":"无需删除白名单：该玩家未绑定！"}]},{"regex":"^解绑$","permission":0,"actions":[{"type":"unbind_whitelist","content":"解绑成功！","player_not_bind":"无需解绑：你还没有绑定！"}]},{"regex":"^帮助$","permission":0,"actions":[{"type":"group_message","content":"这是一条没用的帮助信息"}]},{"regex":"^状态$","permission":0,"actions":[{"type":"sys_info","content":"服务器状态\nCPU使用率：{cpu_usage}\n内存使用：{mem_usage_size}"}]}];
        let regex_data = JSON.stringify(regex_obj,null,'\t');
        var fd = fs.openSync(regex_json,'w');
        fs.writeSync(fd, regex_data);
        fs.closeSync(fd);
        logger("正则配置创建成功！")
    }

    try{        //玩家事件配置初始化
        if(fs.openSync(players_event_json,'r')){
			logger("正在加载玩家事件配置...") 
		}
    }catch(err){
        logger("玩家事件配置不存在，正在初始化...");
        let players_event_obj = {"player_not_admin":"您不是管理员，无权执行该操作！","player_join":"玩家 {player} 加入了服务器","player_left":"玩家 {player} 离开了服务器","player_die":{"cause_by_mobs":"玩家 {player} 被 {mob} 杀死了","cause_unknown":"玩家 {player} 啪唧一下死掉了"}};
        let players_event_data = JSON.stringify(players_event_obj,null,'\t');
        var fd = fs.openSync(players_event_json,'w');
        fs.writeSync(fd, players_event_data);
        fs.closeSync(fd);
        logger("玩家事件配置创建成功！")
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
    }
    catch(err){
        logger("实体数据不存在，正在初始化...");
        let mobs_obj = {"Player":"玩家","Area Effect Cloud":"区域效果云雾","Armor Stand":"盔甲架","Arrow":"箭","Bat":"蝙蝠","Bee":"蜜蜂","Blaze":"烈焰人","Boat":"船","Cat":"猫","Cave Spider":"洞穴蜘蛛","Chicken":"鸡","Cow":"牛","Creeper":"爬行者","Dolphin":"海豚","Panda":"熊猫","Donkey":"驴","Dragon Fireball":"末影龙火球","Drowned":"溺尸","Egg":"鸡蛋","Elder Guardian":"远古守卫者","Ender Crystal":"末影水晶","Ender Dragon":"末影龙","Enderman":"末影人","Endermite":"末影螨","Ender Pearl":"末影珍珠","Evocation Illager":"唤魔者","Evocation Fang":"唤魔者尖牙","Eye Of Ender Signal":"末影之眼","Falling Block":"下落的方块","Fireball":"火球","Fireworks Rocket":"焰火火箭","Fishing Hook":"鱼钩","Fish.clownfish":"海葵鱼","Fox":"狐狸","Cod":"鳕鱼","Pufferfish":"河豚","Salmon":"鲑鱼","Tropicalfish":"热带鱼","Ghast":"恶魂","Piglin brute":"残暴猪灵","Guardian":"守卫者","Hoglin":"Hoglin","Horse":"马","Husk":"尸壳","Ravager":"劫掠兽","Iron Golem":"铁傀儡","Item":"物品","Leash Knot":"拴绳结","Lightning Bolt":"闪电","Lingering Potion":"滞留药水","Llama":"羊驼","Llama Spit":"羊驼口水","Magma Cube":"岩浆怪","Minecart":"矿车","Chest Minecart":"运输矿车","Command Block Minecart":"命令方块矿车","Furnace Minecart":"动力矿车","Hopper Minecart":"漏斗矿车","Tnt Minecart":"TNT 矿车","Mule":"骡子","Mooshroom":"哞菇","Moving Block":"移动中的方块","Ocelot":"豹猫","Painting":"画","Parrot":"鹦鹉","Phantom":"幻翼","Pig":"猪","Piglin":"猪灵","Pillager":"掠夺者","Polar Bear":"北极熊","Rabbit":"兔子","Sheep":"羊","Shulker":"潜影贝","Shulker Bullet":"潜影贝子弹","Silverfish":"蠹虫","Skeleton":"骷髅","Skeleton horse":"骷髅马","Stray":"流浪者","Slime":"史莱姆","Small Fireball":"小火球","Snowball":"雪球","Snow Golem":"雪傀儡","Spider":"蜘蛛","Splash Potion":"药水","Squid":"鱿鱼","Strider":"炽足兽","Tnt":"TNT 方块","Thrown Trident":"三叉戟","Tripod Camera":"三脚架摄像机","Turtle":"海龟","Vex":"恼鬼","Villager":"村民","Villager.armor":"盔甲匠","Villager.butcher":"屠夫","Villager.cartographer":"制图师","Villager.cleric":"牧师","Villager.farmer":"农民","Villager.fisherman":"渔夫","Villager.fletcher":"制箭师","Villager.leather":"皮匠","Villager.librarian":"图书管理员","Villager.shepherd":"牧羊人","Villager.tool":"工具匠","Villager.weapon":"武器匠","Villager.mason":"石匠","Villager.unskilled":"不熟练的村民","Villager v2":"村民","Vindicator":"卫道士","Wandering Trader":"流浪商人","Witch":"女巫","Wither":"凋灵","Wither Skeleton":"凋灵骷髅","Wither Skull":"凋灵头颅","Wither Skull Dangerous":"凋灵头颅","Wolf":"狼","Xp Orb":"经验球","Xp Bottle":"附魔之瓶","Zoglin":"僵尸疣猪兽","Zombie":"僵尸","Zombie Horse":"僵尸马","Zombified Piglin":"僵尸猪灵","Zombie Villager":"僵尸村民","Zombie Villager V2":"怪人村民"};
        let mobs_data = JSON.stringify(mobs_obj,null,'\t');
        var fd = fs.openSync(mobs_json,'w');
        fs.writeSync(fd, mobs_data);
        fs.closeSync(fd);
        logger("实体数据创建成功！")
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
function players_info_select_add(e,players_info_tmp,qqid,content,pnb){
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
        e.reply("[CQ:at,qq="+qqid+"]\n"+pnb);
    }
}

//公共方法4：玩家信息检索（删白名单）
function players_info_select_del(e,players_info_tmp,qqid,content,pnb){
    if(players_info_tmp.some( (val) => val.qqid===qqid)){
        let s = players_info_tmp.indexOf(players_info_tmp.filter(d=>d.qqid === qqid)[0]);
        ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,"whitelist remove \""+players_info_tmp[s].name+"\""));
        players_info_tmp.splice(s,1);
        return file_rw(e,players_info_tmp,content)
    }
    else{
        e.reply("[CQ:at,qq="+qqid+"]\n"+pnb);
    }
}

//主逻辑
function logic_main(e){
    let reg = JSON.parse(fs.readFileSync(regex_json));
    let pe = JSON.parse(fs.readFileSync(players_event_json));
    for (var a=0 ; a<reg.length ; a++){
        let re = new RegExp(reg[a].regex,"g");   //正则对象
        if(e.raw_message == e.raw_message.match(re)){   //通过正则匹配玩家消息
            let r = (reg.indexOf(reg.filter(d=>d.regex===d.regex)[a]))    //遍历 获取玩家权限
            if(reg[r].permission == 1 && permission(e) != 1){     //如果正则要求权限为1，但玩家非管理员，则告知无权并跳出循环
                e.reply("[CQ:at,qq="+e.user_id+"]\n"+pe.player_not_admin);
                continue
            }
            else{
                for (var b=0 ; b<reg[r].actions.length ; b++) {    //遍历动作列表
                    let type = reg[r].actions[b].type;  //动作类型
                    let content = reg[r].actions[b].content;
                    let succeed = reg[r].actions[b].succeed;
                    let failed = reg[r].actions[b].failed;
                    let waa0 = reg[r].actions[b].whitelist_already_apply;
                    let waa1 = reg[r].actions[b].whitelist_already_add;
                    let pnb = reg[r].actions[b].player_not_bind;
                    modules(e,re,type,content,waa0,waa1,pnb,succeed,failed);
                }
            }
        }
    }
}   

//功能模块（白名单加减、自定义命令等）
function modules(e,re,type,content,waa0,waa1,pnb,succeed,failed){
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
            if(players_info_tmp.some( (val) => val.qqid===e.user_id)){
                e.reply("[CQ:at,qq="+e.user_id+"]\n"+waa0);
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
                            e.reply("[CQ:at,qq="+e.user_id+"]\n"+waa1)
                        }
                        else{
                            ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,"whitelist add \""+players_info_tmp[s].name+"\""))
                            players_info_tmp[s].enable = true;
                            return file_rw(e,players_info_tmp,content)
                        }
                    }
                    else{
                        e.reply("[CQ:at,qq="+e.user_id+"]\n"+pnb);
                    }
                }
            }
        };
        break;

        case "bind_check_self":{   //查询本人绑定状态
            let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
            let qqid = e.user_id;
            players_info_select_add(e,players_info_tmp,qqid,content,pnb)
        };
        break

        case "bind_check":{     //查询目标玩家的绑定状态
            for (var j=0 ; j<e.message.length ; j++){
                let qqid = e.message[j].data.qq
                let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
                if(e.message[j].type == "at" ){
                    players_info_select_add(e,players_info_tmp,qqid,content,pnb);
                }
            }
        };
        break;

        case "unbind_whitelist":{   //解绑（玩家）
            let qqid = e.user_id
            let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
            players_info_select_del(e,players_info_tmp,qqid,content,pnb)
        };
        break;

        case "del_whitelist":{      //删白名单(管理员)
            for (var f=0 ; f<e.message.length ; f++){
                if(e.message[f].type == "at" ){
                    let qqid = e.message[f].data.qq
                    let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
                    players_info_select_del(e,players_info_tmp,qqid,content,pnb)
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
        break;

        case "sys_info":{
            osUtils.cpuUsage(function(cpu) {
                let mem = osUtils.freememPercentage(function(m){
                    return m
                });
                
                let MEMsize = Math.pow(1024,3);
                let sysinfo = {
                    "mem_usage_precent":((1-mem)*100).toFixed(1)+"%",
                    "mem_usage_size":((os.totalmem()-os.freemem())/MEMsize).toFixed(1)+"GB/"+(os.totalmem()/MEMsize).toFixed(0)+"GB",
                    "cpu_usage":(cpu*100).toFixed(1)+"%"
                }
                let str = content.format(sysinfo)
                bot.sendGroupMsg(groupID[0],str)
            });
        };
        break
    }
}


client.Connect();                       //建立WS客户端连接
client.ws.on("connect",function(con){   //WS客户端连接成功
    logger("WS服务器连接成功！");
    setTimeout(function(){bot.sendGroupMsg(groupID[0], "服务器连接成功！")},3000);
    ws_send = con //装载全局ws对象
    let mobs = JSON.parse(fs.readFileSync(mobs_json))  //实体数据
    let pe = JSON.parse(fs.readFileSync(players_event_json));


    con.on("message",function(m){
        try
        {
            var TempData = AES.decrypt(client.k,client.iv,JSON.parse(m.utf8Data).params.raw);
            let data = JSON.parse(TempData);
            let cause = data.cause;
            let e = data.params;
            let info = {"player":e.sender}

            switch(cause)
            {
                case "join":{
                    let str = pe.player_join.format(info)
                    bot.sendGroupMsg(groupID[0], str);
                };break;
                case "left":{
                    let str = pe.player_left.format(info)

                    bot.sendGroupMsg(groupID[0], str);
                };break;
                case "mobdie":{     //玩家死亡事件
                    if (e.mobname == e.mobtype)
                    {
                        let info = {"player":e.mobname,"mob":mobs[e.srctype]}
                        for (var key in mobs){

                            if(e.srctype == key){
                                let str = pe.player_die.cause_by_mobs.format(info);

                                bot.sendGroupMsg(groupID[0],str);
                                break;
                            }
                        };

                        if(e.srctype == "unknown"){
                            let str = pe.player_die.cause_unknown.format(info);
                            bot.sendGroupMsg(groupID[0],str)
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
            console.log("异常信息：",err.message);
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