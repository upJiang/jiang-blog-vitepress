---
title: npm、Yarn、pnpm、Lockfile 与 Monorepo
description: 从幽灵依赖和重复安装进入依赖树、内容寻址、Peer Dependency、Workspace、锁文件合并与版本发布。
category: frontend
part: 构建工具
chapter: 49
tags:
  - npm
  - Yarn
  - pnpm
  - Monorepo
prerequisites:
  - package.json 与 SemVer
outcomes:
  - 解释三种安装布局
  - 维护可复现多包依赖图
practice:
  type: implementation
  result: 搭建并检查三包 Workspace
  verify:
    - 冷安装严格遵守锁文件
    - 包边界不会依赖未声明模块
evidence: official-guided-operation
updated: 2026-08-11
---

# npm、Yarn、pnpm、Lockfile 与 Monorepo

包管理器解析依赖版本、安装文件、执行脚本并维护依赖图；Lockfile 固定一次解析的具体结果；Monorepo 把多个相互依赖的包放在同一仓库管理。它们位于源码、依赖仓库和 CI 构建之间，目标是让本地、测试与发布得到可复现的依赖边界。

本地能 import 一个未写进 package.json 的依赖，CI 干净安装却失败，这就是扁平 node_modules 容易暴露的幽灵依赖。包管理器不仅下载文件，还要解析 SemVer、构建依赖图、选择物理布局、运行生命周期脚本并维护锁文件。

## 先准备 Node 与包管理器

三种包管理器都依赖 Node.js。先从 [Node.js 官方下载页](https://nodejs.org/en/download)安装当前维护中的 LTS 版本，再确认终端使用的是预期版本：

<figure class="doc-shot">
  <img src="/images/install/node-download.png" alt="Node.js 官方下载页，展示 LTS 安装入口" loading="lazy">
  <figcaption>Node.js 官方下载页。包管理器行为受 Node 版本和 Corepack 支持范围影响，先安装维护中的 LTS，再固定项目版本。</figcaption>
</figure>

```bash
node --version
npm --version
```

Node 安装包自带 npm。Yarn 与 pnpm 可以由 **Corepack** 管理，具体支持范围会随 Node 版本变化；Corepack 随 Node 14.19 到 24 分发，Node 25 起需要单独安装。先运行 `corepack --version`，命令不存在时按 [Corepack 官方仓库](https://github.com/nodejs/corepack#how-to-install)安装，再参考 [Yarn 安装文档](https://yarnpkg.com/getting-started/install)和 [pnpm 安装文档](https://pnpm.io/installation)启用对应工具：

```bash
corepack enable
corepack install --global yarn@stable pnpm@latest

yarn --version
pnpm --version
```

团队仓库不应让每个人自动漂移到最新版本。确认命令可用后，在 `package.json` 用 `packageManager` 固定工具和版本，例如 `"packageManager": "pnpm@10.15.0"`，具体版本替换为团队已经验证的值。

::: warning 不要混用锁文件
同一分支只保留一种包管理器的锁文件。`package-lock.json`、`yarn.lock` 与 `pnpm-lock.yaml` 同时存在时，开发机和 CI 很可能解析出不同依赖树。
:::

## Manifest 与 Lockfile 的职责

package.json 表达允许范围和包契约；Lockfile 记录解析后的具体版本、来源、完整性和依赖关系。应用应提交锁文件，并在 CI 使用严格模式，发现 Manifest 与锁文件不一致就失败。

Lockfile 不能阻止恶意包或不安全脚本，还需依赖审计、来源控制和最小脚本权限。不要手工解决 Lockfile 冲突后不做冷安装验证。

## 安装布局

npm/Yarn classic 常尽量 hoist 依赖，减少重复但可能让包访问未声明依赖。pnpm 使用内容寻址存储和链接组织依赖，默认边界更严格。Yarn PnP 用映射替代传统 node_modules，需要工具生态支持。

peerDependencies 表示宿主应提供兼容实例，常用于 React、插件和组件库；它不是“忘记安装的 dependencies”。版本范围过宽或过窄都会让消费端困难。

## Workspace 与任务图

Workspace 让多个包共享安装和本地链接，但 Monorepo 还需要任务依赖、缓存、边界检查和发布策略。构建顺序应从 package graph 得出，缓存 key 包含源码、配置、环境和依赖产物。

统一版本适合一起发布的产品，独立版本适合自治库；changeset 等工具把变更映射到版本和 changelog。内部包也应通过公开 exports 使用，不能借 Monorepo 路径穿透私有源码。

## 验证

干净安装要使用各工具的锁定模式，锁文件与 `package.json` 不一致时直接失败：

| 包管理器 | 干净安装命令 | 对应锁文件 |
| --- | --- | --- |
| npm | `npm ci` | `package-lock.json` |
| Yarn 2+ | `yarn install --immutable` | `yarn.lock` |
| pnpm | `pnpm install --frozen-lockfile` | `pnpm-lock.yaml` |

安装后运行未声明依赖检查、重复版本分析、Peer Dependency 验证和各包 consumer 测试。更换包管理器是锁文件和物理布局迁移，需要在 CI 并行验证脚本、原生模块和 Docker 缓存，不能只比较下载速度。

pnpm 的性能与磁盘模型来自共享 Store、链接和严格布局，也受 I/O、缓存与生态兼容影响。“用了软链接”没有解释完整安装路径。

## Lockfile 是依赖图的快照

Manifest 表达范围，Lockfile 固定解析结果、integrity、peer context 和 workspace 关系。相同版本号在不同 peer 组合下可能对应不同依赖树；因此 lockfile 不是可随意合并的文本，而是安装器要重建和校验的图快照。CI 使用 frozen/immutable 模式时，manifest 与 lockfile 不一致应在安装阶段失败。

```text
workspace package -> dependency range -> registry/cache resolution
  -> peer context -> lockfile node + integrity
  -> node_modules layout -> package exports consumer
```

pnpm 的内容寻址 store 与链接布局减少重复文件并提高未声明依赖暴露度；Yarn/npm 的不同版本、hoisting 和 PnP/Node_Modules 模式会改变运行时查找。业务不能依赖“另一个包顺便安装了某依赖”，每个 import 都应由所属 package 声明并在独立 consumer 中验证。

Monorepo 任务缓存的 key 至少包含包源码、依赖 lockfile、构建配置、环境和上游产物哈希。发布时区分内部 workspace protocol 解析和用户安装后的 registry 版本，检查 `exports`、`types`、`files` 不把仓库路径带出去。

## 官方依据

- [Node.js 下载](https://nodejs.org/en/download)
- [Yarn 安装](https://yarnpkg.com/getting-started/install)
- [pnpm 安装](https://pnpm.io/installation)
- [npm package-lock.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json)
- [Yarn Workspaces](https://yarnpkg.com/features/workspaces)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Node package exports](https://nodejs.org/api/packages.html#exports)

## 迁移复核：npm、Yarn、pnpm、Lockfile 与 Monorepo
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
