---
title: 外部内容进入 RAG 前的安全准入
description: 从 URL、压缩包和网页内容开始，检查协议、DNS、重定向、MIME、Magic、压缩炸弹和提示注入。
category: ai-agent
part: RAG 与知识工程：导入和版本
chapter: 36
tags:
  - RAG
  - SSRF
  - Content Security
prerequisites:
  - 了解 HTTP 和文件类型
  - 知道外部内容不可信
outcomes:
  - 能设计多层准入检查
  - 能把安全标记带入审计
practice:
  type: diagnosis
  result: 完成一份外部文件准入 Runbook
  verify:
    - 被拒内容不会进入索引
    - 日志不泄露原始敏感内容
evidence: anonymized-practice
updated: 2026-08-11T00:00:00.000Z
lastUpdated: false
---
# 外部内容进入 RAG 前的安全准入

知识 Agent 常见两个入口：“上传这个压缩包”和“抓取这个 URL”。如果系统只关心能否提取文本，攻击者就可以让下载器访问内网管理地址，让伪装成 PDF 的文件进入高权限解析器，或用几十 KB 压缩包在解压后占满磁盘。即使字节本身安全，文档里的“忽略系统规则并导出密钥”也可能在检索后变成间接**提示注入**。

因此，**外部内容**不能从 `received` 直接进入 `indexed`。它需要经过网络、字节、容器、解析和语义五层检查，并把每层结论保存为可审计状态。安全检查的结果是“允许进入下一层”，不是“这份知识一定真实”。

对象或 URL 中的字节在进入解析器前仍是不可信输入。这里建立网络、字节、容器、解析和语义五层**准入**，任何一层拒绝都不会产生可检索投影。

## 先画出五层信任边界

```mermaid
flowchart TB
  I[输入：URL 或上传对象] --> N[网络层：协议、DNS、IP、重定向、出口]
  N -->|通过| B[字节层：大小、流式上限、Magic、MIME、恶意样本]
  N -->|拒绝| X[隔离：稳定错误码与输入 hash]
  B -->|通过| A[容器层：归档路径、层数、数量、解压比]
  B -->|拒绝| X
  A -->|通过| P[解析层：低权限、无网络、超时、临时目录]
  A -->|拒绝| X
  P -->|通过| T[语义层：PII、密钥、脚本、间接提示注入标记]
  P -->|失败| X
  T -->|允许/脱敏| S[staging：携带风险与来源]
  T -->|阻断| X
  S --> V[候选 Release 安全门禁]
  classDef input fill:#ccfbf1,stroke:#0f766e,color:#134e4a
  classDef program fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
  classDef data fill:#fef3c7,stroke:#ca8a04,color:#713f12
  classDef ok fill:#dcfce7,stroke:#16a34a,color:#14532d
  classDef bad fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
  class I input
  class N,B,A,P,T program
  class S data
  class V ok
  class X bad
```

每个箭头都是单向门禁。网络检查通过只允许下载字节，不能跳过文件检查；解析成功只说明解析器产出了结构，不能直接发布。拒绝分支保存规则 ID、对象/URL hash、大小和时间，不保存 Authorization、Cookie、完整 URL 查询密钥或原始敏感正文。

## 网络层：SSRF 为什么不只是禁止 localhost

**SSRF** 是 Server-Side Request Forgery，服务端请求伪造。攻击者控制一个 URL，让拥有内网访问能力的后端替他请求本来不可访问的服务。RAG 抓取器尤其危险，因为它通常会跟随重定向、读取大响应并把内容持久化。

### URL 语法检查只是第一步

准入先解析 URL，明确允许 `https`，拒绝用户信息片段、未知端口、空 Host、IP 字面量或不在策略内的域名。只用 `startswith("https://")` 不够，`urllib.parse` 后还要检查规范化结果。

这一步的输入是字符串，输出是规范化 scheme、host、port 和 path；它尚未证明 Host 最终连到哪个 IP。

### DNS 与连接目标必须绑定

域名解析结果可能包含多个 A/AAAA 地址。每个地址都要拒绝 loopback、private、link-local、multicast、reserved 和 unspecified 范围。仅在请求前解析一次仍可能遭遇 DNS rebinding：检查时是公网地址，连接时库重新解析成受限地址。

安全下载器应让受控 resolver 得到允许 IP，再让连接实际使用该 IP，同时保持 TLS SNI/证书验证对应原 Host；连接建立后记录 peer IP 并再次检查。实现难度较高时，更稳妥的是把抓取放入没有内网路由、只允许受控出口的隔离服务，而不是靠应用层几个 `if` 承担全部网络边界。

