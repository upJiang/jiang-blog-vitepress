## UDP
**面向无连接的**，不需要在正式传递数据之前先连接起双方，UDP 是不需要和 TCP 一样在发送数据前进行三次握手建立连接的，想发数据就可以开始发送了。并且也只是`数据报文的搬运工`，不会对数据报文进行任何拆分和拼接操作。  

具体来说就是：
- 在发送端，应用层将数据传递给传输层的 UDP 协议，UDP 只会给数据增加一个 UDP 头标识下是 UDP 协议，然后就传递给网络层了
- 在接收端，网络层将数据传递给传输层，UDP 只去除 IP 报文头就传递给应用层，不会任何拼接操作

#### 不可靠性
首先不可靠性体现在无连接上，通信都不需要建立连接，想发就发，这样的情况肯定不可靠。

#### 高效
虽然 UDP 协议不是那么的可靠，但是正是因为它不是那么的可靠，所以也就没有 TCP 那么复杂了，需要保证数据不丢失且有序到达。

因此 UDP 的头部开销小，只有`八字节`，相比 TCP 的至少二十字节要少得多，在传输数据报文时是很高效的。

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d01631b2ef6640f58bc7647a2bb73007~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d01631b2ef6640f58bc7647a2bb73007~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

UDP 头部包含了以下几个数据
- 两个十六位的端口号，分别为源端口（可选字段）和目标端口
- 整个数据报文的长度
- 整个数据报文的检验和（IPv4 可选 字段），该字段用于发现头部信息和数据中的错误

#### 传输方式
UDP 不止支持一对一的传输方式，同样支持`一对多，多对多，多对一`的方式，也就是说 UDP 提供了单播，多播，广播的功能。

#### 适合使用的场景
UDP 虽然对比 TCP 有很多缺点，但是正是因为这些缺点造就了它高效的特性，在很多`实时性要求高`的地方都可以看到 UDP 的身影。

因为 TCP 会严格控制传输的正确性，如果因为用户网络条件不好就造成页面卡顿。`直播、王者荣耀`都是 UDP 的使用场景

## TCP
TCP 基本是和 UDP 反着来，`建立连接断开连接都需要先需要进行握手`。在传输数据的过程中，通过各种算法`保证数据的可靠性`，当然带来的问题就是相比 UDP 来说不那么的高效。

### 头部
<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/22be114f0cc0466689e18677ceca189f~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/22be114f0cc0466689e18677ceca189f~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

- Sequence number，这个序号保证了 TCP 传输的报文都是有序的，对端可以通过序号顺序的拼接报文
- Acknowledgement Number，这个序号表示数据接收端期望接收的下一个字节的编号是多少，同时也表示上一个序号的数据已经收到
- Window Size，窗口大小，表示还能接收多少字节的数据，用于流量控制
- 标识符
    - URG=1：该字段为一表示本数据报的数据部分包含紧急信息，是一个高优先级数据报文，此时紧急指针有效。紧急数据一定位于当前数据包数据部分的最前面，紧急指针标明了紧急数据的尾部。
    - ACK=1：该字段为一表示确认号字段有效。此外，TCP 还规定在连接建立后传送的所有报文段都必须把 ACK 置为一。
    - PSH=1：该字段为一表示接收端应该立即将数据 push 给应用层，而不是等到缓冲区满后再提交。
    - RST=1：该字段为一表示当前 TCP 连接出现严重问题，可能需要重新建立 TCP 连接，也可以用于拒绝非法的报文段和拒绝连接请求。
    - SYN=1：当SYN=1，ACK=0时，表示当前报文段是一个连接请求报文。当SYN=1，ACK=1时，表示当前报文段是一个同意建立连接的应答报文。
    - FIN=1：该字段为一表示此报文段是一个释放连接的请求报文。

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/1/1631bef9e3c60035~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/1/1631bef9e3c60035~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

在这之前需要了解一个重要的性能指标 `RTT`。该指标表示发送端发送数据到接收到对端数据所需的往返时间。

### 建立连接三次握手
首先假设主动发起请求的一端称为客户端，被动连接的一端称为服务端。不管是客户端还是服务端，TCP 连接建立完后都能发送和接收数据，所以 TCP 是一个`全双工`的协议。

