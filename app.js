"use strict"
//启用nodejs严格模式
const { bot } = require("./main");//尚未启用机器人，调试的时候会报错
var conf = require("./main");
const ws = require("./Utils/Websocket");
const AES = require("./Utils/AES");
const MD5 = require("./Utils/MD5");
const http = require('http');
const https = require('https');
const osUtils = require('os-utils');
const os = require('os');
const diskinfo = require('diskinfo')
const PHelper = require("./Utils/PackHelper")   //WS发包
var fs = require('fs');
var ws_send = null //初始化全局websocket对象

var address = conf.address;
var servername = conf.servername;
var passwd = conf.ws_passwd;
var groupID = conf.groupID;

var blackbe_url_qq = "https://api.blackbe.xyz/api/qqcheck?v2=true&qq="
var blackbe_url_id = "https://api.blackbe.xyz/api/check?v2=true&id="

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

String.prototype.format= function() {       //文本格式化（占位符实现）
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


//配置文件初始化
function prepare(){
    if(!fs.existsSync(cfg_path)){   //创建config文件夹
        fs.mkdirSync(cfg_path)
    }

    try{        //正则配置初始化
        if(fs.openSync(regex_json,'r')){
			console.log("[XBridgeN] 正在加载正则配置...") 
		}
    }catch(err){
        console.log("[XBridgeN] 正则配置不存在，正在初始化...");
        let regex_obj = [{"regex":"^百度$","permission":0,"actions":[{"type":"http_get","content":"http://www.baidu.com","succeed":"百度一下，你就知道","failed":"请求失败,请检查网络"}]},{"regex":"^查云黑 (xboxid|qq) (.+)$","permission":0,"actions":[{"type":"blackbe_check","content":"[云黑查询结果]"}]},{"regex":"^查服$","permission":0,"actions":[{"type":"runcmd","content":"list"}]},{"regex":"^开服","permission":0,"actions":[{"type":"server_start_nl","content":"请稍后..."}]},{"regex":"^关服$","permission":0,"actions":[{"type":"runcmd","content":"stop"}]},{"regex":"^自杀$","permission":0,"actions":[{"type":"runcmd","content":"kill {player}"}]},{"regex":"^/cmd (.+$)","permission":1,"actions":[{"type":"runcmd_raw","content":"指令发送成功！"}]},{"regex":"^绑定 ([A-Za-z0-9 ]{4,20})$","permission":0,"actions":[{"type":"bind_whitelist","content":"您的Xbox ID“{player}”已绑定，请等待管理员开通白名单！"}]},{"regex":"^我要白名单$","permission":0,"actions":[{"type":"add_whitelist_self","content":"您的Xbox ID“{player}”已添加到服务器白名单！"}]},{"regex":"^我的信息$","permission":0,"actions":[{"type":"bind_check_self","content":"\n您的绑定信息："}]},{"regex":"^查绑定 (.+$)","permission":1,"actions":[{"type":"bind_check","content":"\n查询结果："}]},{"regex":"^加白名单 (.+$)","permission":1,"actions":[{"type":"add_whitelist","content":"已将“{player}”添加到所有服务器的白名单!"}]},{"regex":"^删白名单 (.+$)","permission":1,"actions":[{"type":"del_whitelist","content":"已将“{player}”从所有服务器的白名单中移除!"}]},{"regex":"^解绑$","permission":0,"actions":[{"type":"unbind_whitelist","content":"白名单解绑成功！"}]},{"regex":"^帮助$","permission":0,"actions":[{"type":"group_message","content":"这是一条没用的帮助信息"}]},{"regex":"^状态$","permission":0,"actions":[{"type":"sys_info","content":"服务器状态\nCPU使用：{cpu_usage}\n内存使用：{mem_usage}\n磁盘空间使用：{disk_usage}\n已运行时间：{sys_uptime}"}]}];
        let regex_data = JSON.stringify(regex_obj,null,'\t');
        var fd = fs.openSync(regex_json,'w');
        fs.writeSync(fd, regex_data);
        fs.closeSync(fd);
        console.log("[XBridgeN] 正则配置创建成功！");
    }

    try{        //玩家事件配置初始化
        if(fs.openSync(players_event_json,'r')){
			console.log("[XBridgeN] 正在加载玩家事件配置...");
		}
    }catch(err){
        console.log("[XBridgeN] 玩家事件配置不存在，正在初始化...");
        let players_event_obj = {"join_group_detection":{"enable":true,"request_auto_process":true},"player_join":{"enable":true,"message":"玩家 {player} 加入了服务器"},"player_left":{"enable":true,"message":"玩家 {player} 离开了服务器"},"player_die":{"enable":true,"cause_by_mobs":"玩家 {player} 被 {mob} 杀死了","cause_unknown":"玩家 {player} 啪唧一下死掉了"},"player_chat":{"enable":true,"toServer":"§b[{group_name}] §a<{sender}>§r {content}","toGroup":"[{server_name}] <{player}>\n{content}"},"whitelist_helper":{"enable":true,"member_left_with_bind":"{player}（QQ:{member_qqid}）退出了群聊，正撤销其所有绑定","member_not_bind":"未查询到相关绑定信息！","member_already_bind":"你已经绑定过了！","xboxid_already_bind":"该Xbox ID已被 {bad_qqid} 绑定，请联系管理员解决","member_already_add":"该玩家已经添加过白名单了！"},"runcmd_nofication":true,"player_not_admin":"您不是管理员，无权执行该操作！","member_left":"成员 {member_qqid} 退出了群聊","server_connect_failed":"服务器未开启或连接中断，请稍后重试！"};
        let players_event_data = JSON.stringify(players_event_obj,null,'\t');
        var fd = fs.openSync(players_event_json,'w');
        fs.writeSync(fd, players_event_data);
        fs.closeSync(fd);
        console.log("[XBridgeN] 玩家事件配置创建成功！");
    }

    try{        //玩家数据初始化
        if(fs.openSync(players_info_json,'r')){
			console.log("[XBridgeN] 正在加载玩家数据...");
		}
    }catch(err){
        console.log("[XBridgeN] 玩家数据不存在，正在初始化...")
        var file_open = fs.openSync(players_info_json,'w');
        fs.writeSync(file_open, "[]");
        fs.closeSync(file_open);
        console.log("[XBridgeN] 玩家数据初始化完成！");
    }

    try{        //实体数据初始化
        if(fs.openSync(mobs_json,'r')){
			console.log("[XBridgeN] 正在加载实体数据...");
		}
    }
    catch(err){
        console.log("[XBridgeN] 实体数据不存在，正在初始化...");
        let mobs_obj = {"Player":"玩家","Area Effect Cloud":"区域效果云雾","Armor Stand":"盔甲架","Arrow":"箭","Bat":"蝙蝠","Bee":"蜜蜂","Blaze":"烈焰人","Boat":"船","Cat":"猫","Cave Spider":"洞穴蜘蛛","Chicken":"鸡","Cow":"牛","Creeper":"爬行者","Dolphin":"海豚","Panda":"熊猫","Donkey":"驴","Dragon Fireball":"末影龙火球","Drowned":"溺尸","Egg":"鸡蛋","Elder Guardian":"远古守卫者","Ender Crystal":"末影水晶","Ender Dragon":"末影龙","Enderman":"末影人","Endermite":"末影螨","Ender Pearl":"末影珍珠","Evocation Illager":"唤魔者","Evocation Fang":"唤魔者尖牙","Eye Of Ender Signal":"末影之眼","Falling Block":"下落的方块","Fireball":"火球","Fireworks Rocket":"焰火火箭","Fishing Hook":"鱼钩","Fish.clownfish":"海葵鱼","Fox":"狐狸","Cod":"鳕鱼","Pufferfish":"河豚","Salmon":"鲑鱼","Tropicalfish":"热带鱼","Ghast":"恶魂","Piglin brute":"残暴猪灵","Guardian":"守卫者","Hoglin":"Hoglin","Horse":"马","Husk":"尸壳","Ravager":"劫掠兽","Iron Golem":"铁傀儡","Item":"物品","Leash Knot":"拴绳结","Lightning Bolt":"闪电","Lingering Potion":"滞留药水","Llama":"羊驼","Llama Spit":"羊驼口水","Magma Cube":"岩浆怪","Minecart":"矿车","Chest Minecart":"运输矿车","Command Block Minecart":"命令方块矿车","Furnace Minecart":"动力矿车","Hopper Minecart":"漏斗矿车","Tnt Minecart":"TNT 矿车","Mule":"骡子","Mooshroom":"哞菇","Moving Block":"移动中的方块","Ocelot":"豹猫","Painting":"画","Parrot":"鹦鹉","Phantom":"幻翼","Pig":"猪","Piglin":"猪灵","Pillager":"掠夺者","Polar Bear":"北极熊","Rabbit":"兔子","Sheep":"羊","Shulker":"潜影贝","Shulker Bullet":"潜影贝子弹","Silverfish":"蠹虫","Skeleton":"骷髅","Skeleton horse":"骷髅马","Stray":"流浪者","Slime":"史莱姆","Small Fireball":"小火球","Snowball":"雪球","Snow Golem":"雪傀儡","Spider":"蜘蛛","Splash Potion":"药水","Squid":"鱿鱼","Strider":"炽足兽","Tnt":"TNT 方块","Thrown Trident":"三叉戟","Tripod Camera":"三脚架摄像机","Turtle":"海龟","Vex":"恼鬼","Villager":"村民","Villager.armor":"盔甲匠","Villager.butcher":"屠夫","Villager.cartographer":"制图师","Villager.cleric":"牧师","Villager.farmer":"农民","Villager.fisherman":"渔夫","Villager.fletcher":"制箭师","Villager.leather":"皮匠","Villager.librarian":"图书管理员","Villager.shepherd":"牧羊人","Villager.tool":"工具匠","Villager.weapon":"武器匠","Villager.mason":"石匠","Villager.unskilled":"不熟练的村民","Villager v2":"村民","Vindicator":"卫道士","Wandering Trader":"流浪商人","Witch":"女巫","Wither":"凋灵","Wither Skeleton":"凋灵骷髅","Wither Skull":"凋灵头颅","Wither Skull Dangerous":"凋灵头颅","Wolf":"狼","Xp Orb":"经验球","Xp Bottle":"附魔之瓶","Zoglin":"僵尸疣猪兽","Zombie":"僵尸","Zombie Horse":"僵尸马","Zombified Piglin":"僵尸猪灵","Zombie Villager":"僵尸村民","Zombie Villager V2":"怪人村民"};
        let mobs_data = JSON.stringify(mobs_obj,null,'\t');
        var fd = fs.openSync(mobs_json,'w');
        fs.writeSync(fd, mobs_data);
        fs.closeSync(fd);
        console.log("[XBridgeN] 实体数据创建成功！");
    }
};
prepare();


bot.on("request.group.add",function(e){         //监听加群事件，云黑检测
    console.log(e)
    let pe = JSON.parse(fs.readFileSync(players_event_json));
    if(pe.join_group_detection.enable){
        let url = blackbe_url_qq+e.user_id;
        let notice_type = "join_group";
        let be_target = e.user_id;
        let content = "";
        return blackbe_core(e,url,notice_type,be_target,content)
    };
});

bot.on("notice.group.decrease",function(e){     //监听退群事件，自动解绑白名单
    if(e.group_id == groupID){
        let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
        let qqid = e.user_id;
        let pnb = JSON.parse(fs.readFileSync(players_event_json)).member_left;
        let scf = JSON.parse(fs.readFileSync(players_event_json)).server_connect_failed;
        let message_type = "group";
        let content = JSON.parse(fs.readFileSync(players_event_json)).whitelist_helper.member_left_with_bind;
        return players_whitelist_unbind(e,players_info_tmp,qqid,message_type,content,pnb,scf);
    }
});

bot.on("message.group", function(e){    //监听群消息
    if(e.group_id == groupID){
        logic_main(e)
    }
});

//公共方法：云黑核心
function blackbe_core(e,url,notice_type,be_target,content){
    let pe = JSON.parse(fs.readFileSync(players_event_json));
    https.get(url,(res) => {
        var result_json = "";
        res.on("data",(data)=>{
            result_json+=data
        })
        res.on("end",()=>{
            var get_data = JSON.parse(result_json);
            switch (get_data.error){
                default:{
                    bot.sendGroupMsg(groupID[0],"[云黑查询]\n查询失败：缺少参数，或玩家不存在");
                };
                break;
        
                case 2001:{ //已上报违规，审核中
                    var nickname = get_data.data.name;
                    var result = get_data.message;
                    var details = "\n“"+get_data.data.info+"”";
                    var operation = "云黑检测到你存在疑似违规记录";
                    var action = "拒绝加群";
                };
                break;
        
                case 2002:{ //违规
                    var nickname = get_data.data.name;
                    var result = get_data.message;
                    var details = "\n“"+get_data.data.info+"”";
                    var operation = "云黑检测到你存在违规记录";
                    var action = "拒绝加群";
                };
                break;
        
                case 2003:{ //无违规
                    var nickname = e.nickname;
                    var result = get_data.message;
                    var details = "无";
                    var operation = true;
                    var action = "允许加群";
                };
                break;
            };

            switch(notice_type){
                case "join_group":{
                    if(pe.join_group_detection.request_auto_process){
                        bot.setGroupAddRequest(e.flag, operation);
                    }
                    else{
                        var action = "等待管理员处理"
                    }
                    bot.sendGroupMsg(groupID[0],"[加群通知]\n昵称："+nickname+"\nQQ："+e.user_id+"\n验证消息：\n“"+e.comment+"”\n云黑查询结果："+result+"\n详情："+details+"\n执行动作："+action);
                };
                break;

                case "autonomous_check":{
                    bot.sendGroupMsg(groupID[0],content+"\n查询目标："+be_target+"\n查询结果："+result+"\n详情："+details+"");
                };
                break;
            }
        })
        res.resume();

    }).on('error', (err) => {
        bot.sendGroupMsg(groupID[0],"[云黑查询]\n云黑查询失败，网络问题："`${err.message}`);
    })
}

//公共方法：玩家权限判断
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

//公共方法：玩家数据读写
function file_rw(e,players_info_tmp,message_type,content_processed){
    let players_info = JSON.stringify(players_info_tmp,null,'\t');
    let open_players_info = fs.openSync(players_info_json,'w');
    fs.writeSync(open_players_info, players_info);
    fs.closeSync(open_players_info);
    return reply_type(e,message_type,content_processed);
}

//公共方法：玩家信息检索
function players_info_select(e,players_info_tmp,qqid,content,pnb){
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

//公共方法：白名单绑定
function players_whitelist_bind(e,message_type,qqid,maa,content,scf,pnb){
    let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
    if(players_info_tmp.some( (val) => val.qqid===qqid)){
        
        let s = (players_info_tmp.indexOf(players_info_tmp.filter(d=>d.qqid===qqid)[0]))
        let plobj = {"player":players_info_tmp[s].name}; //新建一个玩家对象
        let content_processed = content.format(plobj);
        if (players_info_tmp[s].enable){
            e.reply("[CQ:at,qq="+e.user_id+"]\n"+maa.format(plobj));
        }
        else{
            try{
                ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,"whitelist add \""+players_info_tmp[s].name+"\""))
                players_info_tmp[s].enable = true;
                return file_rw(e,players_info_tmp,message_type,content_processed);
            }
            catch(err){
                bot.sendGroupMsg(groupID[0],scf);
            }
        }
    }
    else{
        bot.sendGroupMsg(groupID[0],pnb);
    }
}

