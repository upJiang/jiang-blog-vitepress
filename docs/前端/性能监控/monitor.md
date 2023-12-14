在线上项目中，需要**统计产品中用户行为和使用情况**，从而可以从用户和产品的角度去
了解用户群体，从而升级和迭代产品，使其更加贴近用户。

用户行为数据可以通过前端数据监控的方式获得，除此之外，前端还需要实现性能监控和异
常监控。

- 数据监控
  - PV 访问来量（Page View）
  - UV 访问数（Unique Visitor）
  - 记录操作系统和浏览器
  - 记录用户在页面的停留时间
  - 进入当前页面的来源网页（也就是从哪进来的转化）
- 性能监控
  - 白屏时长
  - 重要页面的 http 请求时间
  - 重要页面的渲染时间
  - 首屏加载时长
- 异常监控
  - 前端脚本执行报错
  - 样式丢失的异常监控

实现前端监控有三个步骤：

- 前端埋点和上报
- 数据处理
- 数据分析。

## 如何埋点

### 手动埋点

使用 js 代码拿到一些进本信息

```
//域名
const domainURL = document.domainURL.document.URL
//页面标题
const title = document.title
//分辨率
const screen = window.screen
//颜色深度
const colorDepth = window.screen.colorDepth
//Referrer
const Referrer = document.referrer
//客户端语言
const language = navigator.language

console.log('域名:'+domainURL+'\n页面标题'+title+'\n分辨率'+screen+'\n颜色深度'+colorDepth+'\nReferrer'+Referrer+'\n客户端语言'+language)
```

通过 Performance 我们便能拿到 DNS 解析时间、TCP 建立连接时间、首页白屏时间、DOM
渲染完成时间、页面 load 时间等

```
//拿到Performance并且初始化一些参数
let timing = performance.timing,
    start = timing.navigationStart,
    dnsTime = 0,
    tcpTime = 0,
    firstPaintTime = 0,
    domRenderTime = 0,
    loadTime = 0;
//根据提供的api和属性，拿到对应的时间
dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
tcpTime = timing.connectEnd - timing.connectStart;
firstPaintTime = timing.responseStart - start;
domRenderTime = timing.domContentLoadedEventEnd - start;
loadTime = timing.loadEventEnd - start;

console.log('DNS解析时间:', dnsTime,
            '\nTCP建立时间:', tcpTime,
            '\n首屏时间:', firstPaintTime,
            '\ndom渲染完成时间:', domRenderTime,
            '\n页面onload时间:', loadTime);
```

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6ac1857fed8d4b2e948576cdd58a6c6b~tplv-k3u1fbpfcp-watermark.image?)
拿到数据以后我们可以在提交，或者通过图片的方式去提交埋点内容

```
  // 页面加载时发送埋点请求
$(document).ready(function(){
 // ... 这里存在一些业务逻辑
 sendRequest(params);
});

// 按钮点击时发送埋点请求
$('button').click(function(){
   //  这里存在一些业务逻辑
   sendRequest(params);
});

// 通过伪装成 Image 对象，传递给后端，防止跨域
let img = new Image(1, 1);
let src = `http://aaaaa/api/test.jpg?args=${encodeURIComponent(args)}`;
img.src = src;

//css实现的埋点
.link:active::after{
content: url("http://www.example.com?action=yourdata");
}
<a class="link">点击我，会发埋点数据</a>

//data自定义属性，rangjs去拿到属性绑定事件，实现埋点
//<button data-mydata="{key:'uber_comt_share_ck', act: 'click',msg:{}}">打车</button>
```

这种埋点方式虽然能精准的监控到用户的行为，和网页性能等数据，但是你会发现，非常繁
琐，需要大量的工作量，当然这部分工作也有人帮我们做了，比如像友盟、百度统计等给我
们其实提供了服务。我们可以按照他们的流程使用手动埋点

### 可视化埋点

这种埋点方案，又叫无痕埋点，解放了前端手动操的工作量，其实本质就是用系统去插入本
来需要手动插入的埋点，这种埋点方式由于自带技术壁垒，所以开发人员基本基本不用考虑
，花钱即可 ，比较靠谱的服务商 国外的 Mixpanel，国内较早支持可视化埋点的有
TalkingData、诸葛 IO，腾讯 MTA 等

### 无埋点

无埋点并不是说不需要埋点，而是全部埋点，前端的任意一个事件都被绑定一个标识，所有
的事件都别记录下来。通过定期上传记录文件，配合文件解析，解析出来我们想要的数据，
并生成可视化报告供专业人员分析因此实现“无埋点”统计。

比如在网页里面插入一段 js 代码，进行全量监控