起初，两端都为 `CLOSED` 状态。在通信开始前，双方都会创建 `TCB`。 服务器创建完 `TCB` 后便进入 `LISTEN` 状态，此时开始等待客户端发送数据。

#### 第一次握手
客户端向服务端发送连接请求报文段。该报文段中包含`自身的数据通讯初始序号`。请求发送后，客户端便进入 `SYN-SENT` 状态。

#### 第二次握手
服务端收到连接请求报文段后，如果同意连接，则会发送一个应答，该`应答`中也会包含`自身的数据通讯初始序号`，发送完成后便进入 `SYN-RECEIVED` 状态。

#### 第三次握手
当客户端收到连接同意的应答后，还要向服务端发送一个`确认报文`。客户端发完这个报文段后便进入 ESTABLISHED 状态，服务端收到这个应答后也进入 `ESTABLISHED` 状态，此时连接建立成功。

>常考面试题：为什么 TCP 建立连接需要三次握手，明明两次就可以建立起连接
这是为了防止出现失效的连接请求报文段被服务端接收的情况，从而产生错误。

可以想象如下场景。客户端发送了一个连接请求 A，但是因为网络原因造成了超时，这时 TCP 会`启动超时重传的机制再次发送一个连接请求 B`。此时请求顺利到达服务端，服务端应答完就建立了请求，然后接收数据后释放了连接。

假设这时候连接请求 A 在两端关闭后终于抵达了服务端，那么此时服务端会认为客户端又需要建立 TCP 连接，从而应答了该请求并进入 ESTABLISHED 状态。但是客户端其实是 CLOSED 的状态，那么就会导致服务端一直等待，造成`资源的浪费`。

PS：在建立连接中，任意一端掉线，TCP 都会`重发 SYN 包`，一般会重试五次，在建立连接中可能会遇到 SYN Flood 攻击。遇到这种情况你可以选择`调低重试次数或者干脆在不能处理的情况下拒绝请求`。

### 断开链接四次握手
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/2/1631fb807f2c6c1b~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/2/1631fb807f2c6c1b~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

TCP 是全双工的，在断开连接时两端都需要发送 FIN 和 ACK。

#### 第一次握手
若客户端 A 认为数据发送完成，则它需要向服务端 B `发送连接释放请求`。 A ==> B

#### 第二次握手
B 收到连接释放请求后，会告诉应用层要`释放 TCP 链接`。然后会发送 ACK 包，并进入 `CLOSE_WAIT` 状态，此时表明 A 到 B 的连接已经释放，不再接收 A 发的数据了。但是因为 TCP 连接是双向的，所以 B 仍旧可以发送数据给 A。 B ==> A

#### 第三次握手
`B 如果此时还有没发完的数据会继续发送`，完毕后会向 A 发送连接释放请求，然后 B 便进入 `LAST-ACK` 状态。 B ==> A

PS：通过延迟确认的技术（通常有时间限制，否则对方会误认为需要重传），`可以将第二次和第三次握手合并，延迟 ACK 包的发送`。

#### 第四次握手
A 收到释放请求后，向 B `发送确认应答`，此时 A 进入 `TIME-WAIT` 状态。该状态会持续 2MSL（最大段生存期，指报文段在网络中生存的时间，超时会被抛弃） 时间，若该时间段内没有 B 的重发请求的话，就进入 `CLOSED` 状态。当 B 收到确认应答后，也便进入 `CLOSED` 状态。

#### 为什么 A 要进入 TIME-WAIT 状态，等待 2MSL 时间后才进入 CLOSED 状态？
`为了保证 B 能收到 A 的确认应答`。若 A 发完确认应答后直接进入 CLOSED 状态，如果确认应答因为网络问题一直没有到达，那么会造成 B 不能正常关闭。

### ARQ 协议
ARQ 协议也就是`超时重传机制`。通过确认和超时机制保证了数据的正确送达，ARQ 协议包含停止等待 ARQ 和连续 ARQ 两种协议。

### 停止等待 ARQ
#### 正常传输过程
只要 A 向 B 发送一段报文，都要停止发送并启动一个`定时器`，等待对端回应，在定时器时间内接收到对端应答就取消定时器并发送下一段报文。

#### 报文丢失或出错
在报文传输的过程中可能会出现丢包。这时候超过定时器设定的时间就会再次发送丢失的数据直到对端响应，所以需要每次都备份发送的数据。