//公共方法：白名单解绑
function players_whitelist_unbind(e,players_info_tmp,qqid,message_type,content,pnb,scf){
    if(players_info_tmp.some( (val) => val.qqid===qqid)){
        let s = players_info_tmp.indexOf(players_info_tmp.filter(d=>d.qqid === qqid)[0]);
        var plobj = {"player":players_info_tmp[s].name,"member_qqid":qqid};
        let content_processed = content.format(plobj);
        try{
            ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,"whitelist remove \""+players_info_tmp[s].name+"\""));
            players_info_tmp.splice(s,1);
            return file_rw(e,players_info_tmp,message_type,content_processed);
        }
        catch(err){
            e.reply("[CQ:at,qq="+e.user_id+"]\n"+scf);   //服务器连接中断
        }
    }
    else{
        let content_processed = pnb.format({"member_qqid":qqid});
        return reply_type(e,message_type,content_processed);
    }
}

//公共方法：群消息通知
function reply_type(e,message_type,content_processed){
    switch (message_type){
        case "group":
            bot.sendGroupMsg(groupID[0],content_processed);
        break;

        case "at":
            e.reply("[CQ:at,qq="+e.user_id+"]\n"+content_processed);
        break;
    }
}

//主逻辑
function logic_main(e){
    let reg = JSON.parse(fs.readFileSync(regex_json));
    let pe = JSON.parse(fs.readFileSync(players_event_json));
    if(pe.player_chat.enable){      //是否打开群服消息转发
        try{
            let chatobj = {"group_name":e.group_name,"sender":e.sender.card,"content":e.raw_message};
            let str = pe.player_chat.toServer.format(chatobj);
            setTimeout(function(){ws_send.sendUTF(PHelper.GetSendTextPack(k,iv,str))},500);
        }
        catch(err){
            console.error("[XBridgeN] 服务器未开启或连接中断，无法将群消息转发到服务器！");
        };
    };
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
                    let mab = pe.whitelist_helper.member_already_bind;
                    let xab = pe.whitelist_helper.xboxid_already_bind;
                    let maa = pe.whitelist_helper.member_already_add;
                    let pnb = pe.whitelist_helper.member_not_bind;
                    let scf = pe.server_connect_failed;
                    modules(e,re,pe,type,content,mab,xab,maa,pnb,scf,succeed,failed);
                }
            }
        }
    }
}   

