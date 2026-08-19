---
title: 文件上传、准入与对象存储
description: 设计上传协议、文件校验、内容哈希、Manifest、重复上传、对象生命周期和失败清理。
category: ai-agent
part: RAG 知识工程
stageKey: rag
chapter: 40
sequence: 40
slug: rag-upload-admission-object-storage
tags:
  - RAG
  - Upload
  - Object Storage
sourceKey: ai-rag-upload-admission-object-storage
dependsOn:
  - rag-strategy-map
updated: '2026-08-17'
lastUpdated: false
---
# 文件上传、准入与对象存储

RAG 入库通常从一个文件开始。接口收到 `handbook.pdf` 并返回 200，只能证明字节进入了某个服务进程。它没有证明调用者有权写入目标知识库、文件内容真是 PDF、压缩包不会展开成数百 GB，也没有证明后续失败时临时对象会被清理。

**File Admission（文件准入）** 在解析之前确认身份、范围、大小、类型和载体风险。**Object Storage（对象存储）** 保存原始字节和不可变对象元数据。两者共同建立可追溯入口，解析、切块和索引只消费已经准入的对象引用。

## 上传成功与入库完成是两个状态

大文件解析、OCR 和 Embedding 很难在一个 HTTP 请求里完成。上传接口适合返回稳定对象键和任务 ID，后续状态通过查询或事件读取：

```text
uploaded
admitted
parsing
chunking
embedding
validating
active
failed
```

`uploaded` 表示原始对象已经持久化，不能在 UI 上显示“知识已可检索”。只有候选版本通过质量门禁并原子激活后，在线 RAG 才能读取。

状态需要单调。失败任务重试可以产生新 Attempt，不能把已经 `active` 的旧版本改回 `parsing`。用户删除文档时也要区分停止检索、删除候选产物和按政策清除原始对象。
## 身份和目标范围先于文件读取

接口先认证调用者，再校验对目标知识库的写权限。服务端从认证上下文取得用户与租户，不能相信 multipart 表单中的 `owner_id`。

若系统允许省略知识库 ID 并创建临时空间，这个行为要有明确产品语义和配额。不能在调用者写错 ID 时自动生成一个新空间，否则权限错误会被伪装成成功。

授权通过后才读取请求体，可以减少越权请求消耗内存和网络。网关与应用都设置大小限制，但应用仍需执行有界读取，因为客户端可以省略或伪造 `Content-Length`。
## 大小限制要覆盖传输和解压后内容

只检查请求头不够。可靠读取遵循：

```text
读取最多 max_size + 1 字节
若实际长度超过 max_size，立即拒绝
写入对象存储时继续使用流或有界缓冲
```

直接把整个文件读进内存实现简单，限制为几十 MB 时仍要计算并发峰值。100 个并发上传各占 50 MB，单是请求体就可能消耗 5 GB。大文件场景应流式写入临时对象，同时增量计算哈希，并在最终提交前完成扫描。

压缩格式还存在展开大小。一个几 MB 的 OOXML 或 ZIP 可以包含上万个条目、极高压缩比和数百 MB 解压数据。准入检查需要限制：

```text
archive entry count
total expanded size
single entry size
compression ratio
path traversal
nested archive depth
```

图片也有像素炸弹。文件字节不大，解码后的宽乘高可能巨大。像素上限、帧数和解码器警告应在 OCR 前检查。
## 文件名、扩展名、MIME 和 Magic 都要看

客户端声明 `Content-Type: application/pdf` 只是提示。攻击者可以把可执行文件改名为 `.pdf`，也可以上传扩展名与内部容器不一致的文件。

准入应综合：

1. 清理后的安全文件名。
2. 扩展名允许列表与禁止列表。
3. 声明 MIME。
4. 文件 Magic 或容器签名。
5. OOXML 内部目录结构。
6. 解析器实际支持范围。

`.docx`、`.xlsx` 和 `.pptx` 本质是 ZIP 容器，需要检查内部前缀与内容类型。旧 `.doc`、`.xls`、`.ppt` 若解析器不支持，应明确要求转换，不能把乱码当纯文本继续入库。

可执行 Magic 命中时直接拒绝。扩展名在禁止列表时也不进入对象存储。类型不一致返回稳定错误码，日志只记录检测类别、哈希和请求 ID。
## 安全扫描给内容加标签

文本和容器中的可扫描内容可以检查凭证、个人信息和提示注入模式。扫描结果分为阻断和警告：

| 风险 | 可能处置 |
| --- | --- |
| 可执行程序或不支持容器 | 拒绝 |
| 明文私钥和访问令牌 | 按策略拒绝或隔离 |
| 个人信息 | 警告、脱敏或受限范围 |
| 疑似提示注入 | 保留不可信标签，后续上下文隔离 |
| 解析器警告 | 进入候选版本，质量门禁决定 |

正则扫描存在漏报和误报。未命中不能证明安全，命中“ignore previous instructions”的安全研究文档也不应必然删除。风险标签沿 Source、Chunk 和 Evidence 传播，Runtime 仍阻止文档文字控制工具。

病毒扫描、内容安全服务和数据分类可以作为独立准入步骤。外部扫描服务超时时，高风险场景应进入隔离或失败关闭，不能默认放行。
## 远程 URL 上传需要 SSRF 防护

“从 URL 导入”让服务端主动访问地址，攻击面比本地上传更大。最基本的边界包括：

```text
只允许 HTTP 和 HTTPS
拒绝 URL 中的账号与凭据
限制端口
解析域名并拒绝非公网 IP
连接后核对真实 Peer IP
每次重定向重新校验目标
限制重定向次数、响应大小和超时
禁用环境代理继承
```

