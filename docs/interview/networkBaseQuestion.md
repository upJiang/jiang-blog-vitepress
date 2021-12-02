[梳理50道经典计算机网络面试题](https://mp.weixin.qq.com/s/jX3dsZmUa1TLLMt2GSwPWQ)

## http中的keep-alive
保证我们的HTTP请求能建立一个持久连接。也就是说建立一次TCP连接即可进行多次请求和响应的交互

## 域名为什么要解析成ip地址
网络通讯大部分是基于TCP/IP的，而TCP/IP是基于IP地址的，所以计算机在网络上进行通讯时只能识别如“202.96.134.133”之类的IP地址

## UDP、TCP
UDP:无连接的面向报文、不可靠的，但是速度快，支持一对多，多对多等。常用于视频直播这种，为什么dns使用udp，因为减少了tcp连接时间，dns域名解析更快 （视频语音聊天，场景）

TCP：面向连接的可靠传输，安全的，可靠协议，三次握手等保证其安全，http,ftp,ssh都是基于tcp做的

## 为什么三次握手四次挥手
为了防止已失效的连接请求报文段突然又传送到了服务端，因而产生错误

## http报文 
![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4d99aaf10b8d49fd929bb7a4c19627a3~tplv-k3u1fbpfcp-watermark.image?)

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ceb0c744e8c44c29863eb0b1bb1985f8~tplv-k3u1fbpfcp-watermark.image?)

## get 和post的区别
get:某些浏览器对请求地址的长度有限制，url暴露，不能发送文件， 表单查询，查询结果页面可以收藏，不能修改服务器数据（最重要）

post:可以发送文件，url隐藏，可以改变服务器数据