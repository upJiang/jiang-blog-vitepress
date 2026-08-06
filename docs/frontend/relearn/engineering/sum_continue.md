---
title: "持续集成方法"
description: "让自动检查成为可重复的质量反馈回路"
category: frontend
tags: ["CI"]
updated: 2026-08-05
order: 620
depth: reference
series: "重学前端"
---
# 持续集成方法

先为一个 Vite 项目建立最小 CI：锁定 Node 与包管理器版本，按锁文件安装，执行 lint、类型检查、测试和生产构建。我们故意提交一个类型错误，期望流水线在生成部署制品前停止，并给出文件与行号。

本篇在这条可运行流水线上逐步加入缓存、浏览器冒烟、预览环境和制品提升。持续集成的目标是尽早得到可信反馈，不是把命令列表搬到远程机器。

开始前先分清输入和输出。输入是源码、锁文件、运行时版本与构建配置；输出不是一个绿色图标，而是一份经过检查、可追溯到 commit 的构建制品。任何步骤失败都应停止制品进入下一阶段，并保留足够日志定位原因。

## 步骤一：固定可复现输入

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn
      - run: yarn install --frozen-lockfile
      - run: yarn lint
      - run: yarn typecheck
      - run: yarn test
      - run: yarn build
```

这段配置以 Git commit 和锁文件为输入，先固定 Node 20，再按锁文件安装并依次执行四类检查；输出是通过生产构建的工作区。CI 不应悄悄更新依赖；缓存只加速已有步骤，缓存 key 应包含锁文件和工具版本，未命中缓存也要能正确构建。

## 步骤二：按反馈成本排列门禁

| 层次 | 示例 | 目标 |
| --- | --- | --- |
| 秒级 | 格式、lint、受影响类型检查 | 快速指出局部错误 |
| 分钟级 | 单测、组件测试、生产构建 | 验证模块与制品 |
| 较慢 | 浏览器关键路径、可访问性 | 验证真实运行时 |
| 发布前 | 候选环境冒烟、配置与迁移检查 | 验证将要上线的版本 |

快速检查先失败，昂贵任务可以并行。Flaky 测试不能长期自动重跑到绿色；先保留 trace、随机种子和环境信息，隔离问题并设置修复期限。

## 步骤三：只构建一次

```mermaid
flowchart LR
  C[Commit + lockfile] --> V[Checks]
  V --> B[Build artifact]
  B --> A[Artifact digest]
  A --> P[Preview]
  P --> M[Approved production deploy]
```

预览和生产消费同一个哈希制品。若每个环境重新 `yarn build`，依赖源、时间与环境变量可能产生未验证输出。浏览器可见的非敏感运行配置可独立注入，Secret 不进入静态包。

## 步骤四：预览环境绑定提交

预览 URL 应能回答“正在看哪个 commit、哪个 API 环境、何时过期”。按 PR 创建独立预览时要限制权限和数据，不让未审查代码接触生产 Cookie、内部 Token 或真实用户资料。

最小冒烟路径可以是：

```ts
test('article deep link survives refresh', async ({ page }) => {
  await page.goto('/docs/example')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
```

输入是一个可公开访问的文章深链接，关键步骤是直接进入并再次刷新；两次都看到一级标题才算输出成功。这个用例同时检查构建路由与 Web 服务器静态文件映射，仅从首页点击到文章页无法发现刷新 404。

## 步骤五：区分 CI、交付与部署

- 持续集成：频繁合并并自动验证；
- 持续交付：任一通过版本具备受控发布条件；
- 持续部署：通过门禁后自动进入生产。

三者不是成熟度排行榜。生产是否自动部署取决于业务风险、合规、回滚能力与团队值守。自动部署也应保留并发控制、环境权限、候选验证和失败停止条件。

## 故意制造一次失败

删除服务端的无后缀静态路由规则，构建仍然成功，但上面的 deep-link reload 用例应收到 404。这个失败说明编译通过只证明制品可生成，不证明托管环境能按公开 URL 提供它。

修复后再增加一个不存在页面断言，避免把所有路径都重写到 200：首页回退适用于 SPA，静态文档站则应把 clean URL 映射到对应 `.html`，真实不存在路径仍返回 404。

## 流水线验收

1. 旧 lockfile、类型错误、测试失败和构建失败分别有清楚日志；
2. 构建制品记录 commit 与摘要，部署阶段不重建；
3. 预览页面显示的版本能追溯到流水线；
4. PR 没有生产写权限，部署权限绑定受控环境；
5. 取消旧任务不会中断已开始的生产部署；
6. 发布失败能定位候选版本，旧版本仍可服务。

## 参考资料

- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [npm: package-lock and reproducible installs](https://docs.npmjs.com/cli/configuring-npm/package-lock-json)
- [Playwright: Writing tests](https://playwright.dev/docs/writing-tests)