只在请求前检查域名会受到 DNS Rebinding。解析得到公网地址后，实际连接可能落到私网 IP，因此要验证连接对端。重定向也可能从公网 URL 跳到 `localhost` 或云元数据地址，每一跳都重新执行相同规则。

下载时先检查声明长度，再以 `max_size + 1` 有界读取。最终 URL、检测类型和内容哈希进入 Manifest，URL 查询参数中的敏感值不写普通日志。
## 对象键要隔离租户与业务身份

原始对象键可以形如：

```text
tenant_or_kb_id / random_object_id . extension
```

随机 ID 避免用户文件名碰撞，原始文件名保存在受控 Metadata 中。读取时同时校验当前知识库权限和对象键前缀，不能因为调用者猜到完整键就直接返回。

路径规范化拒绝绝对路径、空段、`.` 和 `..`。读取与删除复用同一个规范化函数，避免预览接口安全、删除接口却允许跨前缀。

公开预览和内部读取应使用不同策略。私有对象不直接暴露永久公网 URL；可以通过鉴权代理或短期签名 URL 访问。响应设置真实 Content-Type、Content-Disposition 和 `X-Content-Type-Options: nosniff`，减少浏览器把附件当脚本解释。

对象存储凭证只存在服务端集成层，不进入模型上下文或任务日志。
## 内容哈希与对象身份解决不同问题

随机对象键标识一次上传，**Content Hash（内容哈希）** 标识字节内容。两者不能互相替代。

相同文件可能被两个用户上传到不同 Scope，它们可以共享底层不可变 Blob，权限与文档记录仍然独立。同一个文档的新版本也可能字节相同但 Metadata、Release 或可见范围变化，不能只看哈希宣布整个入库幂等。

Manifest 可以保存：

```text
object_key
content_hash
byte_size
detected_content_type
original_filename
uploader_id
tenant_or_kb_id
visibility_scope
security_warnings
created_at
```

后续解析版本还要绑定 parser version、chunker version、Embedding model 和索引配置。内容相同而解析器升级时，系统可能需要重建候选版本。
## 幂等上传要定义重放范围

客户端超时后可能重发同一请求。服务端使用幂等键绑定调用者、目标知识库、文件摘要和操作类型：

```text
same idempotency key + same request digest
  -> return previous object/task

same idempotency key + different digest
  -> reject conflict
```

仅以文件名去重会误伤不同内容，仅以内容哈希全局去重又会跨 Scope 泄露“该文件已经存在”。外部响应不应告诉无权用户另一个租户是否拥有相同 Blob。

幂等记录覆盖合理重试窗口。Multipart 分片上传还要校验分片序号、哈希和最终合并摘要，重复分片不会改变最终对象。
## 对象生命周期与入库事务不同

对象存储和关系数据库通常没有跨系统事务。可采用 Saga 或 Outbox 管理状态：

```mermaid
flowchart LR
    A[准入通过] --> B[写临时对象]
    B --> C[创建文档与任务记录]
    C --> D[提交对象为活动原件]
    D --> E[异步解析]
```

写对象成功、数据库失败时，补偿任务删除明确属于本次上传的临时对象。数据库成功、任务发布失败时，Outbox 重放任务事件。解析失败不立即删除原始对象，因为用户可能需要查看错误、修复配置后重试。

临时对象设置生命周期标签或过期时间，后台扫描只清理没有活动文档引用、超过保留期的对象。不能定期按目录猜测删除，否则可能清掉正在解析或等待恢复的资料。

用户删除文档时，先让活动版本停止检索，再清理 Chunk、Embedding、缓存和对象引用。底层 Blob 被多个文档引用时，引用计数归零后才物理删除。
## 失败需要可解释且可恢复

错误分类至少区分：

```text
permission_denied
file_too_large
unsupported_type
type_mismatch
archive_limit_exceeded
security_policy_blocked
remote_url_blocked
storage_unavailable
metadata_commit_failed
```

4xx 输入错误不重试，存储暂时不可用可以在 Deadline 内退避重试。返回给用户的文案不泄露内部路径、Bucket 或解析器栈。

任务记录保存当前阶段和最后错误码。重新上传、从已保存原始对象重试解析、或放弃任务是三个不同动作，应有独立幂等身份。
## 测试要覆盖恶意载体和中途失败

| 场景 | 关键断言 |
| --- | --- |
| 无目标知识库权限 | 不读取完整请求体，不写对象 |
| 缺少或伪造 Content-Length | 有界读取仍能阻断超限 |
| `.pdf` 文件含可执行 Magic | 准入拒绝 |
| OOXML 内部结构不匹配 | 类型检查失败 |
| 压缩炸弹与路径穿越 | 解压前门禁阻断 |
| 超大像素图片 | OCR 前拒绝 |
| URL 指向私网或非标准端口 | 不发起下载 |
| 公网 URL 重定向到私网 | 在重定向处拒绝 |
| 同幂等键重复上传 | 返回同一任务，不重复写入 |
| 对象写入后数据库失败 | 临时对象进入精确补偿 |
| 解析失败 | 原始对象按策略保留，活动版本不变 |
| 跨知识库对象键读取 | 统一拒绝 |

集成测试使用隔离 Bucket 和数据库，故障测试注入对象写入、数据库提交、任务发布与删除失败。测试结束只清理本用例明确创建的键。

观测记录上传字节、检测类型、准入耗时、风险代码、对象写入结果、任务 ID 和清理状态。原文件名与正文可能包含敏感信息，不作为 Metric 标签。

文件上传是知识链的第一道事实边界。调用者身份、真实类型、内容哈希和对象范围在这里固定，后续解析只消费稳定引用。入口若接受了错误或越界字节，向量模型再强也无法把整条链修正回来。
