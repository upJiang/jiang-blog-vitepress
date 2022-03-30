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

## 将博客上传到服务器，不使用github page
>github page 在国内有时候访问实在是太慢了，顶不住。现在直接把文件上传到服务器。思路就是创建一个 git 的用户，然后这个用户通过 ssh 的公钥免密登录，新建一个 git 仓库用户上传。

注意：创建文件夹或者文件的时候尽量使用命令，否则会因为操作系统不同导致找不到该文件
### 创建 git 用户
观察 Github Clone 时的 SSH 地址，都是 git@xxx，其实就是以 git 用户的身份登录了 github.com。<br>
ssh 语法
```
ssh [USER@]HOSTNAME
```
效仿这种做法，在我们的服务器上也创建一个 git 用户管理远程仓库
```
# 添加一个名为 git 的用户
adduser git
# 设置 git 用户的密码，先随便填，后面通过 ssh 免密登录
passwd git
# 提权
sudo visudo
# 在文件里写入
git ALL=(ALL:ALL) ALL
# 保存提出，然后切换到 git 用户
su git
```
### git 用户免密登录
>这时候登录是需要密码的 ssh -v git@8.141.xxx.xxx
```
# 保证是在 git 用户下
su git
# 进入用户主目录
cd ~

# 创建 .ssh 目录，可能已存在
mkdir .ssh && cd .ssh

# 创建 authorized_keys 文件，可能已存在
touch authorized_keys

# 在本地起一个终端，获取本地公钥
cat ~/.ssh/id_rsa.pub

# 登陆服务器，将获取的公钥写入服务器的 authorized_keys
echo "这里修改为你的公钥内容" >> ~/.ssh/authorized_keys

# 给相关文件添加执行权限
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```
注意宝塔要开启允许 ssh 登录，在安全那里

### 创建远程仓库
新增一个子域名网站: `blog.junfeng530.xyz`，注意域名解析，以及 ssl 证书
```
# 进入代码仓库目录
cd /www/wwwroot/blog.junfeng530.xyz

# 赋予 git 用户权限
sudo chown git:git /www/wwwroot/blog.junfeng530.xyz

# 创建代码目录
mkdir blog.git

# 进入代码目录
cd blog.git

# 初始化
git init --bare 
```
至此，我们生成了一个远程仓库地址，它的 SSH 地址是：
```
git@121.4.86.16:/www/wwwroot/blog.junfeng530.xyz/blog.git
```
这里我们使用 git init --bare 初始化仓库，它与我们常使用的 git init 初始化的仓库不一样，你可以理解为它专门用来创建远程仓库，这种仓库只包括 git 版本控制相关的文件，不含项目源文件，所以我们需要借助一个 hooks，在有代码提交到该仓库的时候，将提交的代码迁移到其他目录，这里我们直接把代码提交到 /www/wwwroot/blog.junfeng530.xyz 目录中，这样也省去了 nginx 转发这些步骤：
```
# 进入 hooks 目录
cd hooks

# 创建并编辑 post-receive 文件
vim post-receive

# 这里是 post-receive 写入的内容

#!/bin/bash
git --work-tree=/www/wwwroot/blog.junfeng530.xyz checkout -f

# 赋予执行权限
chmod +x post-receive
```
### 修改博客脚本的提交地址
```
git push -f git@121.4.86.16:/www/wwwroot/blog.junfeng530.xyz/blog.git master
```
至此，执行脚本，就能将代码顺利推到 `/www/wwwroot/blog.junfeng530.xyz` 目录中，通过子域名也能正常访问博客，并且秒开，就很棒！

[参考文档](https://github.com/mqyqingfeng/Blog/issues/243)



