# XBridge-N概述
![GitHub](https://img.shields.io/github/license/XBridgeX/XBridge-Nodejs) ![GitHub forks](https://img.shields.io/github/forks/XBridgeX/XBridge-Nodejs) ![GitHub contributors](https://img.shields.io/github/contributors/XBridgeX/XBridge-Nodejs?color=orange) ![GitHub last commit (branch)](https://img.shields.io/github/last-commit/XBridgeX/XBridge-Nodejs/dev)

**XBridge-N** 是XBridgeX项目下的一个MC群服互通机器人，基于[OICQ](https://github.com/takayama-lily/oicq)机器人框架、Node.js平台进行构建。
目前，XBridge-N已支持与以下主流的WebSocket服务端进行对接：

WebSocket服务端|项目状态
--|--
[KWO](https://github.com/XBridgeX/KWO)|活动，开发中
[LLWebSocket（原BDXWebSocket）](https://www.minebbs.com/resources/c-bdx-liteloader-bdswebsocketapi.2150/)|活动
XWebSocket|停更，已转向KWO

---

# XBridge-N使用指南
## 环境要求
* 主流的操作系统平台（包括但不限于Windows、Linux、MacOS）；
* 操作系统需要安装Node.js环境，且Node.js版本要求为14.x及以上

## 基本操作
1. 安装 [Node.js](https://nodejs.org/)（要求Node.js版本为14.x及以上）；
2. 将本项目克隆到本地：
```bash
git clone https://github.com/XBridgeX/XBridge-Nodejs.git
```
3. 进入XBridge-Nodejs目录，在该目录下打开终端，输入 `npm i` 安装依赖模块；
4. 在终端输入`node main.js`启动机器人。初次启动后会在目录下创建配置文件，并自动退出。配置文件位于`/config`目录下；
5. 根据实际情况修改好配置文件后，再次启动机器人；
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

## 配置文件
### 全局配置
全局配置文件为`/config/global_setting.json` ，用于保存QQ登录、WebSocket连接等相关配置信息。以下是配置示例（正式配置时，请不要在文件内写注释）：
```json
{
	"qq": 123456,   //机器人QQ账号
	"login_qrcode": true,  //是否使用扫码登录，默认为true。如使用密码登录，请改为false
	"qq_password": "qqpassword",  //机器人QQ密码。仅在"login_qrcode"为false（使用密码登录）时，该项配置才有效
	"ws_address": "ws://127.0.0.1:8080",    //Websocket服务端地址
	"ws_password": "wspassword",    //WebSocket通信密钥，请与WebSocket服务端通信密钥保持一致
	"qq_group": [
		"123456"   //QQ群号，目前暂时只支持一个QQ群
	],
	"server_name": "生存服务器",  //服务器名称，目前暂时只支持一个服务器
}
```


### 正则表达式
正则表达式配置文件为`/config/regex.json`，用于保存群消息自动应答规则。当玩家在群内发送消息时，如果发送的文本和正则表达式中的关键词匹配，且玩家权限与该段关键词的所需权限匹配，即可触发相应的功能。配置示例如下：
```json
[
	{
        "keywords":"^绑定 ([A-Za-z0-9 ]{4,20})$",	//正则表达式，用于匹配群消息中的关键词
        "permission":0,		//执行动作所需权限，0为普通成员，1为管理员
        "actions":[		//关键词匹配时执行的动作，支持一个或多个
            {
                "type":"bind_whitelist",	//动作类型，见说明
                "content":"白名单申请已发送，请等待管理员审核！"	//动作内容，见说明
            }
        ]
    }
]
```

XBridge-N默认包含了默认的正则表达式配置。用户也可以对正则内容进行修改，满足各种使用需求。

keywords（关键词）|permission（权限）|type（动作类型）|content（内容）|实现功能|
--|--|--|--|--
^绑定 ([A-Za-z0-9 ]{4,20})$|0|bind_whitelist|白名单申请已发送，请等待管理员审核！|群内发送“绑定 xbx2021”，为自己绑定白名单
^解绑$|0|unbind_whitelist|解绑成功！|群内发送“解绑”，为自己解绑白名单
^关于我$|0|bind_check_self|我的信息：|群内发送“关于我”，查询自己的绑定状态
^加白名单 (.+$)|1|add_whitelist|已将该玩家添加到所有服务器的白名单!|群内发送“加白名单 @某人”，为目标玩家添加白名单
^删白名单 (.+$)|1|del_whitelist|已将该玩家从所有服务器的白名单中移除!|群内发送“删白名单 @某人”，撤销目标玩家白名单
^查绑定 (.+$)|1|bind_check|查询结果：|群内发送“查绑定 @某人”，查询目标玩家的绑定状态
^查服$|1|runcmd|list|群内发送“查服”，返回服务器指令“/list”的执行结果|执行服务器指令
^百度$|0|http_get|http://www.baidu.com|群内发送“百度”，向“http://www.baidu.com”发起异步http_get请求
^帮助$|0|group_message|没用的帮助信息|群内发送“帮助”，得到回复“没用的帮助信息”


### 实体数据
实体命名配置文件为`./config/mobs.json`，用于保存实体（玩家、生物）命名。当玩家/生物被杀时，会通过该文件的内容将死亡事件转发到群内。以下是配置示例：
```json
{
	"Arrow": "箭",
	"Bat": "蝙蝠",
	"Bee": "蜜蜂",
	"Blaze": "烈焰人"
}
```

### 玩家配置
玩家配置文件为`./config/players_info.json`，用于保存玩家的各项信息。一般情况下无需改动。如果需要将玩家设置为机器人管理员，只需将"permission"项的值修改为1即可。以下是配置示例：
```json
[
	{
		"name": "Asurin",		//玩家昵称（Xbox ID）
		"qqid": 824907403,		//玩家QQ账号
		"permission": 0,		//玩家权限，默认为0。0为普通成员，1为管理员
		"enable": false			//绑定状态，false为已绑定、未添加白名单，true为已绑定、已添加白名单
	}
]
```
---
