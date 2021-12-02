>跨域只存在于浏览器端,因为浏览器的同源策略产生了跨域，http默认80端口，https默认443
## 同源策略
* ajax同源策略: <br/>
1. 不同源页面不能获取cookie；
2. 不同源页面不能发起Ajax请求

* dom同源策略： 它限制了不同源页面不能获取DOM

## 解决方案
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8eba9cfb130a414fa7b9977bd9741676~tplv-k3u1fbpfcp-watermark.image?)

## 预检请求
>在发出跨域请求时，如果是非简单请求， 浏览器会自动帮你先发出一个OPTIONS查询请求，称为预检， 用于确认目标资源是否支持跨域，允许后才发送
在简单请求必须满足两个条件：<br/>
1. 使用的方法必须是（之一）：head，get，post
2. 请求的header是： Accept， Accept-Language， Content-Language， Content-Type: 只限于三个值：application/x-www-form-urlencoded、multipart/form-data、text/plain

我们经常用的post+ Content-Type=application/json 也属于非简单请求，这个时候可以让服务器端设置Access-Control-Max-Age字段，这样在缓存未到期时间内，只会发起一次option请求

### 减少CORS预请求的次数
方案一：发出简单请求

方案二：服务端设置Access-Control-Max-Age字段，在有效时间内浏览器无需再为同一个请求发送预检请求。但是它有局限性：只能为同一个请求缓存，无法针对整个域或者模糊匹配 URL 做缓存