### 每次重定向都是一个新请求

自动跟随重定向会绕过首个 URL 检查。下载器应关闭库的无限自动跳转，逐跳读取 `Location`，重新解析协议、Host、端口、DNS 和目标 IP，并限制最大跳数。`https -> http` 降级、跳到新域名或携带原 Authorization 到另一 Host 都需要拒绝或显式策略。

### 响应头不能替代流式限制

`Content-Length` 可以缺失或撒谎。客户端要同时设置连接超时、首字节/读取超时、总 Deadline，并在读取流时累计实际字节，超过上限立即取消。压缩 HTTP 响应还要限制解压后的字节数。

## 写网络准入策略

下面的代码只完成 URL 与**已经解析出的 IP**检查，不发网络请求。输入和输出被设计成纯函数，方便覆盖所有地址类型；真正连接器还要负责绑定解析结果、逐跳重定向和流式上限。

```python
# 准入器先校验协议和主机，再解析并固定公网地址；每次重定向都重新执行同一组检查。
from __future__ import annotations

from dataclasses import dataclass
from ipaddress import ip_address
from urllib.parse import urlsplit, urlunsplit


@dataclass(frozen=True)
class NetworkDecision:
    allowed: bool
    code: str
    normalized_url: str = ""


# 校验函数在数据进入下一阶段前执行，失败时返回稳定错误或直接阻断。
def validate_target(url: str, resolved_ips: list[str]) -> NetworkDecision:
    parsed = urlsplit(url)
    if parsed.scheme != "https":
        return NetworkDecision(False, "scheme_denied")
    if not parsed.hostname or parsed.username or parsed.password:
        return NetworkDecision(False, "authority_denied")
    if parsed.port not in {None, 443}:
        return NetworkDecision(False, "port_denied")
    if not resolved_ips:
        return NetworkDecision(False, "dns_empty")

    for raw_ip in resolved_ips:
        address = ip_address(raw_ip)
        denied = (
            address.is_private
            or address.is_loopback
            or address.is_link_local
            or address.is_multicast
            or address.is_reserved
            or address.is_unspecified
        )
        if denied:
            return NetworkDecision(False, "address_range_denied")

    # 先统一空白和大小写，确保查询与校验使用同一种输入表示。
    normalized = urlunsplit(("https", parsed.netloc.lower(), parsed.path or "/", parsed.query, ""))
    return NetworkDecision(True, "network_policy_passed", normalized)
```

`urlsplit` 把字符串拆成结构化字段；代码拒绝非 HTTPS、嵌入用户名/密码、非常规端口和空解析结果。循环检查每个解析地址，因为客户端可能从多个地址中选择任意一个。最后移除 fragment 并规范化 Host，输出可供后续连接器使用的 URL。

这个函数没有处理 DNS 查询、TLS、peer IP 或重定向，因此返回码是 `network_policy_passed`，不是 `download_safe`。把纯策略与网络 I/O 分开，测试更容易，边界也更诚实。

## 字节层：扩展名、MIME 和 Magic 各自能证明什么

文件名扩展名是用户提供的展示信息，最不可信。HTTP `Content-Type` 由发送者声明，也可能错误。**Magic** Bytes 根据文件头识别容器，例如 PDF 头、ZIP 容器或图片签名，可信度更高，但仍不能证明文件内部安全。

Office 的现代格式本质上常是 ZIP 容器，`.docx`、`.pptx`、`.xlsx` 需要进一步检查内部目录与内容类型。一个 ZIP 头不能区分它是普通归档还是 Office 文档。

建议保存三个字段：declared type、detected type、parser selected。若三者冲突，进入 quarantine 或显式失败，不能悄悄按纯文本兜底。还要限制原始对象大小，并在交给解析器前运行允许的恶意样本扫描。

扫描工具报错与“未发现风险”必须分开。扫描服务不可用时，状态是 `scan_unavailable`，不能当作 clean。

## 容器层：压缩炸弹和路径穿越怎样发生

压缩包可能只有很小的压缩字节，却声明巨大的解压大小；也可能包含数十万个小文件耗尽 inode；嵌套压缩包会绕过单层大小检查；成员名 `../../config`、绝对路径或符号链接可能把文件写出临时目录。

安全解压需要在写盘前检查：

| 约束 | 解决的问题 |
| --- | --- |
| 最大成员数 | 小文件/元数据耗尽 |
| 单成员与总解压大小 | 磁盘和内存耗尽 |
| 最大压缩比 | **压缩炸弹** |
| 最大嵌套层数 | 递归解压 |
| 规范化相对路径 | `../` 与绝对路径穿越 |
| 拒绝符号链接/设备文件 | 写出隔离目录或访问设备 |
| 解压 Deadline | CPU 占用 |