//功能模块
function modules(e,re,pe,type,content,mab,xab,maa,pnb,scf,succeed,failed){
    switch(type){
        case "runcmd":{     //执行命令
            try{
                let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
                if(players_info_tmp.some((val) => val.qqid===e.user_id)){
                    let s = (players_info_tmp.indexOf(players_info_tmp.filter(d=>d.qqid===e.user_id)[0]))
                    let plobj = {"player":players_info_tmp[s].name};
                    let content_process = content.format(plobj);
                    ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,content_process));
                }
                else{
                    ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,content));
                }
            }
            catch(err){
                bot.sendGroupMsg(groupID[0],scf);
            };
        };
        break;

        case "group_message":{  //发送群消息
            e.reply("[CQ:at,qq="+e.user_id+"]\n"+content);
        };
        break;

        case "bind_whitelist":{    //自助绑定白名单（玩家）
            if(pe.whitelist_helper.enable){
                let xboxid = e.raw_message.replace(re,"$1");
                let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
                let message_type = "at";
                if(players_info_tmp.some((val) => val.qqid===e.user_id)){   //玩家已经绑定过了
                    e.reply("[CQ:at,qq="+e.user_id+"]\n"+mab);
                }
                else if(players_info_tmp.some((val) => val.name===xboxid)){ //玩家xboxid被别人绑定了
                    let s = (players_info_tmp.indexOf(players_info_tmp.filter(d=>d.name===xboxid)[0]))
                    let bad_guy = {"bad_qqid":players_info_tmp[s].qqid};
                    let str = xab.format(bad_guy)
                    e.reply("[CQ:at,qq="+e.user_id+"]\n"+str);
                }
                else{
                    let add_xboxid = {"name":xboxid,"qqid":e.user_id,"permission":0,"enable":false};
                    let plobj = {"player":xboxid} //新建一个玩家对象
                    let content_processed = content.format(plobj);
                    players_info_tmp.push(add_xboxid);
                    bot.setGroupCard(groupID[0], e.user_id, xboxid);
                    return file_rw(e,players_info_tmp,message_type,content_processed);
                }
            }
        };
        break;

        case "add_whitelist":{      //加白名单(管理员)
            if(pe.whitelist_helper.enable){
                for (var f=0 ; f<e.message.length ; f++){
                    let qqid = e.message[f].data.qq
                    if(e.message[f].type == "at" ){
                        let message_type = "group";
                        players_whitelist_bind(e,message_type,qqid,maa,content,scf,pnb)
                    }
                }
            }
        };
        break;

        case "add_whitelist_self":{     //自助加白名单
            if(pe.whitelist_helper.enable){
                let message_type = "at";
                let qqid = e.user_id;
                return players_whitelist_bind(e,message_type,qqid,maa,content,scf,pnb);
            }
        };
        break;

        case "bind_check_self":{   //查询本人绑定状态
            if(pe.whitelist_helper.enable){
                let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
                let qqid = e.user_id;
                players_info_select(e,players_info_tmp,qqid,content,pnb)
            }
        };
        break

        case "bind_check":{     //查询目标玩家的绑定状态
            if(pe.whitelist_helper.enable){
                for (var j=0 ; j<e.message.length ; j++){
                    let qqid = e.message[j].data.qq
                    let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
                    if(e.message[j].type == "at" ){
                        players_info_select(e,players_info_tmp,qqid,content,pnb);
                    }
                }
            }
        };
        break;

        case "unbind_whitelist":{   //解绑（玩家）
            if(pe.whitelist_helper.enable){
                let qqid = e.user_id
                let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
                let message_type = "at";
                players_whitelist_unbind(e,players_info_tmp,qqid,message_type,content,pnb,scf);
            }
        };
        break;

        case "del_whitelist":{      //删白名单(管理员)
            if(pe.whitelist_helper.enable){
                for (var f=0 ; f<e.message.length ; f++){
                    if(e.message[f].type == "at" ){
                        let qqid = e.message[f].data.qq
                        let players_info_tmp = JSON.parse(fs.readFileSync(players_info_json));
                        let message_type = "group";
                        players_whitelist_unbind(e,players_info_tmp,qqid,message_type,content,pnb,scf)
                    }
                }
            }
        };break;

        case "http_get":{   //发起http_get请求
            let url_re = new RegExp(/(http:\/\/|https:\/\/)(.+)/,"g")
            let http_protocol = content.replace(url_re,"$1");
            let url = content.replace(url_re,"$2");
            let request_option = {
                rejectUnauthorized: false,
                hostname:url,
                path:'/',
                headers:{
                    'Accept':'*/*',
                    'Accept-Encoding':'utf-8',  //这里设置返回的编码方式 设置其他的会是乱码
                    'Accept-Language':'zh-CN,zh;q=0.8',
                    'Connection':'keep-alive',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
                }
            };

            switch (http_protocol){
                case "http://":{
                    var GET = http.get
                };
                break;

                case "https://":{
                    var GET = https.get
                };
                break;
            };

            GET(request_option,(res) => {
                e.reply(succeed)
                res.resume();
            }).on('error', (err) => {
                e.reply(failed)
                console.log(`[XBridgeN] ${err.message}`);
            })
        };
        break;

        case "blackbe_check":{       //查云黑
            let be_type = e.raw_message.replace(re,"$1");
            let be_target = e.raw_message.replace(re,"$2");
            let notice_type = "autonomous_check";

            switch (be_type){
                case "xboxid":{
                    if(be_target != undefined){
                        var url = blackbe_url_id+be_target;
                        return blackbe_core(e,url,notice_type,be_target,content);
                    };
                };
    
                case "qq":{
                    let rr = new RegExp(/[1-9][0-9]{4,}/,"g");
                    if(be_target != undefined){
                        for (var y=0 ; y<e.message.length ; y++){
                            if(e.message[y].type == "at" ){     //如果是@消息
                                var qqid = e.message[y].data.qq;
                                var url = blackbe_url_qq+qqid;
                                return blackbe_core(e,url,notice_type,be_target,content);
                            }
                            else if (be_target == be_target.match(rr)){     //如果不是@消息，则匹配qq正则
                                var url = blackbe_url_qq+be_target;
                                return blackbe_core(e,url,notice_type,be_target,content);
                            };
                        };
                    };
                };
            };
        };
        break;

        case "sys_info":{       //查询服务器状态
            osUtils.cpuUsage(function(cpu) {
                let mem = osUtils.freememPercentage(function(m){
                    return m
                });
                
                let MEMsize = Math.pow(1024,3);

                let day = Math.floor( os.uptime()/ (24*3600) ); // Math.floor()向下取整 
                let hour = Math.floor( (os.uptime() - day*24*3600) / 3600); 
                let minute = Math.floor( (os.uptime() - day*24*3600 - hour*3600) /60 ); 
                let second = os.uptime() - day*24*3600 - hour*3600 - minute*60; 
            
                var current_disk = __dirname.substr(0,2).toLowerCase();
                diskinfo.getDrives(function(err, aDrives) {
                    if(aDrives.some((val) => val.mounted.toLowerCase()===current_disk)){
                        let s = aDrives.indexOf(aDrives.filter(d=>d.mounted.toLowerCase() === current_disk)[0]);
                        var disk_usage = (aDrives[s].used /1024 /1024 /1024).toFixed(0) + "GB/"+(aDrives[s].blocks /1024 /1024 /1024).toFixed(0) + "GB（"+aDrives[s].capacity+"）";
                    }
                    let sysinfo = {
                        "mem_usage":((os.totalmem()-os.freemem())/MEMsize).toFixed(1)+"GB/"+(os.totalmem()/MEMsize).toFixed(0)+"GB（"+((1-mem)*100).toFixed(1)+"%）",
                        "cpu_usage":(cpu*100).toFixed(1)+"%",
                        "disk_usage":disk_usage,
                        "sys_uptime":day + "天"  + hour + "小时" + minute + "分" + second + "秒"
                    }
                    let str = content.format(sysinfo)
                    bot.sendGroupMsg(groupID[0],str)
                })
            });
        };
        break;

        case "runcmd_raw":{     //执行自定义指令
            let cmd = e.raw_message.replace(re,"$1");
            try{
                ws_send.sendUTF(PHelper.GetRuncmdPack(k,iv,cmd));
                e.reply("[CQ:at,qq="+e.user_id+"]\n"+content)
            }
            catch(err){
                e.reply("[CQ:at,qq="+e.user_id+"]\n"+scf)
            }
        };
        break;

        case "server_start_nl":{    //开服（适配NilLauncher）
            ws_send.sendUTF(PHelper.GetServerStartPack(k,iv));
            bot,sendGroupMsg(groupID[0],content);
        };
        break;
    }
}

