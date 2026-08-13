---
title: Robots、Sitemap、Canonical 与索引治理
description: 区分抓取控制、索引控制和规范网址，建立非代码层面的页面治理策略。
category: seo
part: 第四部分：索引、渲染与性能
chapter: 10
tags:
  - Robots
  - Sitemap
  - Canonical
prerequisites:
  - 读过第 4、6 章
outcomes:
  - 决定哪些 URL 应被抓取和索引
  - 消除 Sitemap 与页面信号冲突
practice:
  type: implementation
  result: 完成全站索引治理矩阵
  verify:
    - 每类 URL 有明确目标
    - 抽查结果与矩阵一致
evidence: official-guided-operation
updated: 2026-08-11
---

# robots.txt 已经禁止了页面，为什么搜索结果里还有 URL

一家 SaaS 不想让站内搜索页进入结果，于是在 `robots.txt` 禁止 `/search/`。几周后，搜索结果里仍出现部分搜索 URL，只是没有摘要。团队又把这些 URL 放进 Sitemap，希望搜索引擎“重新处理”。

三个信号此时互相冲突：robots.txt 不让爬虫读取页面，页面里的 noindex 因此可能看不到，Sitemap 却主动声明这些 URL 值得发现。问题不是少写一条规则，而是团队没有先决定每类页面的目标。

上一篇的[媒体资源表](/docs/seo/media-video-structured-data)与第 6 章页面树共同构成本篇输入。本篇由创业者、SEO 和内容负责人先做页面治理决策，开发只负责把决策稳定输出。最终产物不是一份孤立 robots.txt，而是一张 URL 类型、抓取、索引、Canonical、内链和 Sitemap 一致的矩阵。

## 四个概念分别解决什么问题

| 概念 | 全称或含义 | 主要问题 | 不是用来做什么 |
| --- | --- | --- | --- |
| robots.txt | Robots Exclusion Protocol 的站点规则文件 | 爬虫是否允许请求某类 URL 或资源 | 保护隐私、可靠删除索引 |
| noindex | 页面级或响应头索引指令 | 页面是否应出现在索引中 | 节省全部抓取请求 |
| Canonical | `rel="canonical"` 首选网址提示 | 一组相似 URL 希望以哪个为主版本 | 强制重定向、修复低质量内容 |
| XML Sitemap | XML 站点地图 | 主动提供希望发现的规范 URL 清单 | 保证抓取、收录或排名 |

四者的共同上游是页面治理决策。若业务负责人自己都不知道筛选页是否需要搜索流量，工具无法从标签推断正确答案。先确定 **Expected Index State（预期索引状态）**：应索引、不应索引或尚待确认，再检查信号是否一致。

## robots.txt 管抓取，不是保密文件

`robots.txt` 位于网站根目录，例如 `https://example.com/robots.txt`。爬虫读取与自身 User-Agent 匹配的分组，再根据 Allow/Disallow 判断路径。它是公开文件，任何人都能查看其中列出的目录。

下面是教学模板。输入是已经确认的公开与非公开目录，输出应是根目录下可访问的纯文本；发布后还要分别测试通用、Google、Bing 和百度规则：

```text
User-agent: *
Allow: /
Disallow: /account/
Disallow: /internal-search/

Sitemap: https://example.com/sitemap.xml
```

这份规则只表达“不希望遵守协议的爬虫抓取这些路径”。它不提供身份认证，不能保护账户和敏感数据；真正的私密内容必须依靠登录、授权和服务器访问控制。

### 404 robots.txt 不一定是故障

若 `robots.txt` 返回 404，通常表示网站没有额外声明抓取限制，并不等于全站禁止抓取。需要记录为“没有规则”而不是 P0。返回 5xx、HTML 错误页、语法冲突或生产环境遗留 `Disallow: /` 才需要结合影响判断。

### 资源目录不要机械禁止

禁止 `/assets/`、`/static/`、`/js/`、`/css/` 可能让搜索系统无法获得渲染所需资源。应把当前页面真实引用的 CSS、JavaScript 和主要图片代入规则，分别检查常见爬虫分组。敏感接口不能靠 robots 隐藏。

### 非标准指令要核对平台

某些指令只被特定平台支持，其他爬虫会忽略。解析器发现未知指令时，应标为风险候选，核对目标搜索平台官方文档；不能把“文件能下载”当作每行都生效。

## noindex 必须让搜索系统读得到

`noindex` 可以出现在最终 HTML 的 meta robots，也可以放在 HTTP `X-Robots-Tag` 响应头。两处若一边 `index`、一边 `noindex`，就形成冲突，应从模板或代理层找到根因。

对于不应进入搜索结果但允许公开访问的页面，可以在可抓取响应里输出：

```html
<meta name="robots" content="noindex,follow">
```

搜索系统需要先抓取页面，才能读取指令。若同时用 robots.txt Disallow 阻断，它可能只知道 URL 存在，却无法看到 noindex。因此“从索引移除”与“减少后续抓取”要分阶段处理，并在目标平台观察结果。

`follow` 也不是永久保证页面内链接都会被持续利用。核心页面的发现入口应来自正常导航、栏目和正文，不依赖大量长期 noindex 页面。

## Canonical 是提示，不是删除按钮