即使报文正常的传输到对端，也可能出现在传输过程中报文出错的问题。这时候对端会抛弃该报文并等待 A 端重传。

PS：一般定时器设定的时间都会大于一个 RTT 的平均时间。

#### ACK 超时或丢失
对端传输的应答也可能出现丢失或超时的情况。那么超过定时器时间 A 端照样会重传报文。这时候 B 端收到相同序号的报文会丢弃该报文并重传应答，直到 A 端发送下一个序号的报文。

在超时的情况下也可能出现应答很迟到达，这时 A 端会判断该序号是否已经接收过，如果接收过只需要丢弃应答即可。

#### 连续 ARQ
在连续 ARQ 中，发送端拥有一个发送窗口，可以在没有收到应答的情况下持续发送窗口内的数据，这样相比停止等待 ARQ 协议来说减少了等待时间，提高了效率。

#### 累计确认
连续 ARQ 中，接收端会持续不断收到报文。如果和停止等待 ARQ 中接收一个报文就发送一个应答一样，就太浪费资源了。通过累计确认，可以在收到多个报文以后统一回复一个应答报文。报文中的 ACK 标志位可以用来告诉发送端这个序号之前的数据已经全部接收到了，下次请发送这个序号后的数据。

但是累计确认也有一个弊端。在连续接收报文时，可能会遇到接收到序号 5 的报文后，并未接收到序号 6 的报文，然而序号 7 以后的报文已经接收。遇到这种情况时，ACK 只能回复 6，这样就会造成发送端重复发送数据的情况。

#### 滑动窗口
在 TCP 中，两端其实都维护着窗口：分别为`发送端窗口`和`接收端窗口`。

发送端窗口包含`已发送但未收到应答的数据`和`可以发送但是未发送的数据`。

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/5/1632f25c587ffd54~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/5/1632f25c587ffd54~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

发送端窗口是由接收窗口剩余大小决定的。接收方会把当前接收窗口的剩余大小写入应答报文，发送端收到应答后根据该值和当前网络拥塞情况设置发送窗口的大小，所以发送窗口的大小是不断变化的。

当发送端接收到应答报文后，会随之将窗口进行滑动

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/5/1632f25cca99c8f4~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/5/1632f25cca99c8f4~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

滑动窗口是一个很重要的概念，它帮助 TCP 实现了流量控制的功能。`接收方通过报文告知发送方还可以发送多少数据，从而保证接收方能够来得及接收数据，防止出现接收方带宽已满，但是发送方还一直发送数据的情况`。

#### Zero 窗口
在发送报文的过程中，可能会遇到对端出现零窗口的情况。在该情况下，发送端会停止发送数据，并启动 persistent timer 。该定时器会定时发送请求给对端，让对端告知窗口大小。在重试次数超过一定次数后，可能会中断 TCP 链接。

#### 拥塞处理
拥塞处理和流量控制不同，后者是作用于接收方，保证接收方来得及接受数据。而前者是作用于网络，防止过多的数据拥塞网络，避免出现网络负载过大的情况。

拥塞处理包括了四个算法，分别为：慢开始，拥塞避免，快速重传，快速恢复。

## HTTP
HTTP 请求由三部分构成，分别为：
- 请求行
- 首部
- 实体

### 请求行
```
GET /images/logo.gif HTTP/1.1
```
基本由`请求方法、URL、协议版本`组成。

请求方法：最常用的也就是 Get 和 Post
- Get 请求能缓存，Post 不能
- Post 相对 Get 安全一点点，因为Get 请求都包含在 URL 里（当然你想写到 body 里也是可以的），且会被浏览器保存历史纪录。Post 不会，但是在抓包的情况下都是一样的。
- URL有长度限制，会影响 Get 请求，但是这个长度限制是浏览器规定的，不是 RFC 规定的
- Post 支持更多的编码类型且不对数据类型限制

副作用：指对服务器上的资源做改变，搜索是无副作用的，注册是副作用的。

幂等：指发送 M 和 N 次请求（两者不相同且都大于 1），服务器上资源的状态一致，比如注册 10 个和 11 个帐号是不幂等的，对文章进行更改 10 次和 11 次是幂等的。因为前者是多了一个账号（资源），后者只是更新同一个资源。

