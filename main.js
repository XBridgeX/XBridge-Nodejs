"use strict"
var fs = require('fs');
//let path = require('path');
let data = "./config/global_setting.json"
let datapath = "./config"
let ver = "1.0.0_beta11012343"

function logger(e){
	console.log(e)
};

function init(){
    logger("\n                                                       ████████████\n ██╗  ██╗██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗  ██   ███  ██\n ╚██╗██╔╝██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝  ██    ██  ██\n  ╚███╔╝ ██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗    ██  █  █  ██\n  ██╔██╗ ██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝    ██  ██    ██\n ██╔╝ ██╗██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗  ██  ███   ██\n ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝  ████████████\n                      - Powered by OICQ -\n\n[INFO] XBridgeN版本："+ver);
	if(!fs.existsSync(datapath)){   //创建配置文件目录
        fs.mkdirSync(datapath)
    }
	try{                            //全局配置检测
		if(fs.openSync(data,'r')){
			logger("[INFO] 正在加载全局配置...");
            ocl_core()      //开始加载ocl核心
		}
    }
    catch(err){                     //配置文件错误
        logger("[INFO] 全局配置检查未通过，将会自动创建...")
            let jsonData = {
                "qq": "",
                "use_protocol":1,
                "login_qrcode":true,
                "qq_password":"",
                "ws_address": "",
                "server_name": "",
                "ws_password": "",
                "qq_group":[""]
            }
            
            let text = JSON.stringify(jsonData,null,'\t');
            var fd = fs.openSync(data,'w');
            fs.writeSync(fd, text);
            fs.closeSync(fd);
            console.log("[INFO] 全局配置创建成功！请先修改配置文件，再启动XBridgeN\n")
    }
}
init();

function ocl_core(){
    let config = JSON.parse(fs.readFileSync(data));
    const loginway = config.login_qrcode;//登录方式，默认为为true；（true：扫码登录，false：密码登录）
    const account = config.qq;//机器人qq号码
    const qq_passwd = config.qq_password;//机器人qq密码
    const address = config.ws_address;//ws地址
    const servername = config.server_name;//服务端名称
    const ws_passwd = config.ws_password;//ws密钥
    const groupID = config.qq_group;//群号组

    const conf = {//机器人内部配置
        platform: config.use_protocol,
        kickoff: false,
        ignore_self: true,
        resend: true,
        brief: true		
    }
    const bot = require("oicq").createClient(account,conf)
    setTimeout(()=>{//登录部分
    //默认扫码登录
    if(loginway)
    {
    bot.on("system.login.qrcode", function (e) {
        this.logger.mark("扫码后按Enter完成登录") 
        process.stdin.once("data", () => {
            this.login()
        })
    })
    .on("system.login.error", function (e) {
        if (e.code < 0)
            this.login()
    })
    .login()
    }
    //密码登录
    else{
    bot.on("system.login.slider", function (event) {
        this.logger.mark("需要验证滑块登录！") 
        process.stdin.once("data", (input) => {
            this.sliderLogin(input);
        });
        }).on("system.login.device", function (event) {
        this.logger.mark("验证完成后按回车登录") 
        process.stdin.once("data", () => {
            this.login();
        });
        }).login(qq_passwd);
    }
    },3500)

    setTimeout(function link(){
    exports.bot = bot;//主程序;
    exports.address = address;
    exports.servername = servername;
    exports.qq_passwd = qq_passwd;
    exports.ws_passwd = ws_passwd;
    exports.groupID = groupID;
    exports.datapath = datapath
    require("./app");
    },3000);

    process.stdin.on("data", (input)=>{
        let i = input.toString().trim();
        if (i == "stop"){
            logger("XBridgeN即将退出...")
            setTimeout(function(){process.exit(0)},1000)
        }
    })
}