**Canonical URL（规范网址）**是同一或高度相似内容希望保留的首选版本。典型输入包括追踪参数、打印版、排序参数和协议/主机重复；输出是在每个候选页中指向可访问、允许索引的绝对 URL。

```html
<link rel="canonical" href="https://example.com/guides/seo-audit">
```

页面模板输出这条绝对 URL 后，还要请求目标并核对最终状态；规范页面通常自指，站内链接与 Sitemap 也使用同一地址。Canonical 目标如果返回 404、继续跳转或带 noindex，搜索系统难以稳定采用。将所有重复页指向首页也不是治理，内容与目标差异太大时可能被忽略。

需要永久迁移用户和信号时用 301/308；内容确实重复但 URL 仍需存在时才考虑 Canonical；不应索引但对用户有用的独立页面用 noindex。先判断页面关系，再选信号。

### 分页不要默认都指向第一页

第 2 页及更深页若承载可发现的独立条目，通常需要稳定 URL、普通上一页/下一页链接和自指 Canonical。把所有分页 Canonical 到第一页，可能让后续商品或文章缺少发现路径。

若分页只是重复视图或筛选组合，则按页面任务另行治理。没有一种分页策略适合全部网站。

## Sitemap 是希望发现的规范 URL 清单

**XML Sitemap（XML 站点地图）**把希望搜索系统发现的 URL 组织成机器可读清单。合格条目通常满足：同一正式主机、最终返回 200、允许索引、Canonical 自洽、有独立价值。

不应放入：重定向、404/410、noindex、站内搜索、追踪参数、无限筛选组合和非规范 URL。把所有数据库记录导入 Sitemap 会制造信号冲突，不会提高内容质量。

`lastmod` 应反映页面发生实质内容变化的日期，使用可解析的 ISO 日期；没有可靠来源时宁可省略，不要每次部署都把全站改成今天。页面很多时使用 Sitemap index 拆分，并可采用受支持的压缩文件，但要验证子文件、XML 转义、URL 和日期。

Sitemap 的处理链是：业务页面库筛选合格 URL，生成器输出 XML，服务器返回正确内容，搜索平台读取并报告。任一阶段都可能失败，因此“提交成功”只证明平台接收了文件，不代表每个条目已抓取或索引。

## 参数页、站内搜索和 URL 膨胀

电商筛选、标签、排序、日历和站内搜索可以从少量内容生成大量 URL。先按用户任务分类：

| URL 类型 | 抓取 | 索引 | Canonical | 内链 / Sitemap |
| --- | --- | --- | --- | --- |
| 稳定产品、服务、文章 | 允许 | 应索引 | 自指 | 正常进入 |
| 有独立需求的策划筛选页 | 允许 | 审核后索引 | 自指 | 有限进入 |
| 排序、追踪、会话参数 | 控制发现 | 通常不索引 | 指向主版本或按架构处理 | 不进入 |
| 站内搜索结果 | 可读取 noindex | 通常不索引 | 按真实任务处理 | 不进入 Sitemap |
| 账户、预览、测试页面 | 访问控制优先 | 不索引 | 不依赖 Canonical 保密 | 不进入 |

只在 robots.txt 禁止参数不一定能清理已发现 URL；只加 Canonical 也不会阻止爬虫继续遍历无限组合。应同时控制链接生成、参数规范、索引指令和 Sitemap，服务器日志再验证新增参数请求是否下降。

## 如何检查信号冲突

至少抽样这些页面：正常内容页、参数页、分页第 2 页、站内搜索页、删除页、多语言页和 Sitemap 中的随机页。对每个 URL 记录：

1. 匿名 GET 最终状态与 URL；
2. robots.txt 对通用和目标爬虫是否允许；
3. meta robots 与 X-Robots-Tag；
4. Canonical 及目标的最终状态；
5. 是否出现在内链和 Sitemap；
6. 页面实际任务与预期索引状态。

以下冲突需要优先处理：Sitemap URL 同时 noindex；Canonical 指向 404/跳转/noindex；非规范 URL 被大量内链；不应索引页出现在导航；应索引页面被资源规则阻断；多语言页面的 Canonical 与 hreflang 关系互相否定。

## 索引治理矩阵

矩阵按 URL 模板而不是逐页填写：

```text
URL 类型｜用户任务｜负责人｜预期索引状态｜robots 抓取规则｜
meta/X-Robots-Tag｜Canonical 目标｜内链入口｜Sitemap｜
删除/迁移策略｜抽样 URL｜验证证据｜观察周期
```

SEO 负责人定义公开搜索目标，产品/创业者确认用户任务与风险，内容负责人保证页面价值，开发负责人输出规则和生成 Sitemap，运维保证响应稳定，数据负责人观察索引与日志。技术实现不能替代前面的业务决策。

验收时随机抽每类至少一个正常、边界和失败样本，最终信号必须与矩阵一致。下一篇会继续检查服务器和 JavaScript 实际向匿名请求交付了什么。

## 继续学习

- 上一篇：[图片、视频与媒体 SEO](/docs/seo/media-video-structured-data)
- 下一篇：[HTTP、JavaScript 渲染与搜索可访问性](/docs/seo/http-javascript-rendering-seo)
- 全站复核：[全站抓取、重复页面与索引异常排查](/docs/seo/crawl-index-duplicate-troubleshooting)