Get 多用于无副作用，幂等的场景，例如搜索关键字。Post 多用于副作用，不幂等的场景，例如注册。

### 首部
首部分为`请求首部`和`响应首部`，并且部分首部两种通用，接下来我们就来学习一部分的常用首部。

#### 通用首部
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4db25c26747e42259348600fb15536a9~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4db25c26747e42259348600fb15536a9~tplv-k3u1fbpfcp-watermark.image?)</a>

#### 请求首部
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8d7be47905654e28aa3e5aa8f39f9eb3~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8d7be47905654e28aa3e5aa8f39f9eb3~tplv-k3u1fbpfcp-watermark.image?)</a>

#### 响应首部
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dbb304b102db4ae99978c3ed729daa8b~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dbb304b102db4ae99978c3ed729daa8b~tplv-k3u1fbpfcp-watermark.image?)</a>

#### 实体首部
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f44057c244cf46c7abaf9635eb99ce8c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f44057c244cf46c7abaf9635eb99ce8c~tplv-k3u1fbpfcp-watermark.image?)</a>

### 常见状态码
#### 2XX 成功
- 200 OK，表示从客户端发来的请求在服务器端被正确处理
- 204 No content，表示请求成功，但响应报文不含实体的主体部分
- 205 Reset Content，表示请求成功，但响应报文不含实体的主体部分，但是与 204 响应不同在于要求请求方重置内容
- 206 Partial Content，进行范围请求

#### 3XX 重定向
- 301 moved permanently，永久性重定向，表示资源已被分配了新的 URL
- 302 found，临时性重定向，表示资源临时被分配了新的 URL
- 303 see other，表示资源存在着另一个 URL，应使用 GET 方法获取资源
- 304 not modified，表示服务器允许访问资源，但因发生请求未满足条件的情况
- 307 temporary redirect，临时重定向，和302含义类似，但是期望客户端保持请求方法不变向新的地址发出请求

#### 4XX 客户端错误
- 400 bad request，请求报文存在语法错误
- 401 unauthorized，表示发送的请求需要有通过 HTTP 认证的认证信息
- 403 forbidden，表示对请求资源的访问被服务器拒绝
- 404 not found，表示在服务器上没有找到请求的资源

#### 5XX 服务器错误
- 500 internal sever error，表示服务器端在执行请求时发生了错误
- 501 Not Implemented，表示服务器不支持当前请求所需要的某个功能
- 503 service unavailable，表明服务器暂时处于超负载或正在停机维护，无法处理请求

## TLS
HTTPS 还是通过了 `HTTP 来传输信息`，但是信息通过 `TLS 协议进行了加密`。

TLS 协议位于传输层之上，应用层之下。首次进行 TLS 协议传输需要两个 RTT ，接下来可以通过 Session Resumption 减少到一个 RTT。

在 TLS 中使用了两种加密技术，分别为：`对称加密`和`非对称加密`。

### 对称加密
对称加密就是两边拥有相同的秘钥，两边都知道如何将密文加密解密。

这种加密方式固然很好，但是问题就在于如何让双方知道秘钥。因为传输数据都是走的网络，如果将秘钥通过网络的方式传递的话，一旦秘钥被截获就没有加密的意义的。

### 非对称加密
有公钥私钥之分，公钥所有人都可以知道，可以将数据用公钥加密，但是将数据解密必须使用私钥解密，私钥只有分发公钥的一方才知道。

这种加密方式就可以完美解决对称加密存在的问题。假设现在两端需要使用对称加密，那么在这之前，可以先使用非对称加密交换秘钥。

简单流程如下：首先服务端将公钥公布出去，那么客户端也就知道公钥了。接下来客户端创建一个秘钥，然后通过公钥加密并发送给服务端，服务端接收到密文以后通过私钥解密出正确的秘钥，这时候两端就都知道秘钥是什么了。

## HTTP/2
相较于http1
### 多路复用
在 HTTP/2 中，有两个非常重要的概念，分别是`帧（frame`）和`流（stream）`。帧代表着最小的数据单位，每个帧会标识出该帧属于哪个流，流也就是多个帧组成的数据流。

