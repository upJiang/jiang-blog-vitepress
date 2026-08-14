---
title: Skill 实战：从空目录写出可验证的任务能力
description: 从一个页面审计任务开始，创建 SKILL.md、参考资料、结构化采集器和模板，理解触发、渐进读取与失败验证。
category: ai-agent
part: 工具与能力扩展
chapter: 15
tags:
  - Skill
  - Codex
  - Claude Code
  - Progressive Disclosure
prerequisites:
  - 会读 Markdown 和 Python
  - 了解 Agent 会按任务读取说明
outcomes:
  - 能创建一个公开 Skill
  - 能验证 Skill 的触发条件和输出质量
practice:
  type: implementation
  result: 完成一个匿名页面审计 Skill 的目录与最小实现
  verify:
    - 触发条件与任务匹配
    - 脚本失败时能给出可定位错误
evidence: official-guided-operation
updated: 2026-08-07T00:00:00.000Z
lastUpdated: false
---
# Skill 实战：从空目录写出可验证的任务能力

## Skill 实战要解决什么问题

页面审计 Skill 是一套让 Agent 重复执行只读网页检查的方法。它接收用户明确授权的 URL 与允许主机，采集 HTTP 状态、最终 URL、原始 HTML 中的 title、canonical 和 robots，再把已确认事实与数据缺口分开。Skill 位于用户任务与采集脚本之间：负责触发、顺序和解释边界，不负责修改网站。

完整实现位于 `examples/page-audit-skill/`。采集器使用 Python 标准库 `HTMLParser`，输出 JSON；测试使用假响应，不访问公网。相比用 `awk` 按行查 HTML，这种实现能处理跨行标签、属性顺序和 HTML 实体，也能把网络失败与字段缺失分开。

## Skill 的输入、结果与职责边界

这个 Skill 只接受两项输入：

- 用户明确提供并允许检查的 `http` 或 `https` URL；
- 精确的允许主机名，例如 `example.com`。

成功结果是结构化事实：

```json
{
  "ok": true,
  "status": 200,
  "final_url": "https://example.com/",
  "title": "Example Domain",
  "canonical": null,
  "robots": null,
  "evidence": "raw_html"
}
```

`null` 只表示原始 HTML 没找到该字段。脚本不执行 JavaScript，因此不能据此断言渲染 DOM 也缺少；它也不连接搜索平台，不能判断页面是否被抓取、索引或获得排名。

以下动作从一开始就排除：登录、发送 Cookie、修改网站、访问 localhost 或私网、跟随到允许列表外的重定向、保存完整 HTML、输出排名结论。安全边界不能留到文章最后才补一句“注意 SSRF”。

## 目录按运行职责拆分

```text
page-audit-skill/
├── SKILL.md
├── references/
│   └── checks.md
├── scripts/
│   └── audit_page.py
├── templates/
│   └── report.md
└── tests/
    └── test_audit_page.py
```

`SKILL.md` 负责路由与执行顺序；`checks.md` 说明原始 HTML 证据口径；采集器只输出事实；模板约束报告字段；测试锁定解析和失败行为。没有图片或其他输入资产，因此无需为了目录整齐添加空 `assets/`。

## 入口描述要同时写触发和边界

伴随工程的 `SKILL.md` 从元数据开始：

```markdown
---
name: page-audit
description: 当用户明确授权检查一个 HTTP 页面，并要求核对状态、最终 URL、原始 HTML 的 title、canonical 或 robots 时使用；只读，不修改网站。
---
```

这条描述包含任务对象、检查字段和只读范围。“分析整站 SEO 策略”不属于这个小 Skill；“登录后台修改 canonical”也不属于。安装到不同 Agent 产品时，目录位置与发现机制要按当前产品文档配置，但描述的语义可以保持不变。

正文只保留所有路径共用的规则：

```markdown
# 页面审计

## 输入

- 用户明确提供并允许检查的 URL。
- 允许访问的精确主机名；缺失时先确认。

## 执行

1. 读取 `references/checks.md`，确认当前检查只需要原始 HTML。
2. 运行 `scripts/audit_page.py URL --allow-host HOST`。
3. 脚本退出 0 时，把 JSON 事实填入 `templates/report.md`。
4. 非零退出时保留错误类型，停止依赖页面正文的判断。

## 边界

- 不登录、不发送 Cookie、不修改页面或站点配置。
- 不访问私网或允许列表之外的主机。
- 不把原始 HTML 字段缺失扩大为渲染与索引结论。
```

入口不会重复 HTML 解析细节。Agent 进入字段解释时再读 reference，形成实际的渐进读取路径。

## URL 在发请求前先经过门槛

采集器先解析 URL：

