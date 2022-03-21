>之前一直用的腾讯云服务器（大学时候是一块钱一个月单核2G），域名是大学时候就备案好的，然后使用 github page + vitepress 搭建了个人博客。最近云服务器快到期了，就花298大洋买了三年的腾讯云轻量应用服务器。记录自己配置新购服务器的流程，也欢迎大家访问我的博客~

买了新的服务器，就要折腾一下，作为前端，了解服务器知识也是很有必要的，拥有自己的服务器与网站也是必备的。

这里我主要做了这些:
- 轻量服务器安装宝塔，使用宝塔安装 gitlab
- 配置主域名( [junfeng530.xyz](junfeng530.xyz) )访问服务器 ip
- 使用子域名( [gitlab.junfeng530.xyz](gitlab.junfeng530.xyz) )作为 gitlab 地址
- 使用子域名( [blog.junfeng530.xyz](blog.junfeng530.xyz) )作为博客地址(github page)

附：域名配置 ssl，[配置教程](https://cloud.tencent.com/document/product/400/50874)

##  轻量服务器安装宝塔，使用宝塔安装 gitlab
- 1. 购买轻量服务器，[轻量应用服务器_Lighthouse (tencent.com)](https://cloud.tencent.com/product/lighthouse)
- 2. 安装宝塔 linux 镜像
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d1be77fa92c24016ac9c55c9a586a32d~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d1be77fa92c24016ac9c55c9a586a32d~tplv-k3u1fbpfcp-watermark.image?)</a>
- 4. 宝塔默认8888端口，防火墙添加8888端口，备注宝塔
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e7fa81d32b6749878ced40db65ce67b4~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e7fa81d32b6749878ced40db65ce67b4~tplv-k3u1fbpfcp-watermark.image?)</a>
- 3. 登录宝塔，复制命令获取宝塔登录地址跟用户名和密码
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a2aa99022f2b4cf78470484743f1e8f6~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a2aa99022f2b4cf78470484743f1e8f6~tplv-k3u1fbpfcp-watermark.image?)</a>
- 4. 登录后注册并登录手机号，并且按照指引关联腾讯云的 appid
- 5. 在宝塔的软件商店安装 gitlab 最新社区版，安装过程大约十分钟，安装完就可以使用给出的地址访问您的 gitlab 了，软件的设置会提供 gitlab 的管理员账号跟密码，登录 gitlab 设置语言，配置 ssh 等等。。。
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2b1f6d1f0ef34846a3ab8a0bdfbddd51~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2b1f6d1f0ef34846a3ab8a0bdfbddd51~tplv-k3u1fbpfcp-watermark.image?)</a>
- 6. 在宝塔的软件商店安装 nginx
    - 没有配置好域名以及ssl，在/www/server/nginx/html 目录上传静态文件，通过 ip 加文件名访问
    - 配置好了域名，在 www 文件夹上会有域名文件夹，在域名文件夹上传并访问

此时只能使用 ip 地址访问 gitlab，接下来我们来使用子域名，设置反向代理来访问 gitlab，网上很多都是通过改 gitlab 配置文件，一堆操作，我试了很多遍无效。其实只需要新增一个子域名网站，配置反向代理即可。

## 配置主域名做为网站首页
- 添加网站
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/43fc803ec42a4750a956487d20e8898b~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/43fc803ec42a4750a956487d20e8898b~tplv-k3u1fbpfcp-watermark.image?)</a>
- 添加一个 www 的解析记录
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7bfc020a3963415cb9202c684133cf6f~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7bfc020a3963415cb9202c684133cf6f~tplv-k3u1fbpfcp-watermark.image?)</a>
完成后访问主域名就是服务器的 ip 地址了

## 配置子域名访问 gitlab
- 添加子域名: <br>
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5b6c99bb00624948a50d953705923cc0~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5b6c99bb00624948a50d953705923cc0~tplv-k3u1fbpfcp-watermark.image?)</a>
- 一个 ssl 证书只能用于一个证书，按照腾讯云官方文档重新再申请一个证书并配置 ssl<br>
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9d1c958582f94ed4a5f8d42ddb508342~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9d1c958582f94ed4a5f8d42ddb508342~tplv-k3u1fbpfcp-watermark.image?)</a>
- 配置反向代理，弄好之后访问子域名就是 gitlab 首页啦
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1e528ac6fd764dd584f02a4a56cf8d2f~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1e528ac6fd764dd584f02a4a56cf8d2f~tplv-k3u1fbpfcp-watermark.image?)</a>
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4fb5af154fb24235bbfefb8d9bdc6a02~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4fb5af154fb24235bbfefb8d9bdc6a02~tplv-k3u1fbpfcp-watermark.image?)</a>

## 配置子域名访问博客地址
- 域名添加解析记录，记录值为 github 项目的原本访问地址
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2965349a2c7c49f7a7de332a5f7f13cb~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2965349a2c7c49f7a7de332a5f7f13cb~tplv-k3u1fbpfcp-watermark.image?)</a>
- 修改 github page 的自定义域名为子域名
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/16a68c3ef0b64a02ae1e9b5d586a8984~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/16a68c3ef0b64a02ae1e9b5d586a8984~tplv-k3u1fbpfcp-watermark.image?)</a>
至此，访问子域名就是博客地址了~



