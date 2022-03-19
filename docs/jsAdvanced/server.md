## 安装轻量服务器并配置宝塔跟gitlab
1. 购买轻量服务器
2. 购买域名解析域名，修改dns服务器地址
3. 重装系统，宝塔linux
4. 防火墙添加8888端口，备注宝塔，按照指引提供的账号密码登录宝塔
5. 登录后注册并登录手机，并且按照指引关联腾讯云的appid
6. 宝塔的软件商店安装gitlab最新社区版，默认端口8099，在服务器防火墙添加8088端口，备注gitlab
7. 安装后打开gitlab的设置，里面有地址，以及管理员的账号密码，登录管理员账号密码，设置中文，以及审核注册用户

## 配置静态资源使用：
1. 宝塔界面-网站，先安装 nginx
2. 没有配置好域名以及ssl，安装nginx后，在/www/server/nginx/html 目录上传静态文件，通过ip加文件名访问
3. 配置好了域名，在www文件夹上会有域名文件夹，在域名文件夹上上传并访问

## 配置https
1. 在腾讯云-我的域名那里申请SSL证书，一年期限免费的
2. 按照文档在宝塔配置ssl https://cloud.tencent.com/document/product/400/50874

## 配置子域名，设置 blog 给 github page 使用，主域名给服务器地址使用
1. 在域名解析添加解析记录：blog CNAME github.io地址。。。之后github page 的地址就是子域名，blog.junfeng530.xyz
2. 添加www A 服务器地址 ，主域名给服务器ip使用

## 登录终端
登录账号默认root，密码直接去服务器那里重置一下密码即可

## 将 gitlab 地址反向代理到主域名上
宝塔-网站-域名设置-反向代理 ---》 <br>
vim /var/opt/gitlab/gitlab-rails/etc/gitlab.yml 修改这个文件：https://www.jianshu.com/p/abc401136320<br>
gitlab:<br>
   host:改成你的域名<br>
   port:改成80<br>
   ssh_host:改成你的域名<br>
然后重启gitlab。<br>
测试无效，暂无解决方案

现在这一套下来：<br>
宝塔地址： http://121.4.86.16:8888/tencentcloud <br>
gitlab地址： http://121.4.86.16:8099 <br>
上传静态资源，在域名文件夹中，通过主域名 junfeng530.xyz 访问 <br>
主域名首页是域名文件夹的 index.html
github page 的博客访问地址 blog.junfeng530.xyz <br>







