"use strict"
var fs = require('fs');
let path = require('path');
let readline = require('readline')
let data = "./data/config.json"
let datapath = "./data"

function logger(e)
{
	console.log(e)
};

setTimeout(()=>logger('欢迎使用XBridge&OCL集成版'),100);

function init(){
	if(!fs.existsSync(datapath)){fs.mkdirSync(datapath)}
	try{
		if(fs.openSync(data,'r'))//配置文件创建
		{
			logger("[INFO]检测配置文件存在，准备启动BOT...") 
		}}catch(err){
			logger("[INFO]配置文件不存在！准备自动创建...")
			let jsonData = {
				"qq": 123456,
				"login_qrcode":true,
				"password":123456,
                "ws_address": "ws://127.0.0.1:8080",
                "server_name": "生存服务器",
                "password": "password",
                "qq_group":[123456]
			}
			let text = JSON.stringify(jsonData,null,'\t');
			let file = path.join(datapath, 'config.json');
			var fd = fs.openSync(data,'w');
			fs.writeSync(fd, text);
			setTimeout(()=>logger('[INFO]文件创建成功！文件名：' + file+"\n-------------------------\n[WARN]第一次文件创建完成请手动修改配置文件后使用！3s后准备强制退出...\n-------------------------"),100);
			fs.closeSync(fd);
			setTimeout(function(){process.exit(0)},3000)//强制退出，延时3s
		}
}

init();
console.log(" ██     ██ ██████          ██      ██                \n░░██   ██ ░█░░░░██        ░░      ░██  █████         \n ░░██ ██  ░█   ░██  ██████ ██     ░██ ██░░░██  █████ \n  ░░███   ░██████  ░░██░░█░██  ██████░██  ░██ ██░░░██\n   ██░██  ░█░░░░ ██ ░██ ░ ░██ ██░░░██░░██████░███████\n  ██ ░░██ ░█    ░██ ░██   ░██░██  ░██ ░░░░░██░██░░░░ \n ██   ░░██░███████ ░███   ░██░░██████  █████ ░░██████\n░░     ░░ ░░░░░░░  ░░░    ░░  ░░░░░░  ░░░░░   ░░░░░░ \n");
let config = JSON.parse(fs.readFileSync(data));
const loginway = config.login_qrcode;//登陆方式，默认为为true；（true：扫码登陆，false：密码登陆）
const account = config.qq;//机器人qq号
const password = config.password;
const address = config.ws_address;//ws地址
const servername = config.server_name;//服务端名称
const ws_passwd = config.password;//ws密码
const groupID = config.qq_group;//群号组

const conf = {//机器人内部配置
		platform: 2,//2：使用安卓pad协议
		kickoff: false,
		ignore_self: true,
		resend: true,
		brief: true		
}
const bot = require("oicq").createClient(account,conf)
setTimeout(()=>{//登陆部分
//默认扫码登陆
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
//密码登陆
else{
	bot.on("system.login.slider", function (event) {
		this.logger.mark("需要验证滑块登陆！") 
		process.stdin.once("data", (input) => {
		  this.sliderLogin(input);
		});
	  }).on("system.login.device", function (event) {
		this.logger.mark("验证完成后按回车登录") 
		process.stdin.once("data", () => {
		  this.login();
		});
	  }).login(password);
}
},3500)

setTimeout(function link(){
    exports.bot = bot;//主程序;
    exports.address = address;
    exports.servername = servername;
    exports.ws_passwd = ws_passwd;
    exports.groupID = groupID;
	require("./app");
},3000);

//控制台指令控制
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})
rl.on('line', (str) => {
    if (str === 'stop') {
		logger("Bot即将退出...")
		setTimeout(function(){process.exit(0)},1000)
    }
})
// rl.on('line', (str) => {
//     if (str === 'reload') {
// 		logger("插件正在重载...")
// 		setTimeout(function(){load()},1000)
//     }
// })
