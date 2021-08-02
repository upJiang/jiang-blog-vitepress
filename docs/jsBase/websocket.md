>区别于http协议，它是一种双向对话的，服务器可以主动向客户端发送信息，基于tcp的协议，ws，常用于聊天室这些

```
只要初始化后，建立连接，监听onmessage，onopen，onclose,onerror即可，然后动态获取数据，动态渲染
path:"ws://192.168.0.200:8005/qrCodePage/ID=1/refreshTime=5",
init: function () {
    if(typeof(WebSocket) === "undefined"){
        alert("您的浏览器不支持socket")
    }else{
       // 实例化socket
       this.socket = new WebSocket(this.path)
       // 监听socket连接
       this.socket.onopen = this.open
       // 监听socket关闭
       this.socket.onclose = this.close
       // 监听socket错误信息
       this.socket.onerror = this.error
       // 监听socket消息
       this.socket.onmessage = this.getMessage
     }
},
```