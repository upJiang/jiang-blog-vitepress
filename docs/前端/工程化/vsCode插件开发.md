[中文教程](https://liiked.github.io/VS-Code-Extension-Doc-ZH/#/)

## init项目
- 安装官方脚手架

```
npm install -g yo generator-code
```
- 执行，生成项目
```
yo code
```
 
- 直接f5即可运行插件

## 发布插件
###  下载发布插件
```
npm install -g vsce
```

### 项目打包
```
vsce package
```

### 创建 `Azure Personal Access Token`，用于发布
- 打开 [Azure官网](https://aex.dev.azure.com) ，注册好账号后，在这里创建 token，设置期限最长为一年，`Scopes` 直接选择 `Full access`。保存好创建的 `token`

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7c9d1e2d1abb4b31a4444f134a6e8af0~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=415&h=431&s=25374&e=png&b=fbfbfb">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7c9d1e2d1abb4b31a4444f134a6e8af0~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=415&h=431&s=25374&e=png&b=fbfbfb)</a>

### 创建发行方
打开 [创建发行方地址](https://aka.ms/vscode-create-publisher )，填一个与项目 `publisher` 一致的名字，直接创建即可

## 开始发布
```
# 登录
vsce login (publisher name)

# 发布
vsce publish 2.0.1

# 直接登录然后立即发布插件：
vsce publish -p <token>
```

然后过几分钟，再搜索一下自己的插件名称，就能搜到啦

## 本地打包并安装
```
vsce package
```
会在根目录生成一个 `.vsix` 文件，然后直接在扩展那里选择 `从 VSLX 安装` 即可


