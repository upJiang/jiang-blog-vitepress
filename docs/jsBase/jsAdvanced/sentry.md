>sentry是一个开源的监控系统，能支持服务端与客户端的监控，还有个强大的后台错误分析、报警平台。类似于后台的日志功能。

>sentry有点不稳定，经常断连，注意不要开拦截广告的插件,注意在登录时要点击下方的accept

使用方法：
1. 在[sentry官网](https://sentry.io/welcome/)注册一个账号，推荐直接使用github账号登录。

2. 创建一个项目，这里以vue3为例，在main.js 加入代码

```
import * as Sentry from "@sentry/vue";
import { Integrations } from "@sentry/tracing";

Sentry.init({
    app,
    dsn: "你创建项目的dsn地址",
    integrations: [
      new Integrations.BrowserTracing({
        routingInstrumentation: Sentry.vueRouterInstrumentation(router),
        tracingOrigins: ["localhost", "my-site-url.com", /^\//],
      }),
    ],
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
});
```

3. 在代码中抛出一个错误，然后在sentry面板上即可查看
```
<a-button type="primary" @click="clickThrowError">点击抛出错误</a-button>

const clickThrowError = ()=>{
    throw new Error('抛出错误');
}
```

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0479ca71932347b8a4fe97eb65142b07~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0479ca71932347b8a4fe97eb65142b07~tplv-k3u1fbpfcp-watermark.image?)</a>

[代码示例地址](https://github.com/upJiang/vue3-sentry-test)

[参考文章](https://juejin.cn/post/6844903876789813256)