## HTTP 问题

![](https://r6kvtxijgm.feishu.cn/space/api/box/stream/download/asynccode/?code=Yzk1NGVkMmMwN2QzYWY4MTFhNTc3MmY4MWE2ODc2NzlfdE9JNlhsZER6d0ZjSnV2clpGbFZpY1lPb1Q4WU52TndfVG9rZW46VE1xU2JOQ1Z6b3g0U254S3NGSmMweEpNbktkXzE3NDI2NDg2MzY6MTc0MjY1MjIzNl9WNA)

## TCP & UDP

## Http 的从古到今

首先在浏览器的网络面板的 prototol 协议列可以查看每个请求的 http 版本

## HTTP/0.9 是最初的版本，极其简单，只支持 GET 方法，没有头部，响应只能是 HTML。

- **核心特征**：单行协议（`GET /index.html`）

- **局限**：无状态码/头部/错误处理

- **前端启示**：理解「请求-响应」基础模型

## 接下来是 HTTP/1.0，引入了状态码、头部字段、多内容类型支持，但每个请求需要新建连接，效率低。

首先，HTTP/1.0 是早期的 HTTP 版本，每个请求都需要新建一个 TCP 连接，完成之后立即关闭。这样每次请求都要经历 TCP 的三次握手和四次挥手，增加了延迟。特别是当网页有多个资源需要加载时，比如图片、CSS、JS 等，这种重复的连接建立和关闭会导致明显的性能问题。

然后，串行请求意味着浏览器必须等一个请求完成之后才能发送下一个请求。如果前一个请求响应慢，后面的请求就会被阻塞，这会进一步降低页面加载速度。

- **重大改进**：

  - 状态码（200/404 等）

  - 头部字段（Content-Type/User-Agent）

  - 支持非 HTML 内容（图片/CSS 等）

- **痛点**：每个请求新建 TCP 连接（三次握手开销），请求串行，

```javascript
GET /logo.png HTTP/1.0
User-Agent: Mozilla/5.0

HTTP/1.0 200 OK
Content-Type: image/png
Content-Length: 1234
```

## HTTP/1.1 解决了持久连接、管线化、缓存机制等，成为主流版本。

- **核心突破**：
  1. 持久连接（**Connection: keep-alive**）
  - 通过`Connection: Keep-Alive`头部字段实现，底层 TCP 连接在完成首个请求后**不会立即关闭**，而是设置两个关键参数：

  - `Keep-Alive: timeout=5, max=100` ▶︎ 表示连接保持 5 秒，最多承载 100 次请求

  - 客户端和服务端通过**心跳检测包**维持连接活性 ![](https://r6kvtxijgm.feishu.cn/space/api/box/stream/download/asynccode/?code=ZGQ3OWQ4Mzg5Mzg5MjdhYTM0MWUyNTQyNmQwOGVlMzhfcDBCMFl5c0dFZjdLRjJCQUc1ejdESVJIeHY4R0o4WjBfVG9rZW46RGd2TmJQNEJ2b2NFd3V4d0JpZGM5SE9HbkdiXzE3NDI2NDg2MzY6MTc0MjY1MjIzNl9WNA)
  2. 管线化（Pipelining）
  - **非管线化模式**：请求 → 响应 → 请求 → 响应（串行） ![](https://r6kvtxijgm.feishu.cn/space/api/box/stream/download/asynccode/?code=YmUzMTE2ZjBiZTQ1NmUzN2NmZTE2YTZkNjhhMmQzMThfdFJMUmR2SFNFNEpxRmpubWJqYkY2TVdWVmUycjJEbHZfVG9rZW46RUlBcGJxMEE0b3FHMGp4ZWl5MmNNdEt1bkxsXzE3NDI2NDg2MzY6MTc0MjY1MjIzNl9WNA)

  - **管线化模式**：请求 1→ 请求 2→ 请求 3→ 响应 1→ 响应 2→ 响应 3（并行发送请求 ） ![](https://r6kvtxijgm.feishu.cn/space/api/box/stream/download/asynccode/?code=Yjg5YThjZmZlZjliNDAyM2IwZWE0ZDIxNjdkN2MxMGRfbzFqUHFBS2ZTcjE2akk1T2pTMWFZMHZWRHB4VVJzQmxfVG9rZW46QXlpcGJsdXRJb1VlaUt4S0ZsS2NDVFpnbnljXzE3NDI2NDg2MzY6MTc0MjY1MjIzNl9WNA) **串行请求是指客户端在发送下一个请求之前必须等待前一个请求的响应**，而**管线化允许客户端连续发送多个请求而无需等待响应。不过，虽然请求可以连续发送，但服务器必须按顺序返回响应，这可能导致队头阻塞**。虽然减少了 RTT 时间，但存在**队头阻塞**(HOL Blocking)问题
  3. 分块传输（Transfer-Encoding: chunked）当服务器不知道内容总大小时，可以将数据分成多个块发送，每个块包含自己的大小，最后以零长度的块结束应用场景比如动态内容生成、大文件流式传输。优点是不需要预先知道内容长度，支持流式处理；缺点是增加了一些传输开销 ![](https://r6kvtxijgm.feishu.cn/space/api/box/stream/download/asynccode/?code=MmUzYTIxYmEwYTFjZDFhMDFkNDljYjJlN2JhOTBkNWNfQ3pzUXNEM3NJSzJQdnZqTEVJcm1aSFZMR3dibVhnM1BfVG9rZW46VWFWdWJhUWdvb3EzNkp4RmwxZWN3UFJEbmplXzE3NDI2NDg2MzY6MTc0MjY1MjIzNl9WNA)
  4. 缓存控制（**Cache-Control/ETag**）
  - 强缓存：不会发送请求

    - Expires: http1.0 的产物，指定什么时候会过期 `Expires: Wed, 22 Oct 2018 08:41:00 GMT`，受限于本地时间，如果本地时间更改，则缓存时间也会失效

    - canche-contorl：针对 EXpires 的时间限制，于是 http1.1 的产物诞生，也是 http 实现长连接的根本，当设置了这个，请求能够在设定的时间内共用一个 TCP 连接

      - `Cache-control: max-age=30`,30 秒后过期

  - 协商缓存，会发送请求，然后比较本地资源

    - Last-Modified：以修改时间为标准的 `Last-Modified`，http1.0 的产物客户端会把 `If-Modified-Since`发送给服务端，服务端对比这个值跟当前的 `Last-Modified`,查看最后修改时间有没有变化，没有变化则返回 304，告知客户端使用本地缓存，由于是以修改时间为标准，如果一个资源周期性的修改，改了又改回来，那么也会被认为是修改了。

    - E-tag：基于 Last-Modified 的最后修改时间限制，一个针对于资源唯一性的产物 e-tag 诞生，http1.1 的产物，由文件内容 hash 生成，只有当资源改变才会被识别 成改变 Expires 跟 Last-Modified 都是 1.0 的产物，都是以时间为维度，于是 1.1 在这个基础做了优化，出现了更灵活的 canche-contorl 以及以资源为维度的 e-tag

- **典型问题**：

  - 队头阻塞（Head-of-line blocking）

  - 冗余头部传输

- **前端优化方案**：

  - 域名分片（突破浏览器并发连接数限制）

  - 雪碧图合并小图

  - 代码压缩（gzip）

## HTTP/2.0 则采用二进制分帧、多路复用、头部压缩等技术，进一步提升性能。

- **核心技术**：

  - 多路复用

    每个请求都会有唯一的 **Stream ID**：31 位唯一标识符，用于区分不同请求/响应流， 响应根据 ID 识别

    ```javascript
     🛣️主路    🚗 🚚 🏎️ 🚌 并行行驶
     ↙↘       匝道自动分流
    📦每个包裹（数据帧）都有专属快递单：
       - 收件人ID（Stream ID）

       - 紧急程度（优先级）

       - 包裹类型（HEADERS/DATA等）

     响应的根据 ID 识别
    📦[ID:101|优先级:高] 图片头部
    📦[ID:102|优先级:中] JS内容
    📦[ID:103|优先级:低] 广告数据

    而这些数据块到达浏览器的顺序可能是完全打乱的，但浏览器能像拼乐高一样快速组装。
    ```

  - 二进制协议（替代文本协议）

    - HTTP/1.1 是基于文本的，比如请求行、头部都是 ASCII 编码，换行分隔，解析的时 候需要逐字符处理，容易出错，效率低。另外，文本协议无法多路复用，导致队头阻 塞问题。 **传统 HTTP/1.1 文本协议** → 像手写信件，解析的时候需要逐字符处理，也就是字符串
    ```javascript
    GET /index.html HTTP/1.1      → 信的开头必须写"亲启："
    Host: www.example.com         → 每行文字用回车换行分隔
    Accept-Language: zh-CN        → 内容不能有格式错误
    （空行）                      → 必须用空行表示信件结束
    ```
    **HTTP/2 二进制协议** → 像智能快递包裹，这样我们获取想要的内容，直接跳转到相应字段即 可，也就是对象

  ```javascript
  📦包裹编号：101              → 每个数据包都有唯一ID
  📦包裹类型：HEADERS          → 用数字代码表示类型（如0x1）
  📦紧急程度：高优先级         → 用二进制位标记优先级
  📦内容：压缩后的网站配置信息 → 内容经过高效编码
  ```

  表格 还在加载中，请等待加载完成后再尝试复制

  - 头部压缩（HPACK 算法） HTTP/2 的头部压缩技术（HPACK 算法）就像给网络传输的「快递面单」做了智能优化，**让重复的信息不用每次都手写，而是直接贴条形码**

    - **预装通用模板（静态表）**

      - 内置 61 种常见头部组合，例如
        ```javascript
        2 → :method: GET
        8 → :status: 200
        33 → user-agent: Chrome
        ```
    - **动态更新模板（动态表）**

      - 在连接过程中**自动记录新出现的头部**，例如
      ```javascript
      第一次发送 → Cookie: session=abc
      系统记住 → 62 → Cookie: session=abc
      后续发送 → 只需传数字62
      ```
      - **规则**：动态表大小有限（默认 4KB），新的条目会挤掉旧的

      - **特点**：高频字符用短码（如字母`e`用`101`），低频用长码

    - **超级压缩术（哈夫曼编码）**

      - 将文字转换为更短的二进制码，例如：
        ```javascript
        原文：accept-language: zh-CN
        编码后：10001010111...（长度减少40%）
        ```

    - 总结以及案例：

  ```javascript
  第一次请求：
  Headers完整发送（压缩后200字节）：
  [:method: GET] → 静态表2
  [user-agent: WeiboApp] → 动态新增为62
  [cookie: uid=123] → 动态新增为63

  第二次请求：
  只需传数字代码（50字节）：
  2（GET方法）
  62（user-agent）
  63（cookie）
  + 新增的[accept-encoding: gzip] → 动态记录为64

  第N次请求：
  重复的头部全部用数字代替 → 每个请求节约80%流量
  ```

  **技术安全设计**

  - **防偷窥**：每个连接的动态表独立，避免不同网站间信息泄漏

  - **防溢出**：动态表有大小限制，默认超过 4KB 会自动清理旧条目

  - **防攻击**：采用哈夫曼编码而非 DEFLATE，避免类似 CRIME 漏洞的破解风险

  ***

  **对用户体验的影响**

  1. **弱网环境**：加载知乎页面，头部数据从 1.2MB→300KB，加载提速 2 秒
  2. **移动流量**：刷抖音 1 小时，节省约 50MB 流量（相当于多发 100 条原图微信）
  3. **服务器性能**：淘宝双 11 节省 90%的头部处理资源，可多支撑 1 亿用户

  - 服务器推送（Server Push）比如加载一个网页，HTML 里引用了 CSS 和 JS 文件。传统方式需要浏览器解析 HTML 后才发现这些资源，再发送请求，而服务器推送则是在发送 HTML 的同时，主动推送这些资源，省去了请求的往返时间。

    - **智能预判**
      ```javascript
      服务器解析HTML时发现资源依赖
      <link href="style.css" />  → 自动加入推送队列
      <script src="app.js" />    → 加入推送队列
      ```
    - **并行传输**

      ```javascript
      在发送HTML响应的同时，通过同一个TCP连接推送关联资源：

      ┌──────────────┐
      │ HTML数据流   │← 主请求
      ├──────────────┤
      │ CSS数据流    │← 服务器主动推送
      ├──────────────┤
      │ JS数据流     │← 推送
      └──────────────┘
      ```

    1. **浏览器接管** 浏览器接收到推送资源后：

       1. ✅ 直接将 CSS/JS 存入缓存
       2. ❌ 如果已有缓存，会通过 RST_STREAM 帧拒绝推送

    ###         **与传统模式的加载对比**

    **场景**：加载一个含 HTML+CSS+JS+3 张图片的页面

    ```javascript
    HTTP/1.1流程：
    2. 请求HTML → 等待响应
    3. 解析HTML → 发现需要CSS/JS/图片
    4. 发起6次新请求 → 排队等待响应（队头阻塞）

    HTTP/2+Server Push流程：
    5. 请求HTML → 同时收到HTML+CSS+JS+图片
    6. 页面加载完成时间缩短40%
    ```

HTTP/2 协议的启用 **并不严格依赖 HTTPS**，但在实际生产环境中，**主流浏览器强制要求通过 HTTPS 使用 HTTP/2**。

如何开启 http2.0

```javascript
nginx 配置

server {
    # 修改监听指令（所有需要HTTP/2的站点）
    listen 443 ssl http2;  # 关键修改点
    listen [::]:443 ssl http2;
    server_name junfeng530.xyz;

    # 保持原有SSL证书配置
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
}
```

### http3.0

![](https://r6kvtxijgm.feishu.cn/space/api/box/stream/download/asynccode/?code=NzJmNjZjMjlmZDQ1MmMzNDMzYjg1NmQ5MjA0NTE3ODdfTEFLWmtYcHliV3VjaFNkUjU4RUUyRDMzMnc0WFVjdFBfVG9rZW46QXNyVWJKSzByb3p3OGR4cGFpUWNjOWhYbnNmXzE3NDI2NDg2MzY6MTc0MjY1MjIzNl9WNA)

- **告别 TCP 限制**：QUIC 直接运行在 UDP 上，绕过了 TCP 的拥塞控制算法限制

- **多路复用增强**：每个数据流独立传输，彻底解决 HTTP/2 的 **TCP 层队头阻塞**问题

  - Http1.1 的长连接，使用串行请求，会导致队头阻塞

  - Http2.0 使用多路复用，streamId 的方式，hack 表头压缩等方式，让请求可以不按照顺序响应解决了队头阻塞。但注意解决的是 http 层（应用层）的队头阻塞，tcp 层仍存在队头阻塞。那么 TCP（传输层） 为啥仍然有队头阻塞问题：**TCP 的有序传输特性导致即使应用层多路复用，底层数据包丢失仍会阻塞所有流。**

  - 那么 http2.0 如何解决 tcp （传输层）的队头阻塞： ![](https://r6kvtxijgm.feishu.cn/space/api/box/stream/download/asynccode/?code=MDM3ZGM2NTJkOGMyZWQzMGRjY2IyOWI3Njk4YzhkOTZfc1l6M2lWWnZWNlFRVmc1aDRsVjFGNHR0TVAyVGRPNE9fVG9rZW46SG1uTmJPV2lHb2RNMWJ4VGd4R2Nac29iblpkXzE3NDI2NDg2MzY6MTc0MjY1MjIzNl9WNA)

    - **核心机制**：基于 UDP 的 QUIC 协议，**每个数据流拥有独立序列号，丢包仅影响当前流**（如聊天消息与文件传输互不干扰

- **连接迁移能力**：网络切换时（如 WiFi→4G）连接保持不中断

#### http3.0 仍未被普及的原因：

- **部署复杂度高**

  ```javascript
  # 典型 Nginx 配置对比
  # HTTP/2 配置（简单）
  listen 443 ssl http2;

  # HTTP/3 配置（需编译模块）
  quic_retry on;
  listen 443 quic reuseport;
  add_header Alt-Svc 'h3=":443"';
  ```

- **生态支持不完善**

- Chrome/Firefox/Edge 已支持,需手动开启 h3-flag

- **性能权衡争议**

  - **CPU 消耗**：QUIC 加密计算负载比 TCP+TLS 高 15-20%

  - **小文件场景**：对 <10KB 的资源，协议优势不明显

  - **网络穿透性**：部分企业防火墙默认拦截 UDP 443

### HTTP 总结

#### **HTTP/0.9**

- **定位**：初始版本，极简设计

- **特性**：

  - 仅支持 `GET` 方法

  - 无头部/状态码，响应只能是 HTML

- **局限**：无法处理错误或复杂内容

#### **HTTP/1.0**

- **突破**：

  - 引入状态码（200/404）和头部字段（如 `Content-Type`）

  - 支持非 HTML 内容（图片/CSS）

- **痛点**：

  - 每次请求需新建 TCP 连接（三次握手开销）

  - 串行请求导致队头阻塞

#### **HTTP/1.1**

- **核心改进**：

  - **持久连接**：
    1. 通过 `Connection: Keep-Alive` 复用 TCP 连接（如 `Keep-Alive: timeout=5, max=100`）
  - **管线化**：
    1. 允许连续发送多个请求，但响应需按序返回（仍存在队头阻塞）
  - **分块传输**：支持流式内容（`Transfer-Encoding: chunked`）

  - **缓存优化**：
    1. `Cache-Control` 替代 `Expires`（更灵活）
    2. `ETag` 替代 `Last-Modified`（基于内容哈希）
- **遗留问题**：队头阻塞未根治

#### **HTTP/2**

- **技术革新**：

  - **二进制分帧**：
    1. 数据切割为带 `Stream ID` 的帧（多路复用，无需按序响应）
  - **头部压缩**：
    1. HPACK 算法（静态表 + 动态表 + 哈夫曼编码，节省 80% 流量）
  - **服务器推送**：主动推送关联资源（如 HTML + CSS + JS 并行传输）

- **局限性**：TCP 层丢包仍阻塞所有流

#### **HTTP/3**

- **底层重构**：

  - **QUIC 协议**：
    1. 基于 UDP，每个流独立传输（彻底消除 TCP 层队头阻塞）
    2. 整合 TLS 1.3 实现强制加密
  - **连接迁移**：网络切换（如 WiFi→4G）保持连接

- **部署挑战**：

  - 需同时监听 TCP/UDP 443 端口（Nginx 配置复杂）

  - 部分防火墙拦截 UDP 流量

表格 还在加载中，请等待加载完成后再尝试复制

### 传输掉包，怎么处理

1. **确认掉包现象**

   1. 使用浏览器开发者工具的 **Network** 面板监控请求状态码（特别是 `200` 与 `5xx`/`4xx` 的比例）
   2. 检查 WebSocket 或 SSE 连接的稳定性（通过 `onerror` 和 `onclose` 事件监听）

- 处理：

  - try catch 前端重试机制

  - 大文件上传使用分片（如每 5MB 一个 chunk）

  - HTTP/2，多路复用减少连接竞争

### TCP 的三次握手 & 四次挥手

**三次握手的主要目的是确保双方都能发送和接收数据，而四次挥手则是为了安全地终止连接。**

解释:

三次握手方面，第一步是客户端发送 SYN，SYN 是同步序列编号，用来发起连接。这个时候客户端处于 SYN_SENT 状态。服务器收到后，回应 SYN-ACK，即确认客户端的 SYN，并发送自己的 SYN，此时服务器进入 SYN_RECEIVED 状态。最后客户端发送 ACK 确认服务器的 SYN，双方进入 ESTABLISHED 状态，连接建立完成。这个过程为什么需要三次呢？因为两次的话，如果客户端的 SYN 因为延迟而重发，服务器可能会建立多余的连接，三次握手可以避免这种情况。

四次挥手的话，当一方想要关闭连接时，发送 FIN，表示不再发送数据，但还能接收。比如客户端先发 FIN，进入 FIN_WAIT_1 状态。服务器收到后，发送 ACK 确认，进入 CLOSE_WAIT 状态，客户端收到后进入 FIN_WAIT_2。此时服务器可能还有数据要发送，等发完了再发 FIN，进入 LAST_ACK 状态。客户端收到服务器的 FIN 后，发送 ACK 确认，进入 TIME_WAIT 状态，等待 2MSL 时间确保服务器收到 ACK，然后关闭。服务器收到 ACK 后关闭连接。这里为什么是四次？因为 TCP 是全双工的，每个方向都要单独关闭，所以需要两次 FIN 和 ACK，但有时候服务器的 ACK 和 FIN 可以合并，变成三次，不过通常还是四次。

次握手包括 **SYN、SYN-ACK、ACK**，四次挥手则是 **FIN、ACK、FIN、ACK**。

```sql
-----------------
 三次握手流程
-----------------
客户端                             服务器
  |-------- SYN, seq=x -------->| （SYN_SENT）
  |<--- SYN+ACK, seq=y, ack=x+1 | （SYN_RCVD）
  |-------- ACK, ack=y+1 ------>| （ESTABLISHED）

-----------------
 四次挥手流程
-----------------
客户端                             服务器
  |-------- FIN, seq=u -------->| （FIN_WAIT_1）
  |<------- ACK, ack=u+1 -------| （CLOSE_WAIT）
  |<------- FIN, seq=v ---------| （LAST_ACK）
  |-------- ACK, ack=v+1 ------>| （TIME_WAIT → CLOSED）
```

![](https://r6kvtxijgm.feishu.cn/space/api/box/stream/download/asynccode/?code=ZGQ0NTJmNjg4OWQ1YjZjNzQwYmZmYjYwZTBkMDlkODRfOHdmbVBlSklOd2x1cFFjWW1ic2dSYnlQdzNHamZxMGpfVG9rZW46QlJXdWJZYW5nb2Rjdk94Y0tpZ2NMMEZWbjFnXzE3NDI2NDg2MzY6MTc0MjY1MjIzNl9WNA)

## HTTPS

> HTTPS 是通过 SSL/TLS 协议为 HTTP 增加加密、身份验证和完整性保护的网络安全方案，解决 HTTP 明文传输的数据泄露、篡改和身份伪造问题。其核心流程分为非对称加密握手（协商会话密钥）和对称加密通信（高效传输）两阶段。SSL 与 TLS 是协议的不同代际，TLS 作为 SSL 的继任者，修复了安全漏洞并引入更强算法（如 AES、ECDHE）。数字证书由 CA 签发，用于验证服务器身份。现代 Web 已全面转向 HTTPS，HTTP/2 与 HTTP/3 均强制要求 TLS 加密，Nginx 等服务器通过配置 `ssl_certificate` 和 `listen 443 ssl` 启用。

#### **一、HTTPS 定义与核心价值**

**问题解决**：HTTP 的三大安全缺陷

1. **明文传输**（数据裸奔）

   1. 请求/响应内容可被中间节点（路由器、ISP）直接窥探
   2. 示例：密码、Cookie 在公共 Wi-Fi 下易被窃取

2. **数据篡改风险**

   1. 攻击者可注入广告代码、修改交易金额（如 HTTP 页面支付劫持）

3. **身份伪造**

   1. 仿冒银行官网钓鱼（用户无法验证服务器真实性）

**本质**：HTTP + SSL/TLS 加密层，实现「机密性 + 完整性 + 身份认证」三位一体防护

#### **二、核心原理与工作流程**

**核心组件**

1. **SSL/TLS 协议**

   1. SSL（Secure Sockets Layer） → TLS（Transport Layer Security）的演进关系
   2. 当前主流版本为 TLS 1.2/1.3（SSL 3.0 及以下已废弃）

2. **非对称加密**（握手阶段）

   1. 服务器持有**私钥**，对外公开**公钥**（存储于数字证书中）
   2. 客户端用公钥加密「会话密钥」传输，仅服务器可解密

3. **对称加密**（数据传输阶段）

   1. 双方使用协商的「会话密钥」加密数据（如 AES-256）
   2. 高性能且保证后续通信安全

#### **握手流程**（简化版）

1. 客户端发送支持的加密套件列表 + 随机数
2. 服务器返回数字证书 + 选定加密套件 + 随机数
3. 客户端验证证书有效性（CA 链校验）
4. 生成会话密钥，用服务器公钥加密后传输
5. 双方切换至对称加密通信

## **SSL、TLS、HTTPS 的关系**

SSL（Secure Sockets Layer），安全套接字协议

TLS（Transport Layer Security），传输层安全性协议

**TLS 是 SSL 的升级版，两者几乎是一样的**

HTTPS（Hyper Text Transfer Protocol over SecureSocket Layer），建立在 SSL 协议之上的 HTTP 协议

![](https://r6kvtxijgm.feishu.cn/space/api/box/stream/download/asynccode/?code=YmJiZDg3OGEwNGE3NDFkZWIyNWYxOTUwZjY5Yjc2NjNfMVV5eUdycnFuUTV1d2YwODlabEdVRmU1WVJ2SXpXeFNfVG9rZW46TDE3SWJDZ3Nib1BJZUJ4eW1aaWN2MzNRbmN6XzE3NDI2NDg2MzY6MTc0MjY1MjIzNl9WNA)

**面试题**

1.  介绍下 HTTPS 中间人攻击

2.  . 参考答案：

    > 2. 针对 HTTPS 攻击主要有 SSL 劫持攻击和 SSL 剥离攻击两种。
    > 3. SSL 劫持攻击是指攻击者劫持了客户端和服务器之间的连接，将服务器的合法证书替换为伪造的证书，从而获取客户端和服务器之间传递的信息。这种方式一般容易被用户发现，浏览器会明确的提示证书错误，但某些用户安全意识不强，可能会点击继续浏览，从而达到攻击目的。
    > 4. SSL 剥离攻击是指攻击者劫持了客户端和服务器之间的连接，攻击者保持自己和服务器之间的 HTTPS 连接，但发送给客户端普通的 HTTP 连接，由于 HTTP 连接是明文传输的，即可获取客户端传输的所有明文数据。

3.  介绍 HTTPS 握手过程

4.  . 参考答案：

    >     2. 客户端请求服务器，并告诉服务器自身支持的加密算法以及密钥长度等信息
    >
    >     2. 服务器响应公钥和服务器证书
    >
    >     3. 客户端验证证书是否合法，然后生成一个会话密钥，并用服务器的公钥加密密钥，把加密的结果通过请求发送给服务器
    >
    >     4. 服务器使用私钥解密被加密的会话密钥并保存起来，然后使用会话密钥加密消息响应给客户端，表示自己已经准备就绪
    >
    >     5. 客户端使用会话密钥解密消息，知道了服务器已经准备就绪。
    >
    >     6. 后续客户端和服务器使用会话密钥加密信息传递消息

5.  HTTPS 握手过程中，客户端如何验证证书的合法性

6.  . 参考答案：

    >     2. 校验证书的颁发机构是否受客户端信任。
    >
    >     2. 通过 CRL 或 OCSP 的方式校验证书是否被吊销。
    >
    >     3. 对比系统时间，校验证书是否在有效期内。
    >
    >     4. 通过校验对方是否存在证书的私钥，判断证书的网站域名是否与证书颁发的域名一致。

7.  阐述 https 验证身份也就是 TSL/SSL 身份验证的过程

8.  . 参考答案：

    >     2. 客户端请求服务器，并告诉服务器自身支持的加密算法以及密钥长度等信息
    >
    >     2. 服务器响应公钥和服务器证书
    >
    >     3. 客户端验证证书是否合法，然后生成一个会话密钥，并用服务器的公钥加密密钥，把加密的结果通过请求发送给服务器
    >
    >     4. 服务器使用私钥解密被加密的会话密钥并保存起来，然后使用会话密钥加密消息响应给客户端，表示自己已经准备就绪
    >
    >     5. 客户端使用会话密钥解密消息，知道了服务器已经准备就绪。
    >
    >     6. 后续客户端和服务器使用会话密钥加密信息传递消息

9.  为什么需要 CA 机构对证书签名

10. . 主要是为了解决证书的可信问题。如果没有权威机构对证书进行签名，客户端就无法知晓证书是否是伪造的，从而增加了中间人攻击的风险，https 就变得毫无意义。

    >

11. 如何劫持 https 的请求，提供思路

12. . https 有防篡改的特点，只要浏览器证书验证过程是正确的，很难在用户不察觉的情况下进行攻击。但若能够更改浏览器的证书验证过程，便有机会实现 https 中间人攻击。
    > 2. 所以，要劫持 https，首先要伪造一个证书，并且要想办法让用户信任这个证书，可以有多种方式，比如病毒、恶意软件、诱导等。一旦证书被信任后，就可以利用普通中间人攻击的方式，使用伪造的证书进行攻击。