client.Connect();                       //建立WS客户端连接
client.ws.on("connect",function(con){   //WS客户端连接成功
    console.log("[XBridgeN] WS服务器连接成功！");
    setTimeout(function(){bot.sendGroupMsg(groupID[0], "服务器连接成功！")},2000);
    ws_send = con //装载全局ws对象
    let mobs = JSON.parse(fs.readFileSync(mobs_json))  //实体数据
    let pe = JSON.parse(fs.readFileSync(players_event_json));

    con.on("message",function(m){
        try{
            var TempData = AES.decrypt(client.k,client.iv,JSON.parse(m.utf8Data).params.raw);
            let data = JSON.parse(TempData);
            let cause = data.cause;
            let e = data.params;
            let info = {"player":e.sender}
            //console.log(data)
            switch(cause)
            {
                case "join":{
                    if(pe.player_join.enable){
                        let str = pe.player_join.message.format(info)
                        bot.sendGroupMsg(groupID[0], str);
                    }
                };
                break;

                case "left":{
                    if(pe.player_join.enable){
                        let str = pe.player_left.message.format(info)
                        bot.sendGroupMsg(groupID[0], str);
                    }
                };
                break;

                case "mobdie":{     //玩家死亡事件
                    if (e.mobname == e.mobtype){
                        if (pe.player_die.enable){
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
                    }
                };
                break;

                case "chat":{
                    if(pe.player_chat.enable){      //是否打开群服消息转发
                        let chatobj = {"server_name":servername,"player":e.sender,"content":e.text}
                        let str = pe.player_chat.toGroup.format(chatobj)
                        bot.sendGroupMsg(groupID[0],str);
                    }
                };
                break;

                case "runcmdfeedback":{
                    if(pe.runcmd_nofication){
                        bot.sendGroupMsg(groupID[0],e.result);
                    }
                };
                break;

                case "start":{
                    let str = "服务器已启动";
                    console.log("[XBridgeN] "+str);
                    bot.sendGroupMsg(groupID[0], str);
                };
                break;

                case "stop":{
                    let str = "服务器已关闭"
                    console.log("[XBridgeN] "+str);
                    bot.sendGroupMsg(groupID[0], str);
                };
                break;

                case "plantext":{};break;

                case "debug":{
                    if(e.msg == "正在请求开启服务器"){
                        bot.sendGroupMsg(groupID[0],e.msg)
                    }
                };
                break;

                case "decodefailed":{
                    bot.sendGroupMsg(groupID[0], "数据包解析失败，请前往后台查看");
                    console.error("数据包解析失败：",e.msg)
                };
                break;
            }
        }
        catch(err){
            console.warn("[XBridgeN] 异常信息：",err.message);
        }
    })
    con.on('error', function(error) {
        console.error("[XBridgeN] WS连接出错: " + error.toString());
    });
    con.on('close', function() {
        console.warn("[XBridgeN] WS连接已关闭！");
        bot.sendGroupMsg(groupID[0],"服务器已关闭");
        setTimeout(function(){client.Connect()},5000);
    });
});

client.ws.on('connectFailed', function(error) {     //WS客户端连接失败
    console.error("[XBridgeN] WS连接失败: " + error.toString());
    setTimeout(function(){client.Connect()},5000);
});