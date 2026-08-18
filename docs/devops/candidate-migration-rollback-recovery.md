---
title: 候选验证、迁移、切流、回滚、备份与恢复
description: 沿预检、备份、候选实例、兼容迁移、旁路验证、流量切换、即时回滚和隔离恢复设计发布。
category: devops
part: 第八部分：交付与综合项目
chapter: 36
tags:
  - Deployment
  - Migration
  - Recovery
prerequisites:
  - 理解数据库、容器、Kubernetes 和 CI/CD
outcomes:
  - 设计不中断依赖的低风险发布
  - 区分应用回滚、数据回退和灾难恢复
practice:
  type: implementation
  result: 完成一份发布与恢复 Runbook
  verify:
    - 旧版本在切流时仍可用
    - 恢复能力由隔离演练而非备份文件证明
evidence: anonymized-practice
updated: 2026-08-17T00:00:00.000Z
---
# 候选验证、迁移、切流、回滚、备份与恢复

新版本已经通过单元测试，数据库迁移却删除了旧代码仍需要的列。应用切流失败后虽然镜像能回滚，旧进程也无法读取新 schema。应用回滚、数据回退和灾难恢复是三件事：只有在设计兼容迁移、备份恢复和旧版本可运行路径后，“可以回滚”才不是口号。



## 一次发布需要哪些相互独立的回退点

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Candidate | 使用最终制品和目标配置启动、但尚未承接正式流量的实例。 |
| Expand/Contract Migration | 先新增兼容结构并让新旧代码共存，稳定后再删除旧结构，避免一次性破坏回滚。 |
| Traffic Switch | 通过负载均衡、Service selector 或路由权重把新请求转向候选，数据层不应被顺带重启。 |
| Rollback | 把应用流量恢复到已验证旧版本；不自动撤销已写入的新数据。 |
| Recovery | 从隔离备份重建依赖并验证业务不变量，证明数据灾难后能恢复。 |

## 排障时最容易走错的岔路

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| 镜像可回滚 | schema 或数据已经变成旧代码不兼容 | 采用 expand/contract 并做旧版本 probe |
| 候选健康 | 后台任务可能重复运行或未覆盖真实入口 | 禁用重复 master 任务并切流后回归 |
| 备份成功 | 备份可能损坏、缺对象存储或恢复时间超标 | 隔离恢复演练 |
| 切回旧 upstream | 新版本写入的任务和事件仍可能继续 | 停止新准入并处理在途/补偿 |

::: warning 不要用重启代替诊断
恢复服务和解释故障是两个目标。紧急止损后仍要回到原始日志、指标与状态转换，避免同类问题重复出现。
:::

## 候选版本怎样在不删除旧版本的情况下上线

```mermaid
flowchart LR
  S0["预检备份"]
  S1["兼容迁移"]
  S2["旁路验证"]
  S3["切流观察"]
  S4["恢复收束"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
```

### 预检备份：Release Controller/DBA

核对 digest、容量、兼容矩阵，创建并校验可恢复备份。

这一动作的可观察结果是 preflight、backup manifest、restore check。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 兼容迁移：Migration Job

执行可重复 expand 迁移，记录 schema version 并保持旧代码可读。

可以从这些位置确认结果：migration id、lock time、old-version probe。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 旁路验证：Candidate

在隔离入口连接真实依赖的受控范围，验证健康、鉴权、流式与状态写入。

这里不靠猜测，优先读取 candidate trace、test identities、cleanup。

### 切流观察：Router

最小修改 upstream/权重，持续比较 SLO 与业务终态，旧实例保持待命。

决定下一步前需要看到 traffic event、error budget、rollback target。

### 恢复收束：Operations

稳定后执行 contract；异常先切回，再分析候选，定期隔离恢复演练。

这一动作的可观察结果是 cleanup list、RTO/RPO evidence。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

## 把发布写成有停止条件的 Runbook

以下为顺序清单，不是特定平台命令。每一步输入、证据和失败动作都必须在真实环境补全。

```text
1 preflight: artifact/signature/config/capacity -> stop on mismatch
2 backup: create + verify manifest + isolated restore sample
3 migrate: expand only -> verify old and new application compatibility
4 candidate: health + auth + SSE + state transition + cleanup
5 switch: change only traffic target -> immediate public regression
6 observe: SLO + logs + business invariants -> rollback on threshold
7 contract: only after rollback window and explicit approval
```

旁路成功不保证公网路由、证书和真实网关策略正确，所以切流后必须即时回归。回滚应优先只改变流量指向，不停止数据库、Redis 或旧实例。备份文件存在也不证明恢复，应在隔离位置实际还原并校验行数、对象引用与权限不变量。



## 最后回到适用范围

破坏性 contract 迁移、旧制品清理和备份过期都应在观察期后独立审批。RTO 是恢复所需时间目标，RPO 是可接受数据丢失窗口；二者必须由演练证据支持。

最后一篇把前 36 章放回同一条 Enterprise AI Platform 请求链，展示如何按风险和需求逐步建设，而不是一次堆满组件。
