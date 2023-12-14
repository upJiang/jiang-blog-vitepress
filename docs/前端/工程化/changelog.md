[GitHub Actions](https://github.com/features/actions)  是 GitHub
的[持续集成服务](https://www.ruanyifeng.com/blog/2015/09/continuous-integration.html)，
[Github Action 入门教程](https://www.ruanyifeng.com/blog/2019/09/getting-started-with-github-actions.html)

[semantic-release](https://github.com/semantic-release/semantic-release) 支持很
多持续集成工具，为我们提供生成 changelog.md、更新版本号、添加 tags 等功能。

semantic-release 的大致工作流程如下：

- 提交到特定的分支触发 release 流程
- 验证 commit 信息，生成 release note，打 git tag
- 其他后续流程，如生成 CHANGELOG.md，npm publish 等等（通过插件完成）

这里将使用 GithubAction 与 semantic-release 为我们的 github 项目搭建自动集成
changelong ，打 tags，更新版本号，GithubAcion 还能做更多的事情（比如发布 npm 包
、build 等等），可自行查阅学习。

## 1. 为 github 项目添加 Actions secrets

### 创建 Personal access tokens

点击 github 头像 => settings => 左边 Developer settings => Personal access
tokens

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4bc57e8a2d0743e7bec8f43dd6ce5d08~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4bc57e8a2d0743e7bec8f43dd6ce5d08~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3a87f3c4bfcf456da24859bc35082906~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3a87f3c4bfcf456da24859bc35082906~tplv-k3u1fbpfcp-watermark.image?)</a>

Expiration 我选择 no expiration 没有期限，Select scopes 自己看需要，我全勾了。提
交后把 key 复制下来

### 给项目添加 Actions secrets

在项目中的 settings => Secrets 创建一个 secret，把刚刚复制的 key 写入 Value 中，
并记住你填写的 Name，后面的脚本需要用到，比如我的是 GH_TOKEN。如果在 Action 中需
要发布 npm 包，需要配置 NPM_TOKEN，这个自行查找方法。

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/612b49886cc14c01901de3d05d86fec0~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/612b49886cc14c01901de3d05d86fec0~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3bf146c2f51548c789a50f27c26f741c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3bf146c2f51548c789a50f27c26f741c~tplv-k3u1fbpfcp-watermark.image?)</a>

[可参考这篇文章](https://blog.csdn.net/weixin_45178716/article/details/106416925)

## 2. 添加依赖

```
yarn add semantic-release

//这两个是为了集成 changelog，打 tags，自动更新版本号
yarn add @semantic-release/changelog @semantic-release/git -D
```

## 3. 在项目中添加 .github/workflows/release.yml

```
name: Release
on:
  push:
    branches:
      - master
jobs:
  release:
    name: Release
    runs-on: ubuntu-18.04
    steps:
      - name: Checkout
        uses: actions/checkout@v2
        with:
          fetch-depth: 0
      - name: Setup Node
        uses: actions/setup-node@v1
        with:
          node-version: 16
      - name: Install
        run: yarn
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
        run: npx semantic-release
```

上面所做的就是：用户在 master 分支上 push 时触发，运行的环境是 ubuntu-18.04，设
置 node 版本是 16，然后下载依赖，最后执行 npx semantic-release。参数不懂可查阅文
章开头链接。

## 4. 在项目中添加配置文件 .releaserc

```
{
    "branch": "master",
    "plugins": [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        "@semantic-release/changelog",
        [
            "@semantic-release/npm",
            {
                "npmPublish": false
            }
        ],
        [
            "@semantic-release/git",
            {
                "assets": [
                    "package.json",
                    "CHANGELOG.md"
                ],
                "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
            }
        ],
        "@semantic-release/github"
    ]
}
```

**如果没有设置 NPM_TOKEN，必须设置 "npmPublish": false**

这些需要搭配 husky 以及 commitlint 限制用户的 commit 信息，可参
考[我的文章](https://juejin.cn/post/7051512232374435847)，自行去配置。

最后 push 一下代码，在 github 中的 Actions 可以看到这个 workflows 的过程，最后再
查看一下 master 分支中也成功添加了 CHANGELOG.md，并自动为我们打了一个 tags，并且
每次都会更新版本

**版本更新的默认规则**

```
# 修复 bug，更新小版本 1.0.x
fix: <message>

# 添加新功能，更新次版本号 1.x.0
feat: <message>

# 如果 feat 中包含 BREAKING CHANGE 则会更新主版本 x.0.0
```

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dd2f51ad453e4d0c8d1874e569b684a3~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dd2f51ad453e4d0c8d1874e569b684a3~tplv-k3u1fbpfcp-watermark.image?)</a>

在其它代码托管平台，比如 gitlab，大致思路都是相同的，比如 gitlab 是直接在项目根
目录的 .gitlab-ci.yml 去配置，语法不同（gitlab 的是`stages`，github 的是
`jobs`），都大同小异。.releaserc 这个文件的配置基本上都相同，只是引用的插件不同
。

最后我们在项目中的 readme.md，加上

```
[<a data-fancybox title="semantic-release" href="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg">![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)</a>](https://github.com/semantic-release/semantic-release)
```

会有这样的效果

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7f5d31052f43487fb0e61e9c9c26d50e~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7f5d31052f43487fb0e61e9c9c26d50e~tplv-k3u1fbpfcp-watermark.image?)</a>

[项目地址](https://github.com/upJiang/jiangVue3Test)
