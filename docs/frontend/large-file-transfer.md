---
title: "大文件校验、分片与断点续传"
description: "从一个网络中断的上传开始，设计文件摘要、分片会话、并发上限、幂等合并和恢复。"
category: frontend
tags: ["File Upload", "Resumable"]
updated: 2026-08-05
order: 830
depth: core
series: "浏览器数据通道"
---

# 大文件校验、分片与断点续传

上传 2GB 文件到 90% 时网络中断，如果只能重新上传整份文件，用户会浪费大量时间。分片上传把文件拆成稳定编号，服务端记录已经确认的分片；重连后客户端只补缺失部分。

本篇先建立上传会话，再计算摘要、并发发送分片、查询缺口并完成合并。浏览器计算和网络都有预算，分片越多不等于越快。

## 协议里有哪些身份

Upload Session 表示一次上传意图，File Digest 标识文件内容，Part Number 标识分片位置，Part Digest 校验单片，Completion Token 防止重复合并。服务端决定允许的分片大小、数量、过期时间和并发。

```mermaid
flowchart LR
  F[选择文件] --> I[创建上传会话]
  I --> H[增量计算摘要]
  H --> Q[查询已有分片]
  Q --> U[有界并发上传缺片]
  U --> V[服务端逐片校验]
  V --> C[幂等完成与总摘要]
```

## 步骤一：不要一次读完整文件

浏览器 `File.slice()` 可以按块读取。摘要算法放 Web Worker，避免长计算阻塞主线程；增量 Hash 库需验证实现与内存。是否计算整文件摘要取决于去重与完整性需求，不能把文件名和大小当内容身份。

服务器仍要自行校验分片与最终文件，客户端摘要不是安全证明。文件类型、大小、扩展名、恶意压缩和解析风险在服务端继续检查。

## 步骤二：用有界并发上传缺失分片

创建会话后，服务端返回已存在分片和上传规则。客户端只发送缺片，每片请求携带会话、编号、大小和摘要。并发数按网络、内存和服务端限制动态选择，通常设置一个小上限并测量。

下面是最小并发调度。输入是缺失分片任务，输出是全部完成或首个失败；Worker 数限制同时在途请求。生产实现还要支持 AbortController、进度、单片重试和错误分类。

```ts
async function uploadParts(
  parts: PartTask[],
  concurrency: number,
  send: (part: PartTask) => Promise<void>
) {
  let cursor = 0

  async function worker() {
    while (cursor < parts.length) {
      const part = parts[cursor++]
      await send(part)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, parts.length) }, worker)
  )
}
```

JavaScript 单线程内的 cursor 领取是同步的，因此不会给两个 Worker 分配同一索引。失败后 Promise 拒绝，但已发请求可能仍在运行；实际实现用共享 AbortController 停止未完成请求，并保存服务端已经确认的结果。

## 步骤三：单片重试也要幂等

服务端以 `(uploadId, partNumber)` 唯一保存，重复上传相同摘要返回原结果；相同编号不同摘要返回冲突。只重试连接错误、超时、429 或明确 5xx，并使用有界退避。认证、会话过期和摘要错误不自动重试。

页面刷新后，通过 uploadId 查询已确认分片。上传会话与用户、文件摘要和权限绑定，不能仅凭可猜 ID 访问。对象存储预签名 URL 短期、单分片使用，并限制方法、大小与类型。

## 步骤四：幂等完成与清理

客户端提交全部分片摘要与 Completion Key。服务端确认数量、顺序、单片摘要和最终总摘要，再原子创建文件记录。重复完成返回同一文件结果，不重复拼接或收费。

合并可以由对象存储 Multipart Complete 或后台任务完成。状态区分 uploading、verifying、completed、failed 和 expired。过期会话的孤立分片由独立清理任务按引用删除。

## 正常结果和失败结果

| 场景 | 预期 |
| --- | --- |
| 网络在 90% 中断 | 重连查询并只补缺片 |
| 同一分片重复发送 | 相同摘要幂等返回 |
| 分片内容变化 | 冲突并拒绝合并 |
| 页面关闭 | 停止请求，服务端会话保留到过期 |
| 完成请求响应丢失 | 用 Completion Key 查询原结果 |
| 总摘要不匹配 | 失败，不发布文件 |
| 会话过期 | 明确重新开始或续期策略 |

浏览器测试使用受控网络断开、刷新、重复分片、并发上限和大文件内存观察。服务端检查对象数量、最终摘要、权限和清理，不只看进度条到 100%。

## 参考资料

- [File API](https://w3c.github.io/FileAPI/)
- [Web Workers](https://html.spec.whatwg.org/multipage/workers.html)
- [AWS S3 Multipart Upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)
- [tus resumable upload protocol](https://tus.io/protocols/resumable-upload)
