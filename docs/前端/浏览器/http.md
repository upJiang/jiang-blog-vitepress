## http 状态码

- 1xx (Informational): 收到请求，正在处理
- 2xx (Successful): 该请求已成功收到，理解并接受
- 3xx (Redirection): 重定向
- 4xx (Client Error): 该请求包含错误的语法或不能为完成
- 5xx (Server Error): 服务器错误

304 服务器根据 if-modified-since，缓存过期时间对比，返回 304，让客户端取缓存

301 将网站上的所有的网页全部重定向

302 请求的资源暂时驻留在不同的 URI 下，故而除非特别指定了缓存头部指示，该状态码
不可缓存

get 请求:

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3fd000cccb39446e849c1187ab1c837f~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3fd000cccb39446e849c1187ab1c837f~tplv-k3u1fbpfcp-watermark.image?)</a>

post 请求：

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fa126269ce4a4b8eb63fb3fa59467602~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fa126269ce4a4b8eb63fb3fa59467602~tplv-k3u1fbpfcp-watermark.image?)</a>

## 概念

HTTPS 是在 HTTP 上建立 SSL 加密层，并对传输数据进行加密，是 HTTP 协议的安全版
。**这就是为什么 https 比 http 安全的原因**<br/> 所谓 HTTPS，其实就是身披 SSL 协
议这层外壳的 HTTP。<br/> 在采用 SSL 后，HTTP 就拥有了 HTTPS 的加密、证书和完整性
保护这些功能<br/> HTTP 协议无法加密数据<br/>

## 加密机制

HTTPS 主要是采用对称密钥加密和非对称密钥加密组合而成的混合加密机制进行传输。就是
发送 https，验证证书，解密

> 注意 md5 非加密算法，他是不可逆的，这个东西只能加密，不能解密，防止密码被破译

## 对称密钥

加密和解密使用相同密钥的算法（ 加密 Key=解密 key），双方获取相同的消息 key，用同
一算法进行加解密，加解密效率很快，不安全 ，无法用来签名和抗抵赖，常用 AES、
DES、RC

## 非对称密钥

双方约定好解密算法，两把钥匙，公钥和私钥中的任一个均可用作加密，此时另一个则用作
解密。安全 ，传输效率较低，常用 RSA、 ECC、 DSA

发送者公钥加密，接收者私钥解密：这个时候是安全的，因为解密的钥匙并未公开

发送者私钥加密，接收者公钥解密：这个时候解密的公钥是公开的，有可能被黑客获取到并
串改里面的内容，那么如何确保消息就是本人发出，这个时候需要**数字证书**（验证数据
被篡改），就是权威机构把发送者发送到公钥进行签名，接收方验证签名，这样就保证了安
全性。

## http2.0

http1.0 每次请求都建立一个 tcp 连接，请求越多，服务器压力巨大，导致后台不得不开
多个服务器

http1.1 浏览器默认一次支持 6 个请求，并且都是异步的，直到所有请求结束

http2.0 多路复用的单一长连接，所有请求走一条通道，速度极大加快，压缩头部

> window.chrome.loadTimes()在浏览器输入查看是否使用 http2.0