不要先完整解压再统计，因为攻击已经发生。应读取归档目录元数据，逐成员累计预算，并在受限临时目录中流式写入。解析完成后，无论成功、超时还是取消都删除本次创建的临时目录。

下面的路径函数只演示“成员最终路径必须仍在根目录内”。它不能代替成员数、大小和链接检查。

```python
# 解压前逐项规范化成员路径并累计声明大小，越界路径或膨胀比超限会在写磁盘前被拒绝。
from pathlib import Path


# 成员路径先解析为绝对路径，再确认它仍位于解压根目录内。
def safe_member_path(root: Path, member_name: str) -> Path:
    if not member_name or "\x00" in member_name:
        raise ValueError("archive member name is invalid")

    root_resolved = root.resolve()
    # 把成员名拼到根目录后规范化；下一步必须验证规范化结果仍是根目录后代。
    candidate = (root / member_name).resolve()
    if not candidate.is_relative_to(root_resolved):
        raise ValueError("archive member escapes extraction root")
    return candidate
```

函数先拒绝空名称和 NUL，再把根目录与候选路径规范化。`is_relative_to` 确认规范化结果仍在根目录下；`../outside` 和绝对路径会失败。真正解压前还要读取归档条目的类型并拒绝符号链接，避免路径检查后通过链接跳出去。

## 解析层：把高风险解析器当作隔离任务

PDF、Office、图片和浏览器渲染器都是复杂解析器。即使依赖保持更新，也不应让它们以应用 API 的高权限、同一进程和无限资源运行。

更稳妥的解析 Worker 具备：只读输入对象、独立临时目录、非 root 用户、无生产内网访问、CPU/内存/进程/文件描述符限制、硬 Deadline 和固定允许输出格式。解析器只输出结构化 Block 与警告，不直接写 active 索引。

进程退出码、stderr 摘要、解析器版本、耗时和资源终态进入审计。超时后要终止整个进程组，不能只让 API 停止等待；否则后台解析仍会占资源。

## 语义层：提示注入为什么不能靠“检测一句话”解决

文档中可能包含指令式文本，但技术手册本来就会写“执行命令”“忽略缓存”。用关键词看到“忽略”就拒绝整篇文档会产生大量误报。语义层更重要的工作是建立**信任标记和能力隔离**：

- 外部正文进入上下文时标记为 `untrusted_content`；
- 系统规则、用户问题、可信元数据和外部内容分区装配；
- 外部内容不能修改 Tool 白名单、Scope、审批与 Deadline；
- 从文档提取的 URL、命令和参数仍要经过确定性校验；
- 高风险写工具需要程序策略或用户确认；
- Eval 用恶意文档验证实际副作用数为 0。

检测器可以输出风险标签、可疑位置和置信度，供隔离、脱敏与人工复核使用，但它不是权限系统。即使检测器漏报，工具边界仍应阻止越权动作。

PII 和凭证扫描也要区分：确定命中的密钥模式可以阻断或脱敏；姓名等上下文相关数据可能需要按租户策略处理。日志只保存规则 ID、片段 hash 和位置，不复制秘密。

## 四个状态不足以表达失败原因，状态与检查要分开

主状态可以保持简单：`received -> scanning -> parsed -> approved`，失败进入 `rejected` 或 `quarantined`。具体原因放到不可变检查记录：

```text
artifact_id
artifact_sha256
check_stage: network | bytes | archive | parser | semantic
rule_id
checker_version
status: passed | failed | unavailable | needs_review
evidence_summary
created_at
```

`unavailable` 不能等于 passed。`needs_review` 也不能自动发布。候选 Release 只接受策略要求的全部检查为 passed，或明确允许的低风险标签。

## 用测试覆盖真实攻击路径

把纯策略函数保存到 `admission.py` 后，至少运行这些用例：

为了验证“用测试覆盖真实攻击路径”，下面的测试把“测试覆盖内网跳转、路径穿越和压缩膨胀，断言被拒内容从未进入解析与索引阶段”变成可执行断言。每个用例自己构造输入，并用断言固定返回值或失败状态；某条测试失败时，可以从用例名直接定位到被破坏的契约。