```python
def validate_url(
    url: str,
    allowed_hosts: set[str],
    *,
    resolve_dns: bool = True,
) -> str:
    # 输入先限制协议和 userinfo，避免把本地文件或凭证送入请求层。
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"}:
        raise AuditError("only http and https URLs are allowed")
    if parsed.username or parsed.password:
        raise AuditError("URL userinfo is not allowed")

    # 主机必须精确命中本次授权的允许列表。
    hostname = (parsed.hostname or "").rstrip(".").casefold()
    if not hostname or hostname not in allowed_hosts:
        raise AuditError(f"host is outside the allowlist: {hostname}")

    if resolve_dns:
        # 解析结果中出现任意非公网地址，就在建立连接前拒绝。
        addresses = {
            item[4][0]
            for item in socket.getaddrinfo(
                hostname,
                parsed.port or (443 if parsed.scheme == "https" else 80),
            )
        }
        for value in addresses:
            if not ipaddress.ip_address(value).is_global:
                raise AuditError(
                    f"host resolves to a non-public address: {value}"
                )
    # 返回规范化主机，供调用方记录本次边界判断。
    return hostname
```

它拒绝非 HTTP 协议、URL userinfo、未批准主机和非公网解析结果。重定向 handler 对每一个目标重新调用相同校验，防止公开 URL 跳到私网或其他域名。

应用层校验仍不是绝对网络隔离。DNS 结果可能在校验和连接之间变化，代理也可能使用不同解析路径。处理不可信 URL 的高风险环境应把采集器放进无内网路由的网络沙箱，或只允许经过受控出口代理；不能因为代码检查了 `ipaddress` 就宣称 SSRF 已被彻底消除。

## HTML 用解析器读取，不用正则猜标签

`HeadFieldsParser` 继承标准库 `HTMLParser`，保存三个字段：

```python
class HeadFieldsParser(HTMLParser):
    def __init__(self) -> None:
        # 解析器只收集原始 head 字段，不执行脚本或构造浏览器 DOM。
        super().__init__(convert_charrefs=True)
        self.title: str | None = None
        self.canonical: str | None = None
        self.robots: str | None = None
        self._inside_title = False
        self._title_parts: list[str] = []

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
    ) -> None:
        # 属性名和标签统一大小写，属性顺序不会影响结果。
        values = {key.casefold(): value for key, value in attrs}
        lowered = tag.casefold()
        if lowered == "title" and self.title is None:
            self._inside_title = True
            self._title_parts = []
        elif lowered == "link" and self.canonical is None:
            rel = (values.get("rel") or "").casefold().split()
            href = values.get("href")
            if "canonical" in rel and href:
                self.canonical = href.strip()
        elif lowered == "meta" and self.robots is None:
            # 只保存第一条 robots，冲突值留给更高层诊断。
            if (values.get("name") or "").casefold() == "robots":
                content = values.get("content")
                if content:
                    self.robots = content.strip()
```

解析器不依赖标签刚好写在一行，也不依赖 `rel`、`href`、`name` 的属性顺序。它仍不是浏览器 DOM：损坏 HTML 的修复策略、脚本生成内容和 shadow DOM 都可能不同。结果字段因此明确标记 `evidence: "raw_html"`。

## 网络采集有超时、类型和大小边界

请求设置固定 User-Agent 与 10 秒超时，读取前确认最终 URL 仍在允许列表，正文只接受 `text/html`，最多读取 1 MiB：

```python
with client.open(request, timeout=10) as response:
    # 每次重定向后的最终 URL 仍要经过相同允许列表和地址校验。
    final_url = response.geturl()
    validate_url(final_url, normalized_hosts)

    # 非 HTML 响应交给其他解析器，不能硬套页面字段判断。
    content_type = response.headers.get_content_type()
    if content_type != "text/html":
        raise AuditError(f"expected text/html, got {content_type}")

    # 多读一个字节用于判断超限，正文不会无限写入内存。
    body = response.read(MAX_RESPONSE_BYTES + 1)
    if len(body) > MAX_RESPONSE_BYTES:
        raise AuditError(
            f"response exceeds {MAX_RESPONSE_BYTES} bytes"
        )

    charset = response.headers.get_content_charset() or "utf-8"
    # 解码后的字符串交给 HTMLParser，随后输出结构化事实。
    html = body.decode(charset, errors="replace")
```

失败输出写 stderr，并返回非零退出码：

```json
{
  "ok": false,
  "error": "expected text/html, got application/json"
}
```

Agent 看到失败后停止依赖 title、canonical 和 robots 的判断。它不能因为模板需要这些字段，就用空值补一份看似完整的报告。

真实环境还可按风险增加总下载预算、重定向次数、证书策略、代理限制和出站审计。不要关闭 TLS 校验来“解决”证书错误；那会把可见失败改成更大的信任缺口。

## reference 只保存判断口径

`references/checks.md` 没有重复代码，只回答脚本字段怎样解释：

```markdown
# 原始 HTML 检查口径

- status 和 final_url 来自实际 GET 与重定向结果。
- title 取第一个非空 title 的文本。
- canonical 取第一个 rel 包含 canonical 的 link href。
- robots 取第一个 name=robots 的 meta content。
- 字段为 null 只说明原始 HTML 没找到。
- HTTP 可访问不代表页面可索引；索引与排名需要搜索平台数据。
```

当任务只要求确认 HTTP 状态时，Agent 不需要加载所有字段解释；当报告要解释 canonical 缺失，才使用这份口径。脚本返回事实，reference 限制推论，两者不会互相替代。

