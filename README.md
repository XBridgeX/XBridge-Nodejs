# XBridge-Nodejs简介
![GitHub](https://img.shields.io/github/license/XBridgeX/XBridge-Nodejs) ![GitHub forks](https://img.shields.io/github/forks/XBridgeX/XBridge-Nodejs) ![GitHub contributors](https://img.shields.io/github/contributors/XBridgeX/XBridge-Nodejs?color=orange) ![GitHub last commit](https://img.shields.io/github/last-commit/XBridgeX/XBridge-Nodejs?color=purple)

**XBridge-Nodejs** 是XBridgeX项目下的一个MC群服互通机器人，基于[QICQ](https://github.com/takayama-lily/oicq)机器人框架、Node.js编程语言进行构建。
目前，XBridge支持与以下主流的WebSocket服务端进行对接：

WebSocket服务端|项目状态
--|--
[KWO](https://github.com/XBridgeX/KWO)|活动，开发中
[LLWebSocket（原BDXWebSocket）](https://www.minebbs.com/resources/c-bdx-liteloader-bdswebsocketapi.2150/)|活动
XWebSocket|停更，已转向KWO

---

# 使用说明
## 环境要求
* XBridge-Nodejs可以在主流的操作系统平台（包括但不限于Windows、Linux）上运行；
* Node.js版本必须为14.x及以上

## 用户配置指南
1. 安装 [Node.js](https://nodejs.org/)（要求Node.js版本为14.x及以上）；
2. 将本项目克隆到本地：
```bash
git clone https://github.com/XBridgeX/XBridge-Nodejs.git
```
3. 进入XBridge-Nodejs目录，在该目录下打开终端，输入 `npm i` 安装依赖模块；
4. 在终端钟输入`node main.js`启动机器人。初次启动后会在目录下创建配置文件，并自动退出。配置文件位于`/data`目录下；
5. 打开`/data/config.json` ，根据实际情况进行配置。以下是配置示例（请不要抄注释）：
```json
{
	"qq": 123456,   //机器人QQ账号
	"login_qrcode": true,  //是否使用扫码登录，默认为true。如使用密码登录，请改为false
	"qq_password": "qqpassword",  //机器人QQ密码。仅在"login_qrcode"为false（使用密码登录）时，该项配置才有效
	"ws_address": "ws://127.0.0.1:8080",    //Websocket服务端地址
	"server_name": "生存服务器",  //服务器名称，目前暂时只支持一个服务器
	"ws_password": "wspassword",    //WebSocket通信密钥，请与WebSocket服务端通信密钥保持一致
	"qq_group": [
		123456   //QQ群号，目前暂时只支持一个QQ群
	]
}
```
6. 启动任意一个WebSocket服务端，然后启动本机器人。当控制台出现以下类似的提示时，说明机器人配置无误且运行正常：
```
WS服务器连接成功！
[2021-10-21T15:54:18.496] [MARK] [iPad:123456] - 正在探索可用服务器...
[2021-10-21T15:54:18.551] [MARK] [iPad:123456] - connecting to 109.244.168.25:8080
[2021-10-21T15:54:18.595] [MARK] [iPad:123456] - 109.244.168.25:8080 connected
[2021-10-21T15:54:18.973] [MARK] [iPad:123456] - Welcome, abc ! 初始化资源...
[2021-10-21T15:54:19.205] [MARK] [iPad:123456] - 加载了1个好友，1个群，1个陌生人。
[2021-10-21T15:54:19.349] [MARK] [iPad:123456] - 初始化完毕，开始处理消息。
```

## 高级功能（针对开发人员）
* 你也可以使用main_old.js，脱离bot框架进行调试。
* 更多功能待完善...
---