`多路复用，就是在一个 TCP 连接中可以存在多条流。`换句话说，也就是**可以发送多个请求**，对端可以通过帧中的标识知道属于哪个请求。通过这个技术，可以避免 HTTP 旧版本中的队头阻塞问题，极大的提高传输性能。

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/12/1635442531d3e5ee~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/12/1635442531d3e5ee~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

在 HTTP/1 中，因为队头阻塞的原因，你会发现发送请求是长这样的

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/12/163542c96df8563d~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/12/163542c96df8563d~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

在 HTTP/2 中，因为可以复用同一个 TCP 连接，你会发现发送请求是长这样的

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/12/163542c9d3128c7a~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/12/163542c9d3128c7a~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

### 二进制传输
HTTP/2 中所有加强性能的核心点在于此。在之前的 HTTP 版本中，我们是通过文本的方式传输数据。在 HTTP/2 中引入了新的编码机制，`所有传输的数据都会被分割，并采用二进制格式编码`。

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/12/163543c25e5e9f23~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/5/12/163543c25e5e9f23~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

### Header 压缩
在 HTTP/1 中，我们使用文本的形式传输 header，在 header 携带 cookie 的情况下，可能每次都需要重复传输几百到几千的字节。

在 HTTP /2 中，使用了 HPACK 压缩格式对传输的 header 进行编码，减少了 header 的大小。并在两端维护了`索引表`，用于记录出现过的 header ，后面在传输过程中就可以传输已经记录过的 header 的键名，对端收到数据后就可以通过键名找到对应的值。

### 服务端 Push
在 HTTP/2 中，服务端可以在客户端某个请求后，主动推送其他资源。

可以想象以下情况，某些资源客户端是一定会请求的，这时就可以采取服务端 push 的技术，`提前给客户端推送必要的资源`，这样就可以相对减少一点延迟时间。当然在浏览器兼容的情况下你也可以使用 `prefetch` 。

## HTTP/3
 HTTP/2 使用了多路复用，一般来说同一域名下只需要使用一个 TCP 连接。当这个`连接中出现了丢包的情况`，那就会导致 HTTP/2 的表现情况反倒不如 HTTP/1 了。

 在出现丢包的情况下，`整个 TCP 都要开始等待重传，也就导致了后面的所有数据都被阻塞`了。但是对于 HTTP/1 来说，可以开启多个 TCP 连接，出现这种情况反到只会影响其中一个连接，剩余的 TCP 连接还可以正常传输数据。

 基于这个原因，Google 就更起炉灶搞了一个**基于 UDP 协议的 QUIC 协议**，并且使用在了 HTTP/3 上，当然 HTTP/3 之前名为 HTTP-over-QUIC，从这个名字中我们也可以发现，HTTP/3 最大的改造就是使用了 QUIC

 ### QUIC
 QUIC 虽然基于 UDP，但是在原本的基础上新增了很多功能，比如`多路复用、0-RTT、使用 TLS1.3 加密、流量控制、有序交付、重传`等等功能

 虽然 HTTP/2 支持了多路复用，但是 TCP 协议终究是没有这个功能的。QUIC 原生就实现了这个功能，并且`传输的单个数据流可以保证有序交付且不会影响其他的数据流`，这样的技术就解决了之前 TCP 存在的问题。

 并且 QUIC 在移动端的表现也会比 TCP 好。因为 TCP 是基于 IP 和端口去识别连接的，这种方式在多变的移动端网络环境下是很脆弱的。但是 QUIC 是通过 ID 的方式去识别一个连接，不管你网络环境如何变化，`只要 ID 不变，就能迅速重连上`。

 ### 0-RTT
 通过使用类似 TCP 快速打开的技术，缓存当前会话的上下文，在下次恢复会话的时候，只需要将之前的缓存传递给服务端验证通过就可以进行传输了。

 ### 纠错机制
 假如说这次我要发送三个包，那么协议会算出这三个包的异或值并单独发出一个校验包，也就是总共发出了四个包。

 当出现其中的非校验包丢包的情况时，可以通过另外三个包计算出丢失的数据包的内容。

 当然这种技术只能使用在丢失一个包的情况下，如果出现丢失多个包就不能使用纠错机制了，只能使用重传的方式了。

 [更清晰的对于http的讲解](https://baijiahao.baidu.com/s?id=1627163778419611487&wfr=spider&for=pc)