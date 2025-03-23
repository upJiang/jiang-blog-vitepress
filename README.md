---
page: true
date: 
title: 项目概述
describe: 项目概述
---

## 基于「VitePress」搭建的个人博客
## 安装

```bash
git clone https://github.com/Moking1997/vitepress-blog.git
cd vitepress-blog
yarn
# 在本地启动服务器
yarn dev
# 构建静态文件 > .vitepress/dist
yarn build
```

博客地址: https://junfeng530.xyz

# 列表项自动空行 - 简单方法

要实现 Markdown 列表项自动空行，只需完成以下简单步骤：

## 1. 安装扩展

在 VS Code/Cursor 中安装 "Markdown All in One" 扩展：
- 扩展 ID: `yzhang.markdown-all-in-one`
- 在扩展面板中搜索 "Markdown All in One" 并安装

## 2. 使用自动格式化

安装完成后，每次保存 Markdown 文件时：
1. 按快捷键 `Shift+Alt+F`（Windows/Linux）或 `Shift+Option+F`（Mac）格式化文档
2. 或右击文档，选择"格式化文档"
3. 列表项之间将自动添加空行

## 3. 如何测试

创建一个简单的列表：
```
- 项目1
- 项目2
- 项目3
```

格式化后会变成：
```
- 项目1

- 项目2

- 项目3
```

## 4. 自动保存时格式化

如果您想在保存时自动格式化，已经在 `.vscode/settings.json` 中配置好了：
- `"editor.formatOnSave": true`
- `"[markdown]": { "editor.defaultFormatter": "yzhang.markdown-all-in-one" }`
- `"markdown.extension.list.spacing": "two"`

只需安装扩展，其他都已设置完成！
