# XBridge-Nodejs
基于Nodejs的XBridge

本项目是基于[QICQ](https://github.com/takayama-lily/oicq)机器人框架所开发

文件结构参考了OICQ提供的模板，目前仍在开发中，可以使用main_old.js来进行脱离bot框架进行调试

---

#安装帮助:

本项目依赖nodejs环境，可以运行且不限于Windows、Linux(arm64、x86、amd64...)等环境，但是本项目所支持运行的[KWO](https://github.com/XBridgeX/KWO/releases)仅在win下运行

1. 安装 [Node.js](https://nodejs.org/) 14以上版本  
2. clone到本地并执行 `npm i` 安装依赖
3. 根据需求修改`config.json` (更多配置选项还没有引出，之后更新开放更多可选选项)
    - "qq": 123456,//修改为机器人登陆时的账号
    - "login_qrcode":true,//是否使用扫码登陆，默认true，false的话则密码登陆
    - "password":123456,//密码登陆时填写机器人账号的密码，上面如果选择扫码可以无视
    - "ws_address": "ws://127.0.0.1:8080",//ws服务端地址（kwo所在地址，也可以不同服务器连接，只需开放端口即可）
	- "server_name": "生存服务器",//服务器名称，用于分辨多服
	- "qq_group": [615056067]//群号，可以填写多个，目前仅支持第一个群
4. 启动[KWO](https://github.com/XBridgeX/KWO/releases)（可无需开服，只需要确保ws启用即可）
5. 执行 `npm start` 即可启动程序

---

#使用方法

1、第一次使用先跟着上方的安装流程进行初步安装

2、第一次打开时会自动创建文件夹及配置文件，且框架会自动退出

3、正常使用时输入stop即可停止

4、插件功能待完善...