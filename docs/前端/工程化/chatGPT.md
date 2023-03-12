>搭建 chatGPT微信机器人，小白式教学，部署需要一台 linux 服务器，没有的可以参考其它资料部署
## 注册 OpenAI 账号
>不想这么麻烦的可以直接上淘宝买一个，但是淘宝很多人共用一个账号，所以建议还是自己注册一个吧！

- OpenAi 注册地址：https://beta.openai.com/signup  **需要梯子，代理模式必须为全局**，建议使用谷歌账号<br>
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1930c31e44a4451592ef8c5156a5f827~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1930c31e44a4451592ef8c5156a5f827~tplv-k3u1fbpfcp-watermark.image?)</a>

- 使用国外手机号，接收验证码<br>
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5564b71724fc406aa31a791278060b2c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5564b71724fc406aa31a791278060b2c~tplv-k3u1fbpfcp-watermark.image?)</a>

## 注册接码平台
- 自行注册账号 sms-activate.org
- 使用支付宝充值1美元
<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8acaf6d767714b1d82122cd3206f4ba7~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8acaf6d767714b1d82122cd3206f4ba7~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)</a>
- 左侧搜索 openAi ,看到马来西亚（我使用印度跟印尼的都没收到验证码），点击购物车按钮
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/20bfa65e53aa4ef7b4400a752478e0e5~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/20bfa65e53aa4ef7b4400a752478e0e5~tplv-k3u1fbpfcp-watermark.image?)</a>
- 把这里的手机号复制到前面申请的 OpenAI 注册页面中，注意**删除前缀**，然后等待几分钟，页面将出现验证码，使用此验证码完成注册
<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c2e4434858ab4cbaaa9e1d8249305547~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c2e4434858ab4cbaaa9e1d8249305547~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)</a>

## 创建 API Keys
注册后登录找到这个页面 https://platform.openai.com/account/api-keys  创建并自己保存这个 key，之后需要用
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e7d632b129654422b56eafc9e2dccf29~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e7d632b129654422b56eafc9e2dccf29~tplv-k3u1fbpfcp-watermark.image?)</a>

## 安装部署
条件：
- 完成注册并获得了 OpenAI 的 `API Keys`
- 有自己的`linux服务器`

### 服务器搭建 Go 编译环境
- [go 下载地址](https://studygolang.com/dl) go语言中文网下载 go最新的安装包
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a0dd8e203055486e8879ebad58a083be~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a0dd8e203055486e8879ebad58a083be~tplv-k3u1fbpfcp-watermark.image?)</a>

- 解压
```
tar -C /usr/local -xzf go1.20.1.linux-amd64.tar.gz
```
- 配置 golang
```
## 进入编辑
vim /etc/profile

## 写入
export GOROOT=/usr/local/go
export PATH=$PATH:$GOROOT/bin

## 更新配置
source /etc/profile

## golang配置正确下载资源
go env -w GO111MODULE=on
go env -w GOPROXY=https://goproxy.cn,direct

## 测试
go -v
```

## 源码配置
### 下载源码
在服务器文件根目录下
```
git clone git@github.com:qingconglaixueit/wechatbot.git
cd wechatbot
go mod tidy
```
### 修改配置
其中配置文件是 config.dev.json，实际配置文件为 config.json ，我们需要拷贝一份。
```
cp config.dev.json config.json
```
把我们之前获取的 API Keys 替换一下。可以关注一下 model 参数，`text-davinci-003` 是最新的模型，不会写代码的哦，如果要让它写代码请换成 `code-davinci-002`。

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b29cf4085ab0468db09111214a4e3849~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b29cf4085ab0468db09111214a4e3849~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp)</a>

### 永久运行程序
```
nohup go run main.go
```
运行后即可关闭，不用理会警告，目录下会生成 `nohup.out` 文件，打开

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b1c8b529333d42db9f50aa9afe2af7df~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b1c8b529333d42db9f50aa9afe2af7df~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp)</a>

使用微信扫码登录，登录后你的这个微信就变成了 chatGPT 微信机器人，可以把它拉进群玩耍互动，私聊等。

chatGPT 微信机器人偶尔会超时报错，异常，但大部分时候都能正常使用！

<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/27d4c6b434814067b25b3a0252fa6562~tplv-k3u1fbpfcp-watermark.image?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/27d4c6b434814067b25b3a0252fa6562~tplv-k3u1fbpfcp-watermark.image?)</a>
