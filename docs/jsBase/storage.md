## cookie
只能是字符串类型，如果没有设置过期时间，会一直保存在内存直到浏览器关闭，设置了过期时间会被存到内存，知道过期时间到了才消失，最大为4K，且每次获取都要传送cookie给服务器，一般用于判断用户是否登录过网站，便于自动登录，保存上次登录的时间或者页面等

## session
session通过类似与Hashtable的数据结构来保存，能支持任何类型的对象(session中可含有多个对象)，若存在sessionId则直接从服务器中获取，若不存在则新建，大小没有限制，依赖于cookie（sessionID保存在cookie）,但保存的东西过多服务器会有压力，一般用于保存用户的登录信息，购物车之类等。

浏览器第一次访问服务器会在服务器端生成一个session，有一个sessionid和它对应。它存储在服务器的内存中，tomcat的StandardManager类将session存储在内存中，也可以持久化到file，数据库，memcache，Redis等。

客户端只保存sessionid到cookie中，而不会保存session，session销毁只能通过invalidate或超时，关掉浏览器并不会关闭session。

## webStorage
保存在客户端，大小5M
## localStorage
生命周期永久，直到用户删除， 常用于长期登录（+判断用户是否已登录），适合长期保存在本地的数据
## sessionStorage
仅在当前会话中有效，关闭浏览器窗口就会被删除， 敏感账号一次性登录；