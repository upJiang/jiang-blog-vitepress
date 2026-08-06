---
title: "Sentry、Source Map 与前端可观测性"
description: "从一条压缩堆栈开始，完成 Release 关联、Source Map 上传、错误分组和隐私控制。"
category: frontend
tags: ["Sentry", "Source Map"]
updated: 2026-08-05
order: 790
depth: core
series: "质量与体验"
---

# Sentry、Source Map 与前端可观测性

生产报错只显示 `app.a8f3.js:1:48291`，开发者不知道对应哪个源码函数。Source Map 保存生成代码到源码位置的映射；监控平台只有在事件 Release、线上文件和上传的 Map 完全对应时，才能还原堆栈。

本篇从一条压缩错误开始，建立 Release 身份、构建上传、运行事件和源码定位链路，再处理采样、错误分组与隐私。

## 定位链为什么容易断

```mermaid
flowchart LR
  C[源码 Commit] --> B[构建产物]
  B --> R[Release + Dist]
  B --> M[Source Maps]
  M --> U[上传监控平台]
  R --> E[浏览器错误事件]
  E --> S[按 Release 符号化]
```

重新构建同一 Commit、移动 Tag 或上传错误目录，都可能让 Map 与线上文件不匹配。CI 构建一次，记录不可变版本，并让运行时事件携带同一 Release。

## 步骤一：建立稳定 Release

Release 可以来自 Commit 与构建标识，Dist 区分同一 Release 的不同产物。HTML、静态 JS、监控事件和部署清单使用相同值。候选与生产提升同一构建，生产服务器不重新生成文件。

## 步骤二：私有上传 Source Map

构建阶段生成带 sourcesContent 或可访问源码的 Map，由 CI 使用短期 Token 上传。上传成功后，公开静态目录不必继续提供 `.map` 文件。Map 可能包含源码与路径，应按敏感制品管理。

下面是概念性初始化。输入是构建注入的非敏感 Release 与采样配置，输出是关联版本的错误事件。实际 DSN、环境与隐私钩子由项目配置，不能把 Secret 打进浏览器。

```ts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  release: import.meta.env.VITE_RELEASE,
  environment: import.meta.env.MODE,
  sampleRate: 0.2,
  beforeSend(event) {
    if (event.request) delete event.request.cookies
    return redactKnownSensitiveFields(event)
  }
})
```

浏览器 DSN 通常是客户端配置，不等于管理 Token；上传 Token 只存在 CI。`beforeSend` 是最后一道清理，不替代源头上避免采集正文和凭证。

## 步骤三：让错误可行动

错误分组依赖堆栈与指纹。不要给每次事件随机 fingerprint，否则同一故障无法聚合；也不要把所有 API 错误强行归为一组。记录路由模板、版本、功能和稳定错误码，避免 URL ID、用户 ID 等高基数标签。

捕获边界区分预期业务失败和未知异常。取消请求、表单验证和 404 不一定进入 error；真正崩溃、资源加载失败与未处理 Promise 才需要告警。用户反馈可关联事件 ID，但不自动附加页面敏感内容。

## 步骤四：验证上传与部署

候选环境主动触发一个带唯一标记的测试错误，检查平台展示正确源码文件与行号，再删除测试事件或标记。Source Map 上传成功但 Release 不一致时，符号化仍会失败。

| 失败 | 排查 |
| --- | --- |
| 仍显示压缩堆栈 | Release/Dist 与文件地址 |
| 行号偏移 | 多次 transform 的 Source Map 链 |
| Map 公开可下载 | 构建部署排除规则 |
| 事件包含 Token | SDK 集成与 beforeSend 门禁 |
| 告警风暴 | 分组、采样和环境过滤 |
| ChunkLoadError 增加 | HTML 缓存与旧静态资源保留 |

监控平台不可用不应阻塞页面。SDK 加载、队列和网络请求都有上限；性能 Trace 和 Replay 属于额外数据面，启用前单独评估同意、隐私、成本和采样。

## 参考资料

- [Sentry Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [Source Map specification](https://tc39.es/ecma426/)
- [Sentry JavaScript Configuration](https://docs.sentry.io/platforms/javascript/configuration/)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