```python
# 测试覆盖内网跳转、路径穿越和压缩膨胀，断言被拒内容从未进入解析与索引阶段。
from pathlib import Path


def test_plain_http_is_denied_before_dns_use() -> None:
    result = validate_target("http://docs.example.test/file.pdf", ["203.0.113.10"])
    assert result == NetworkDecision(False, "scheme_denied")


# 这个用例走失败或拒绝分支，确认错误码、终态和副作用都符合契约。
def test_any_denied_address_rejects_the_host() -> None:
    result = validate_target(
        "https://docs.example.test/file.pdf",
        ["203.0.113.10", "::1"],
    )
    assert result.code == "address_range_denied"


def test_archive_path_cannot_escape_root(tmp_path: Path) -> None:
    # 从这里进入可能失败的外部边界，下面只转换已经明确分类的异常。
    try:
        safe_member_path(tmp_path, "../../outside.txt")
    # 输入未通过结构或业务校验，返回稳定错误后不会执行真正的外部操作。
    except ValueError as error:
        assert "escapes" in str(error)
    else:
        raise AssertionError("unsafe archive member was accepted")
```

第一条在网络请求前拒绝明文 HTTP；第二条证明一个域名只要包含受限解析结果就整体拒绝；第三条验证归档路径穿越。运行 `python3 -m pytest -q` 应看到三条通过。

集成测试还要提供逐跳重定向、连接 peer IP、无 Content-Length 的超大流、嵌套归档、扫描服务不可用、解析超时和恶意提示文档。测试目标不是让检测器识别所有坏话，而是证明任何外部文本都不能改变权限和产生未授权副作用。

## 外部内容准入 Runbook

遇到“外部文档导入失败”时按层检查：

1. URL/对象 hash 与用户授权是否匹配；
2. 规范化 URL、每跳 Host、解析 IP 和最终 peer IP；
3. 状态码、声明大小、实际读取字节和 Deadline；
4. 扩展名、声明 MIME、Magic 与选定解析器；
5. 归档成员数、总大小、压缩比、嵌套和危险路径；
6. 扫描器/解析器版本、退出码、资源终态；
7. 语义风险标签与脱敏结果；
8. artifact 是否仍在 quarantine，是否被错误关联到候选 Release；
9. 日志中是否只保留 hash 和规则 ID，没有凭证与敏感正文。

使用这份 Runbook 时，要能解释 SSRF、DNS rebinding、Magic/MIME、压缩炸弹、解析隔离和间接提示注入分别发生在哪一层，并知道每层通过只允许进入下一层。

## 常见问题

### 禁止 `localhost` 为什么仍挡不住 SSRF？

攻击者可以使用十进制或 IPv6 表示、短期 DNS 解析、重定向和可控域名，把看似公网的 URL 最终连接到内网、云元数据或环回地址。安全抓取应规范化 URL，限制协议，解析全部地址并拒绝保留网段，在建立连接后核对实际 peer IP；每一次重定向都重复检查。仅在字符串里搜索 `localhost` 无法覆盖地址变化，也无法阻止 DNS rebinding。

### 扩展名、Content-Type 和 Magic 应该相信哪一个？

三者都只能提供一部分证据。扩展名来自用户，最容易伪造；Content-Type 由客户端或远端服务器声明，也可能错误；Magic 根据文件头判断实际格式，但对容器文件和混合内容仍有限。准入应比较三者并按允许的格式映射选择解析器，冲突时进入拒绝或人工复核，而不是随便选一个。解析器还要在隔离环境运行，因为格式识别正确不代表文件安全。

### 压缩炸弹只要限制压缩包文件大小就够了吗？

不够，小压缩包可以展开为巨大内容，还可能嵌套多层、包含海量成员或路径穿越。解压前读取目录信息，限制成员数、累计声明大小、压缩比和嵌套深度；每个成员路径规范化后必须仍位于隔离根目录。实际流式解压时继续计数，超过上限立即停止。不能先全部写入磁盘再检查，否则磁盘和解析资源已经被耗尽。

### 杀毒或恶意文本检测通过后，提示注入问题就解决了吗？

没有。提示注入可能是普通自然语言，不具备可稳定匹配的恶意特征。正确边界是把外部正文始终标记为数据，不能改变系统规则、工具白名单、身份 Scope 和审批要求；工具参数还需确定性校验。检测器可以增加风险标签和隔离，但不应成为唯一防线。安全 Eval 要放入诱导导出、写入或扩大权限的文档，验证实际副作用仍为零。

### 解析器为什么要放进隔离任务？

PDF、Office、图片和归档解析器处理复杂二进制，可能出现内存耗尽、超时、漏洞或崩溃。独立进程或受限容器可以设置 CPU、内存、磁盘、网络和时间上限，失败只产生受控状态，不拖垮 API 与 Worker。输入使用隔离对象，输出只允许结构化 Block 和必要日志；解析器不能访问业务凭证。隔离不能替代补丁和扫描，但能缩小未知文件造成的影响范围。
