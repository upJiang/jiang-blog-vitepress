---
title: 模块解析、声明文件与 Project References
description: 从一次“类型存在但运行时找不到模块”进入 Node/Bundler 解析、package exports/types、.d.ts、路径别名和增量工程图。
category: frontend
part: TypeScript
chapter: 29
tags:
  - TypeScript
  - Module Resolution
  - Project References
prerequisites:
  - ES Module 与包基础
outcomes:
  - 区分类型解析和运行时解析
  - 设计可构建的多包类型边界
practice:
  type: implementation
  result: 搭建并验证两包 Project References
  verify:
    - tsc --build 可增量执行
    - 发布包的 exports 与 types 对齐
evidence: official-guided-operation
updated: 2026-08-11
---

# 模块解析、声明文件与 Project References

模块解析把导入说明符对应到源码或声明文件，声明文件为 JavaScript 包补充静态契约，Project References 则把多个 TypeScript 项目组织成可增量构建的依赖图。三者连接编辑器、TypeScript 编译器和实际运行环境，目标是让类型检查、构建输出与包边界采用一致路径；`paths` 本身不会替浏览器改写 URL。

编辑器能跳转到 `@app/shared`，浏览器却报找不到模块。TypeScript 的 `paths` 帮助类型解析，不一定改写输出导入；真正运行模块的 Node、Bundler 或浏览器还要理解同一 specifier。

## 三条解析链

源码导入先由 TypeScript 按 moduleResolution 找类型和源声明；构建工具按自身 resolver 找实际模块并打包；运行时再按输出格式、exports 和 URL 载入。三者配置不一致就会出现“类型通过、构建失败”或“构建通过、运行失败”。

Bundler 模式适合由现代构建器解释扩展名和 exports 的应用，NodeNext 更接近 Node ESM/CJS 规则。module 与 moduleResolution 要成对选择，不能复制一份 tsconfig 到所有发布目标。

## package exports 与 types

包的 exports 定义允许消费者导入的公开子路径，也可按 import/require 等条件提供不同文件。声明文件必须与每个公开入口对齐。只设置顶层 types 却开放多个子路径，会让运行时可用、类型不可用。

`.d.ts` 描述已存在 JavaScript 的形状，不包含实现。模块声明用于真正缺少类型的依赖，不能用 `declare module '*'` 永久关闭检查。全局声明应限制在明确环境，避免污染所有消费方。

## Project References 建立工程图

被引用包启用 composite，输出声明和增量信息；上层 tsconfig 通过 references 声明依赖。`tsc --build` 按图顺序构建，只重建输入或配置变化的项目。

```jsonc
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/web" }
  ]
}
```

根配置的输入是两个项目路径，tsc --build 先读取引用图和各包 tsconfig，再按依赖顺序输出声明与增量信息；任一包配置或公开声明失败会阻止上层得到有效结果。注释只用于教学，保存为严格 JSON 前需要移除，否则非 jsonc 读取器会报错。

严格 JSON 使用时要移除注释。根配置只描述图，各包自行定义 rootDir、outDir 和环境 lib。web 包通过公开包入口使用 shared，不应跨目录引用其 src 私有文件，否则构建图和发布边界失真。

## 声明质量与版本

库构建打开 declaration/declarationMap，使用独立 consumer fixture 安装产物，分别测试 ESM 导入、公开子路径和类型推断。API Extractor 或类型快照可审查破坏性声明变化，但不能替代运行时测试。

遇到重复类型或不可赋值的同名类，检查是否安装了多份依赖、类是否含 private 字段形成名义差异，以及 peerDependencies 是否合理。skipLibCheck 能缩短检查但会隐藏声明冲突，不应作为首个修复。

模块问题要分别画出编辑器、Bundler 与 Node 的解析链。`paths` 不是运行时别名，Project References 也不只是 Monorepo 配置，它还定义构建边界和增量依赖。

## 一次导入到底经过哪几张表

对 `import { parse } from '@scope/shared/parser'`，TypeScript 先依据 `moduleResolution`、package `exports` 的条件和 `types`/声明入口寻找类型；Bundler 再按自己的条件集合解析真实源码或产物；Node/Bun 在运行服务端文件时又按运行时规则选择入口。三者条件顺序不一致，就会出现“编辑器可跳转、构建成功、运行时报找不到模块”中的任意组合。

排查时开启 `tsc --traceResolution`，记录它最终选择的文件和失败候选；查看 Bundler resolve debug 或 metafile；最后用目标 Runtime 从发布包执行最小 import。不要用删除 lockfile 代替定位，因为多份包、错误 exports 和大小写差异需要不同修复。

## 声明文件的所有权

`.d.ts` 是运行时代码的静态契约。模块声明必须与真实模块名和导出形状一致；全局增强要放在明确模块上下文中，避免污染所有 consumer。给无类型第三方包补声明时先只描述实际使用表面，再通过类型测试和运行测试扩展，不能为了“无报错”写成 `declare module '*'`。

发布前把 tarball 安装进空白 consumer，分别在 bundler、NodeNext 和类型只构建场景中导入公开根路径与子路径。检查声明是否泄漏仓库内部相对路径、私有依赖类型或无法命名的推断结果。References 只保证项目图构建，发布包契约仍由 exports、files 和生成声明共同决定。

## 官方依据

- [Modules: Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [Module Resolution](https://www.typescriptlang.org/docs/handbook/modules/theory.html#module-resolution)
- [Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
- [Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

## 迁移复核：模块解析、声明文件与 Project References
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
