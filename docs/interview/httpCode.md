
* 1xx (Informational): 收到请求，正在处理
* 2xx (Successful): 该请求已成功收到，理解并接受
* 3xx (Redirection): 重定向
* 4xx (Client Error): 该请求包含错误的语法或不能为完成
* 5xx (Server Error): 服务器错误

304服务器根据if-modified-since，缓存过期时间对比，返回304，让客户端取缓存

301将网站上的所有的网页全部重定向

302请求的资源暂时驻留在不同的URI下，故而除非特别指定了缓存头部指示，该状态码不可缓存

get请求:

![Image.png](https://i.loli.net/2021/08/01/KcdRuTm3oLQhGOZ.png)

post请求：

![Image.png](https://i.loli.net/2021/08/01/sBjHbmF7MXNALyq.png)