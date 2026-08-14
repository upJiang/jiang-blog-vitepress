---
title: 前端 CI/CD、制品、灰度与回滚
description: 把提交检查、锁文件安装、测试、构建、Source Map、不可变制品、环境提升、灰度和回滚串成可审计流水线。
category: frontend
part: 构建工具
chapter: 51
tags:
  - CI/CD
  - Release
  - Artifact
prerequisites:
  - Git、构建和 HTTP 缓存基础
outcomes:
  - 设计一次构建多环境提升
  - 建立发布验证和回滚点
practice:
  type: implementation
  result: 编写一份前端发布 Runbook
  verify:
    - 生产不重新构建同一版本
    - HTML 与哈希资源缓存策略匹配
evidence: official-guided-operation
updated: 2026-08-11
---

# 前端 CI/CD、制品、灰度与回滚

前端 CI/CD 覆盖代码提交后的检查、构建、制品发布和环境切换；制品是一次构建得到的可部署文件，灰度控制它获得多少流量，回滚把入口恢复到已验证版本。这条流水线连接 Git、构建环境与运行平台，核心用途是让测试、预览和生产提升同一份可追溯结果。

测试环境和生产分别执行 build，即使提交相同，也可能因依赖、环境变量和时间不同生成两份产物。可靠发布只构建一次不可变制品，测试、预览和生产提升同一份，并把环境配置限制在运行时可替换边界。

## 流水线输入与输出

CI 从提交、锁文件和受控构建环境开始，执行严格安装、类型/Lint、单元/组件、构建、资产检查和安全扫描。输出包含静态资产、版本清单、校验和、SBOM、私有 Source Map 和测试证据。

Secrets 只在需要阶段注入，不能通过 `VITE_*` 等客户端变量打进公开 JavaScript。浏览器需要的配置都应视为公开信息。

## 缓存与原子发布

带内容哈希的 JS/CSS 可长缓存 immutable，HTML 和版本清单短缓存或协商验证。发布先上传新哈希资产，再原子切换 HTML，避免新 HTML 引用不存在文件；旧资产保留观察周期，支持旧页面继续加载和快速回滚。

Source Map 上传到错误平台并关联 release，默认不公开部署。删除 Source Map 前确认错误平台已接收且版本一致。

## 灰度和回滚

候选环境先做静态文件、关键路由、API 契约、CSP 和浏览器冒烟。灰度按稳定用户或流量键分配，观测错误率、性能和业务关键指标。回滚切回上一份 HTML/manifest，不重新在线构建。

数据库/API 不兼容会让前端回滚失效，因此跨版本协议要保持扩展兼容。Service Worker 还可能缓存旧 shell，发布和回滚都要验证更新策略。

## 验证与追踪

每个页面暴露 release ID，错误、RUM 和 Source Map 使用同一版本。发布记录包含制品校验和、审批、灰度范围、监控窗口和回滚位置。流水线失败不修改生产指针。

CI/CD 需要把一次构建、不可变制品、缓存顺序、Source Map、灰度证据和回滚协议连成一条发布链。GitHub Actions 步骤只是它的执行载体。

## 一次提交如何变成可回滚制品

CI 首先用锁文件恢复依赖并记录 runner/toolchain 版本，再并行 lint/typecheck/unit/contract，所有通过后只构建一次带 commit/release ID 的产物。HTML、哈希资源、Source Map 和 manifest 打包并计算校验；环境提升只复制这份制品，不在测试或生产重新执行可能得到不同结果的构建。

```text
commit -> immutable install -> checks -> build
       -> artifact + checksum + private Source Map
       -> staging smoke -> canary pointer -> RUM/error gate
       -> full traffic; previous pointer remains rollback target
```

缓存只加速可验证的纯步骤，key 要包含 lockfile、配置、构建器和源码哈希；命中不能跳过安全审计或关键契约。哈希 JS/CSS 可以长缓存，HTML/manifest 需要短缓存或 revalidate，避免新 HTML 指向不存在旧资源。Service Worker 更新还要验证旧 shell、激活和回滚。

灰度门禁同时看 JS 错误、LCP/INP、关键转化和资源 404；只看 HTTP 200 会漏掉功能降级。API 向后兼容是前端回滚前提，切流前保留旧指针和配置快照，失败时切回并确认浏览器实际加载旧 release。

## 官方依据

- [GitHub Actions: Dependency caching](https://docs.github.com/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Web.dev: Cache-Control](https://web.dev/articles/http-cache)
- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
