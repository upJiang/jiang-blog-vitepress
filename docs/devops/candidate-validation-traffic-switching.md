---
title: "候选验证、流量切换与回滚"
description: "在旧版保持服务时启动候选，完成业务验证后只切换代理指针，并准备即时回滚。"
category: devops
tags: ["Deployment", "Rollback"]
updated: 2026-08-05
order: 50
depth: flagship
series: "安全交付"
---

# 候选验证、流量切换与回滚

发布最危险的做法是先停止旧版，再启动新版检查。如果新版不能连接数据库，用户已经没有可用服务。候选发布让旧版继续承接流量，新版使用独立容器或端口启动，验证通过后只改变代理目标。

本篇完成一次最小切流：记录当前版本，启动候选，验证健康与一个业务流程，备份 Nginx upstream，平滑切换，再用公网入口回归。任一关键门禁失败都保持或恢复旧版。

## 健康、就绪和业务验证是三件事

容器 running 只表示进程存在；liveness 说明进程未卡死；readiness 说明可以接请求；业务冒烟则证明配置、权限、数据和关键流程真的工作。候选还要核对镜像 Digest、配置版本、迁移版本和后台角色。

```mermaid
flowchart LR
  S[旧版继续服务] --> C[启动候选]
  C --> H[健康与版本]
  H --> B[最小业务验证]
  B --> N[Nginx 配置测试]
  N --> X[切换 upstream]
  X --> V[公网回归]
  V -->|失败| R[切回旧版]
```

候选若与生产共享数据库和队列，要防止它同时启动唯一 Scheduler 或主控任务。只读或低风险验证使用临时主体、最小请求，并在结束后精确清理测试数据。

## 步骤一：建立发布清单

切流前记录旧 upstream、旧实例和镜像、候选镜像摘要、配置与迁移版本、验证项目和回滚命令。没有明确旧目标，就无法在故障时快速恢复。

数据库变更使用 Expand-Migrate-Contract：先添加兼容结构，新旧代码都能读写；大回填独立限速；删除旧列等 Contract 动作等回滚窗口结束后再做。若 Schema 已不兼容旧应用，切回镜像并不构成完整回滚。

## 步骤二：启动候选并旁路验证

候选不占用正式 upstream。先从内部网络检查版本与 readiness，再通过受控旁路入口验证认证、一个关键读写、异步或流式终态。每个断言检查响应 Schema 与数据库状态，不只看 200。

连接拒绝可以做有限重试；权限错误、版本不符和业务断言失败立即阻断。候选不能为了通过测试而使用与最终生产不同的镜像或关键配置。

## 步骤三：只切换代理目标

保存 Nginx 配置备份，只修改 upstream server 或稳定指针。运行 `nginx -t`，通过后平滑 reload。切流不需要停止数据库、Redis、Broker 或整套 Compose，旧容器也继续保留。

切换后立即从三个视角检查：公网域名验证真实 TLS、缓存和 Cookie；代理直连排除 DNS/CDN；候选内部定位应用自身。VitePress 站还要刷新深层文章并检查随机 404。

长连接不会瞬间迁移。旧实例先 not-ready 停止新连接，保留在途 SSE/WebSocket 排空；客户端带游标重连新实例。后台 Worker 按队列与角色分批替换，消息 Schema 支持新旧消费者共存。

## 步骤四：按预设信号回滚

关键业务失败、数据不变量破坏、越权或无法观测时立即切回。性能告警则按发布前基线和用户影响阈值决定降权或回滚。阈值在发布前确定，避免事故中争论“再看看”。

回滚只把 upstream 恢复到旧目标，测试配置并 reload，然后验证公网和核心业务。数据库、缓存和 Volume 保持不动。候选保留用于诊断，不继续承接主流量。

| 场景 | 行为 |
| --- | --- |
| 候选健康失败 | 不切流，旧版不变 |
| Nginx 配置语法错误 | reload 被阻止 |
| 切流后核心请求失败 | 立即恢复旧 upstream |
| 非关键功能异常 | 关闭功能或降级，按阈值决定 |
| 观测数据缺失 | 暂停发布，无法证明安全 |
| 数据已产生不兼容变化 | 使用预先定义的前滚/恢复方案 |

观察期覆盖真实流量周期、异步任务和数据新鲜度。稳定后只保留当前版本和一个已验证回滚版本，再按引用清单精确删除其余容器、镜像和临时包。无差别 prune 可能误删运行资源与 Volume。

## 怎样演练发布机制

在隔离环境主动让候选健康失败、代理配置出错、切流后返回 5xx、Runner 中途退出、长连接断开和旧新 Worker 共存。验证自动化能保持旧版、读取发布状态并恢复，而不是等真实事故第一次运行回滚命令。

## 下一步

应用切回旧镜像并不能恢复已经错误修改的数据。最后一篇进入备份和迁移，先在空环境证明备份可恢复，再讨论兼容 Schema 与时间点恢复。

## 参考资料

- [Nginx Controlling](https://nginx.org/en/docs/control.html)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Google SRE: Canarying Releases](https://sre.google/workbook/canarying-releases/)
- [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
