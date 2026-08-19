---
title: "CI、测试、镜像制品与供应链"
description: "从 CI 通过但线上镜像不同开始，串起三语言矩阵、锁文件、SBOM、签名、不可变制品和依赖漏洞门禁。"
category: backend
part: "交付"
chapter: 44
tags:
  - "CI"
  - "Artifact"
  - "Supply Chain"
prerequisites:
  - "理解 Docker 和测试层级"
outcomes:
  - "能设计从源码到镜像的可追溯链"
  - "能阻止未验证制品进入发布"
practice:
  type: implementation
  result: "写出一份三语言 CI 工作流结构"
  verify:
    - "构建只产生一次不可变制品"
    - "部署引用摘要而不是 latest"
evidence: official-guided-operation
updated: 2026-08-12
---

# CI、测试、镜像制品与供应链

CI 在隔离环境对提交执行检查和构建，测试证明特定行为，镜像或其他制品保存可部署结果，供应链控制依赖、签名与来源。它们位于源码提交与部署入口之间，用来交付可追溯、不可变且经过验证的版本；一条绿色流水线只有在产物身份也固定时才有意义。

CI 测试全部通过，但部署拉到的 `latest` 已被另一条流水线覆盖；镜像里还混入开发依赖和高危包。CI 的交付物不是绿色图标，而是可追溯、不可变、经过测试与扫描的制品，以及证明这些步骤运行过的记录。

## 流水线按反馈速度逐层阻断

先运行格式、Lint、类型和快速单测，再运行 MySQL/Redis/RabbitMQ/MinIO 集成与 OpenAPI 契约，最后构建镜像和小规模安全/启动检查。越快的失败越靠前，昂贵步骤只在基础门禁通过后运行。

所有步骤从锁文件安装依赖，固定工具大版本。缓存只加速下载/编译，不跳过测试；缓存 key 包含锁文件和运行时版本，避免复用不兼容产物。

```mermaid
flowchart LR
  SRC[Source + lockfiles] --> STATIC[lint/type/unit]
  STATIC --> INT[integration/contract]
  INT --> BUILD[build images]
  BUILD --> SCAN[SBOM/vulnerability/secret]
  SCAN --> SIGN[sign + provenance]
  SIGN --> REG[immutable registry]
```

任何一步失败都不产生可晋级制品。构建后测试也应针对最终镜像启动，避免源码测试与镜像内容不一致。

## 制品用 digest 连接源码、依赖和部署

镜像 Tag 使用 commit/版本便于阅读，digest 提供内容身份。流水线输出 commit SHA、镜像 digest、SBOM、签名、构建参数与测试报告；部署记录引用同一 digest。

不要在候选通过后重新构建生产镜像。相同源码在不同时间可能解析到不同基础镜像或外部依赖，重新构建产生未经验证的新制品。

| 证据 | 回答的问题 | 存放 |
| --- | --- | --- |
| 测试报告 | 哪些行为通过 | CI Artifact |
| SBOM | 制品包含哪些组件 | 制品关联元数据 |
| 镜像 digest | 部署的确切字节 | Registry/部署记录 |
| 签名/Provenance | 谁、用什么过程构建 | 透明日志/Registry |
| 迁移版本 | 数据库需要到哪个状态 | 发布记录 |

## 供应链控制从依赖进入构建环境开始

依赖锁定、Registry 白名单、校验和、最小 CI Token 权限和隔离 Runner 减少投毒面。PR 来自不可信 Fork 时，不能自动获得生产 Secret 或发布权限。

漏洞扫描结果要有严重度、可利用性和例外到期。无修复且不可达的漏洞可经审查暂时接受；“扫描有告警所以永远不发布”与“全部忽略”都不可执行。

下面是三语言矩阵的结构示意。真实 CI 应引用锁定 Action/镜像版本，并把发布 Job 与普通 PR Job 的权限分开。

```yaml
strategy:
  matrix:
    service: [node, python, go, react]
steps:
  - checkout
  - restore-dependency-cache
  - run: ./ci/test-${{ matrix.service }}.sh
  - run: ./ci/build-${{ matrix.service }}.sh
  - upload-test-report

publish:
  needs: [test, contract, integration]
  permissions:
    contents: read
    id-token: write
```

伪 YAML 说明职责，不冒充特定 CI 平台可直接执行。发布身份使用短时 OIDC/工作负载身份，避免长期 Registry 密码。

## 失败流水线先保留可复现输入

记录运行时版本、锁文件摘要、服务镜像、测试随机种子和数据库迁移版本。Flaky Test 不应无上限自动重跑后变绿；统计重试并指定 owner 修复。

构建日志脱敏，Artifact 有保留期限。失败 Job 创建的数据库、Bucket 和容器按唯一 run_id 精确清理，不能用全局 prune 影响其他并行任务。

发布环境还要在准入时验证签名、Provenance 中的仓库与工作流身份，以及允许的基础镜像策略。只在 CI 里“生成了签名”却从未校验，不能阻止另一份未签名镜像被部署。

## 供应链证据与镜像运行验证

**为什么 SBOM 不等于漏洞扫描？**

SBOM 列出组件和版本，扫描器再把它与漏洞库匹配。SBOM 还支持许可证、事故查询和影响范围；扫描结果会随漏洞库更新而变化。

**CI Secret 为什么不能提供给所有分支？**

PR 代码可以修改脚本并窃取 Secret。将测试与发布权限分离，受保护环境仅允许审查后的 commit，使用短时最小权限身份。

**镜像签名能证明代码安全吗？**

签名证明制品来自某身份/流程且未被替换，不证明业务无漏洞。仍需测试、评审、扫描和运行时防护。

**为什么最终镜像还要做启动测试？**

多阶段 COPY、入口、权限、动态库和配置可能在源码测试通过后出错。启动镜像并请求 health/关键 API 能验证真实运行包。

## 机制复核：CI、测试、镜像制品与供应链
这篇文章讨论的机制需要放回一次完整请求中验证。先记录输入约束、状态变化、外部依赖和失败结果，再确认成功路径是否留下可追踪的事实。配置、缓存、队列或数据库只承担各自职责，不能用一层的日志推断另一层已经完成。

迁移到实际项目时，优先补一条正常用例、一条重复或并发用例和一条依赖不可用用例。每条用例写明观察指标、错误分类、回滚动作与数据清理范围，测试替身的通过不能代替真实协议和权限验证。

当性能、可靠性和安全目标冲突时，先明确服务对象和可接受损失，再选择超时、容量、重试和降级策略。没有测量依据的阈值只作为待验证假设，发布后用同一公式复验。
