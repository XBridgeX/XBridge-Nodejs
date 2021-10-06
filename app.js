const ws = require("./Utils/Websocket");
const AES = require("./Utils/AES");
const MD5 = require("./Utils/MD5");

var client = ws.GetWebsocketClient("ws://127.0.0.1:8080","生存服务器","password");
client.ws.on("connect",function(con){
    con.on("message",function(m){
        try
        {
            //do someting here..
            console.log(AES.decrypt(client.k,client.iv,JSON.parse(m.utf8Data).params.raw));
        }catch(err)
        {
            console.log(err.message);
        }
    })
});
client.Connect();