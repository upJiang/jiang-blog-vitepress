---
title: Redis 在 AI 系统中的缓存、Session、限流与任务角色
description: 比较缓存、会话、令牌桶、Broker 和调度状态的读写模式，解释 TTL、淘汰、持久化与故障边界。
category: devops
part: 第二部分：AI Backend 基础设施
chapter: 9
tags:
  - Redis
  - Cache
  - Rate Limit
prerequisites:
  - 理解键值操作
outcomes:
  - 为不同状态选择 Redis 数据结构
  - 避免缓存和队列争抢同一资源预算
practice:
  type: decision
  result: 完成一张 Redis 场景决策表
  verify:
    - 业务真相保留在持久存储
    - 每类键都有 TTL、所有者和失效策略
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# Redis 在 AI 系统中的缓存、Session、限流与任务角色

同一租户一分钟内发送了 120 次请求，限流器却偶尔放过第 101 次；另一次 Redis 重启后，所有用户被迫重新登录，Worker 还重复执行了几个任务。把缓存、Session、限流和队列都理解为“放一个值到 Redis”会掩盖它们完全不同的正确性要求。

## 安装 Redis 并确认开发端点

Redis 的官方入口是[下载页](https://redis.io/downloads/)。本地验证可以使用单独容器，先把连接和命令端点跑通，再为缓存、Session、限流和任务分别设置 TTL、持久化与恢复策略。

<figure class="doc-shot">
  <img src="/images/install/redis-download.png" alt="Redis 官方下载页面" loading="lazy">
  <figcaption>Redis 官方下载入口。客户端连通只是起点，不能证明数据在重启后仍存在，也不能证明队列不会重复投递。</figcaption>
</figure>

```bash
docker run --name redis-dev -p 6379:6379 -d redis:7
redis-cli -h 127.0.0.1 ping
redis-cli -h 127.0.0.1 INFO server | rg redis_version
```

`PONG` 和版本输出能确认服务端响应，后续仍要在隔离 key 上测试过期、重启、淘汰和恢复。生产环境不要使用没有密码、没有内存上限的默认容器。



## Redis 快，但哪些状态真的适合放进去

Redis 的数据结构、TTL、持久化和故障转移影响的是不同层，先确认业务状态是否允许丢失，再选择缓存、队列或持久存储语义。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Cache | 可从权威来源重新计算的数据副本，丢失会变慢但不应改变业务事实。 |
| Session | 把随机会话标识映射到主体和过期时间的短期安全状态，泄露或错误续期会改变身份边界。 |
| Rate Limit | 在时间窗口内对主体和资源统计消耗，更新必须原子，否则并发请求会绕过上限。 |
| Queue State | 任务待处理、处理中、重试和终态的协调信息；是否允许丢失、重复和恢复要由队列语义决定。 |

::: tip 判断原则
先用只读证据确认键空间、命中率和过期行为，再决定清理或调整配置，避免把缓存问题误判成数据库故障。
:::

## 一次限流判断为何需要原子更新

```mermaid
flowchart LR
  S0["构造 key"]
  S1["读取更新"]
  S2["形成决定"]
  S3["过期恢复"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

箭头表示状态的先后依赖，不表示所有步骤都在同一进程或同一台机器完成。下面沿链路逐段展开。

### 构造 key：Gateway

用租户、能力和窗口构造低歧义 key，不把原始 API Key 放入名称。

可以从这些位置确认结果：key pattern、租户维度、过期策略。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 读取更新：Redis

在一次原子操作中增加计数并设置首次 TTL。

这里不靠猜测，优先读取 返回计数、PTTL、命令延迟。

### 形成决定：Gateway Policy

把计数与 limit 比较，返回通过或 429 和 Retry-After。

决定下一步前需要看到 policy decision、剩余额度。

### 过期恢复：Redis Expiration

窗口结束后删除计数；故障恢复遵循明确持久化策略。

这一动作的可观察结果是 expired keys、重启恢复、主从状态。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

## 用 Lua 避免 INCR 与 EXPIRE 之间的竞态

脚本展示固定窗口限流的原子语义。输入是已脱敏的限流 key、窗口秒数和上限；输出是当前计数与剩余 TTL。它没有解决滑动窗口公平性和多区域一致性。

```lua
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return {current, ttl}
```

如果客户端先 `INCR` 后因网络中断没有执行 `EXPIRE`，计数会永久存在；脚本把两步放入 Redis 单线程执行的原子单元。调用方仍需判断返回计数是否大于上限，并把 Redis 不可用时的 fail-open 或 fail-closed 策略写清楚。

## 命中、过期与持久化是三条证据

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| 缓存命中率高 | 热门错误或越权结果也可能被高效缓存 | key 必须包含租户、模型、知识版本和权限维度 |
| 设置了 TTL | 续期逻辑或覆盖写可能清掉/延长 TTL | 同时观察值、TTL 和写入路径 |
| Redis 有持久化 | AOF/RDB 仍存在恢复窗口，不等同权威数据库 | 按状态可丢失程度设计恢复 |
| 队列至少一次 | 至少一次意味着可能重复，不是“绝不丢且只执行一次” | 业务处理使用幂等 key 和终态表 |

::: warning 容易误判
一条成功命令只能证明它覆盖的那一层。重启后的短暂恢复也不是根因已经消失，改变状态前先保存最早证据。
:::



## 这套判断方法的边界

不要扫描全库作为在线业务逻辑，也不要把 Prompt、文档正文或 Secret 放进 key。缓存可以在故障时绕过，Session 与限流的降级则涉及安全选择；队列需要确认 ack、lease 和重试语义。Redis 角色越多，内存、淘汰策略和故障域越要隔离。

Redis 擅长短期协调，模型配置、任务终态、用量和向量元数据仍需要事务与查询能力。下一篇进入 PostgreSQL、JSONB、pgvector 和连接池。