## 模板分开事实、缺口与建议

报告模板保留三个区：

```markdown
# 页面审计报告

URL：
检查时间：

## 已确认事实

- HTTP 状态与最终 URL：
- 原始 HTML title：
- 原始 HTML canonical：
- 原始 HTML robots：

## 数据缺口

- 渲染 DOM、搜索平台或业务意图中尚未确认的内容：

## 建议

- 动作、依据与复查方法：
```

模板不是为了让报告长得一致，而是防止证据强度混在一起。状态码和原始字段来自脚本；“canonical 是否符合页面策略”需要业务意图；“是否已索引”需要搜索平台。建议必须说明依据与复查方法。

## 四个单元测试锁定采集器边界

测试不访问真实网络，而是给采集器注入假 opener：

```bash
# 测试使用假 opener，不访问公网，稳定覆盖解析和拒绝分支。
cd examples/page-audit-skill
python3 -m unittest discover -s tests -v
```

当前用例覆盖：

1. 跨行 title、属性顺序和大小写能够正确解析；
2. 成功结果包含最终 URL、绝对 canonical 和 `raw_html` 证据标记；
3. 非 HTML 与超过 1 MiB 的响应明确失败；
4. `file:`、URL userinfo 和允许列表外主机在请求前被拒绝。

还应在集成环境补充 DNS 解析到私网、跨主机重定向、超时、TLS 错误和真实 404。单元测试用假响应保证稳定，集成测试才验证网络栈；两者不能互相冒充。

## 用失败矩阵验证整个 Skill

| 输入或事件 | 脚本结果 | Agent 结果 |
| --- | --- | --- |
| 合法 URL + HTML | JSON 事实，退出 0 | 填事实、缺口和建议 |
| 缺少允许主机 | 不运行脚本 | 先确认范围 |
| URL 指向私网 | `AuditError`，退出 2 | 报告安全拒绝 |
| 重定向到其他主机 | 重定向前拒绝 | 不抓取目标正文 |
| HTTP 404 | 明确 HTTP 错误 | 记录状态，不继续推断字段 |
| 非 HTML | 明确 Content-Type 错误 | 转交适合该媒体类型的能力 |
| 响应过大或超时 | 非零退出 | 记录数据缺口，不伪造成功 |
| 用户要求修改页面 | Skill 边界阻止 | 转交获授权的写操作流程 |

触发测试同样需要正例、近似反例和写操作反例。最终证据是资源读取与行为顺序正确，不是回答里出现“我使用了 page-audit Skill”。

## Skill 与 MCP 怎样组合

当前脚本适合单机、小批量只读检查。如果多个 Host 都要使用统一采集服务，可以把 `audit_page` 包装成 MCP Tool；网络沙箱、允许列表和响应大小仍留在 Server。Skill 继续负责“何时采集、怎样解释、如何报告”，MCP 只负责连接与调用。

不要为了一个顺序脚本创建 SubAgent。只有当多个页面批次或不同数据源可以独立执行，每个分支都有范围、预算和回传 Schema 时，才考虑并行；总页数、并发、超时和失败汇总仍由主任务控制。


**为什么不用 Shell、`curl` 和 `awk`？**

`curl` 适合采集，但按行 `awk` 不是 HTML 解析器，标签换行或属性顺序变化就容易漏字段。结构化解析器还能把请求约束、字段提取和 JSON 输出放在可测试函数中。Shell 可以作为启动入口，不应承担脆弱的 HTML 语法分析。

**允许列表和公网 IP 检查能彻底防止 SSRF 吗？**

不能。它们能拒绝明显危险输入，但仍有 DNS rebinding、代理解析差异和网络竞态。高风险执行环境要从网络层禁止访问内网与元数据服务，并控制出站代理。应用检查是其中一层。

**原始 HTML 没有 canonical，报告应该写什么？**

写“原始 HTML 未找到 canonical”，并保留 `evidence=raw_html`。如果页面使用客户端脚本注入，再用浏览器检查渲染 DOM；随后结合页面类型、预期规范 URL 和站点策略判断是否需要修复。缺一处标签不能直接推出“页面不会收录”，索引状态还需要搜索平台证据。

**404 时为什么不继续解析错误页 title？**

脚本把 404 作为失败，让 Agent 先判断这个状态是否符合页面意图。错误页的 title 可能存在，但它不能作为目标页面字段成功的证据。需要审计错误页本身时，应把它作为另一个明确目标。

**为什么测试不直接请求 `example.com`？**

单元测试要验证确定性逻辑，公网状态、DNS 和证书随时可能变化。假 opener 能稳定覆盖解析和门槛；另设获授权的集成测试验证真实网络，并把外部失败作为环境证据记录。

**Codex 和 Claude Code 会完全一样地加载这份 Skill 吗？**

不能假设。名称、描述、相对资源和可执行脚本容易复用，但发现目录、权限、工具调用和优先级由产品决定。分别安装后运行一条应触发请求、一条依赖失败和一条越界写请求，并核对实际读取文件、执行命令与退出状态；只有两边行为都满足同一契约，才能说明这份 Skill 可移植。
