var WebSocketClient = require('websocket').client;
const MD5 = require("./MD5");
const AES = require("./AES");
/*
client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
			console.log(message.utf8Data)
        }
    });
});
*/

class wsClient{
    static ifAlive = false;
    static k = "1234567890123456";
    static iv = "1234567890123456";
    static ws = null;
    static fun = [];
    constructor(url,name,pwd){
        this.ws = new WebSocketClient();
        this.url = url;
        this.name = name;
        this.k = MD5.MD5(pwd).toUpperCase().substring(0,16);
        this.iv = MD5.MD5(pwd).toUpperCase().substring(16,32);
    }
    Connect(){
        this.ws.connect(this.url);
    }
    addFunction(func){
        this.fun.pop(func);
    }
}

module.exports.GetWebsocketClient = function (url,name,pwd){
    return new wsClient(url,name,pwd);
}
