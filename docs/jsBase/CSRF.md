<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/752af7ea8ffd44d69608afaf289eb721~tplv-k3u1fbpfcp-watermark.awebp">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/752af7ea8ffd44d69608afaf289eb721~tplv-k3u1fbpfcp-watermark.awebp)</a>

## CSRF攻击
>跨站请求伪造，攻击者盗用了你的身份，以你的名义发送恶意请求。CSRF能够做的事情包括：以你名义发送邮件，发消息，盗取你的账号，甚至于购买商品，虚拟货币转账......造成的问题包括：个人隐私泄露以及财产安全。

比方说你在淘宝网www.taobao.com登录过了，这个时候你的浏览器已经有了你的登录cookie，前提是尚未登出，这个时候有人给你发个链接，这个链接要求访问淘宝网，发送了请求，这个时候你的cookie就被获取了，人家就可以对你的淘宝账号进行操作了

这种攻击必须满足两个条件：<br/>
1. 登录受信任网站A，并在本地生成Cookie。
2. 在不登出A的情况下，访问危险网站B。

## XSS攻击
>跨站脚本攻击，尽一切办法在目标网站上执行非目标网站上原有的脚本  就是往网页里面嵌入代码
往Web页面里插入恶意Script代码，当用户浏览该页之时，嵌入其中Web里面的Script代码会被执行，从而达到恶意攻击用户的目的。

比如用户在一个网站的input中输入javascript代码，这样当用户点击时这个代码就被触发了，或者被存入数据库，当管理员查看的时候就被触发了
```
琅琊榜" onclick="javascript:alert('handsome boy') =====》这个时候就解析成：
<input type="text" value="琅琊榜" onclick="javascript:alert('handsome boy')">
```
### 攻击方式
#### 非持久型攻击
> 都需要修改url的地址内容，就是在页面或者url中输入自己的script代码，不经过数据库，去获取该页面的信息

反射型：攻击者将脚本混在URL里，服务端接收到URL将恶意代码当做参数取出并拼接在HTML里返回，浏览器解析此HTML后即执行恶意代码，获取用户信息

DOM型:将攻击脚本写在URL中，诱导用户点击该URL，如果URL被解析，那么攻击脚本就会被运行。和前者的差别主要在于DOM型攻击不经过服务端
#### 持久型攻击
>在页面操作后储存到了数据库，然后根据这个将储存后的网页发送给别人进行攻击

存储型：在input中输入一些script代码，然后让后台存储，这样就生成了一个带有攻击的的网页。