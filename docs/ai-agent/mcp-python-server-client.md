---
title: 用 Python 实现 MCP Server 与 Client
description: 实现只读工具并验证发现、调用、参数错误、超时和资源释放。
category: ai-agent
part: 工具、MCP 与 Skill
stageKey: tools
chapter: 12
sequence: 12
slug: mcp-python-server-client
tags:
  - MCP
  - Python
  - Client Server
sourceKey: ai-mcp-python-server-client
dependsOn:
  - mcp-protocol-lifecycle
updated: '2026-08-17'
lastUpdated: false
---
# 用 Python 实现 MCP Server 与 Client

这一篇从一个只读搜索工具开始：Server 暴露 `search_policy`，Client 先发现工具，再传入查询词并读取结构化结果。代码很短，验证范围却不能只停在“能返回文本”。参数错误是否被拒绝、Client 是否按生命周期关闭、换成远程传输后谁负责认证，都要一并说清楚。

本文使用官方 [MCP Python SDK](https://py.sdk.modelcontextprotocol.io/)。截至 2026 年 8 月，官方仓库将 v2 标记为当前稳定版本，安装 `mcp` 会得到 2.x；Python 要求为 3.10 或更高。SDK 和协议仍会更新，复制命令前可以先看 [v2 迁移说明](https://py.sdk.modelcontextprotocol.io/migration/)是否有新变化。

::: info 完成后的调用路径

1. `MCPServer` 从函数签名生成工具的输入 Schema。
2. `Client` 初始化会话并读取 `tools/list`。
3. Client 调用 `search_policy`，Server 校验参数后执行函数。
4. SDK 返回文本内容与 `structured_content`。
5. 测试分别断言成功结果和非法参数错误。

:::

## 安装 Python、uv 与 MCP SDK

先确认本机有 Python 3.10 以上版本：

```bash
python3 --version
```

没有 Python 时，从 [Python 官方下载页](https://www.python.org/downloads/)选择当前系统的安装包。macOS 也可以使用 Homebrew，Windows 安装器要勾选把 Python 加入 PATH。安装完成后重新打开终端，再运行版本命令。系统里同时存在多个 Python 时，后面的虚拟环境应显式使用满足版本要求的解释器。

<figure class="doc-shot">
  <img src="/images/install/python-downloads.png" alt="Python 官方下载页，展示当前版本和不同平台的下载入口" loading="lazy">
  <figcaption>Python 官方下载入口。先按操作系统选择安装包，再用版本命令确认终端调用的是同一个解释器。</figcaption>
</figure>

本文用 **uv** 创建项目和锁定依赖。安装方式以 [uv 官方安装文档](https://docs.astral.sh/uv/getting-started/installation/)为准。macOS 与 Linux 可以运行：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Windows PowerShell 使用：

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

重新打开终端后检查：

```bash
uv --version
```

<figure class="doc-shot">
  <img src="/images/install/uv-installation.png" alt="uv 官方安装文档中的安装命令和版本选择" loading="lazy">
  <figcaption>uv 官方安装文档的命令区域。需要固定版本时，使用页面列出的版本化安装地址。</figcaption>
</figure>

如果不希望执行网络安装脚本，可以从官方文档选择 Homebrew、WinGet 或 PyPI 安装方式。团队环境还应固定安装来源和版本，不把一条远程脚本作为无人审核的生产安装流程。

MCP Python SDK 的 [官方首页](https://py.sdk.modelcontextprotocol.io/)同时列出 Python 版本要求和 `uv`、`pip` 两种安装方式。下图截取的是当前稳定版文档的安装区域，`[cli]` 额外安装开发所需的 `mcp` 命令；只使用库 API 时不必默认带上这个额外项。

<figure class="doc-shot">
  <img src="/images/ai-agent/mcp-python-sdk-install.png" alt="MCP Python SDK 官方文档中的 uv 与 pip 安装入口" loading="lazy">
  <figcaption>MCP Python SDK 官方文档的安装入口，截图时选中 uv。</figcaption>
</figure>

创建项目并安装带 CLI 的 MCP SDK：

```bash
mkdir mcp-policy-demo
cd mcp-policy-demo
uv init --python 3.13
uv add "mcp[cli]>=2,<3"
uv add --dev "pytest>=8,<9"
```

`mcp[cli]` 在 SDK 之外安装 `mcp dev`、`mcp run` 等命令。只在代码里使用 SDK 时可以安装普通 `mcp`。`>=2,<3` 表示示例按 v2 API 编写，未来 v3 不会在无审查的情况下进入环境。生成的 `uv.lock` 应和代码一起保存，其他机器执行 `uv sync` 才会得到同一组依赖。

不用 uv 也可以在虚拟环境中通过 pip 安装：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install "mcp[cli]>=2,<3" "pytest>=8,<9"
```

Windows 激活命令是 `.venv\Scripts\activate`。不建议把 SDK 安装进系统 Python，项目间的版本约束会互相影响，卸载时也难判断哪些脚本仍在使用。

最后验证包和 CLI 都可见：

```bash
uv run python -c "import mcp; print(mcp.__file__)"
uv run mcp --help
```

第一条输出当前虚拟环境中的包路径，第二条应显示 CLI 帮助。`command not found` 通常表示仍在项目目录外运行，或终端没有刷新 PATH；`ModuleNotFoundError` 表示命令没有经过项目虚拟环境执行。先解决环境问题，再写 Server。

## Server 怎样把 Python 函数变成工具

示例数据只有两条公开策略，用来证明工具发现、参数校验和结构化返回。它不是搜索引擎，也没有数据库、用户 ACL 和真实文档版本。

<<< ../../examples/ai-agent/mcp-python/server.py

`MCPServer("policy-search-demo")` 创建 Server。`@mcp.tool()` 把函数注册成工具，名称来自函数名，说明来自 Docstring，输入 Schema 来自类型标注。`query: str` 是必填字符串，`limit: int = 3` 是带默认值的整数。返回值标注为字典后，SDK 还能生成输出 Schema，并在调用结果中提供结构化内容。

函数内部仍要做业务校验。类型标注能拒绝把数组传给 `query` 之类的形状错误，却不知道 `limit` 为什么只能取 1 到 10，也不知道空白查询是否有意义。真实搜索还要从认证上下文读取用户范围，不能让模型在参数里自行填写租户或权限。

返回的每一项带 `source_id`、标题和文本。稳定来源 ID 让上层可以绑定 Evidence；只返回拼接文本时，Client 很难知道哪一段来自哪份材料。真实系统还应返回发布版本、可见范围摘要、是否截断和分页游标，但不要把内部凭证、完整 ACL 或数据库字段暴露给模型。

文件末尾的 `mcp.run(transport="stdio")` 只在直接执行脚本时启动 stdio Server。被测试代码导入时，`__name__` 不等于 `"__main__"`，不会创建子进程。这让同一个 Server 对象既能本地运行，也能通过内存 Client 做快速测试。

## 先读懂 SDK 生成的工具合同

装饰器省掉了手写 JSON Schema，不代表合同可以不审查。Server 启动后，Client 从 `tools/list` 看到的是一份公开接口：工具名决定模型怎样引用能力，Docstring 决定模型在什么问题下选择它，输入与输出 Schema 决定两端怎样解析数据。函数看起来只是内部实现，注册后就成了跨进程合同。

可以在内存 Client 中打印 `tools.tools[0].input_schema`，核对 `query` 是否必填、`limit` 是否带整数类型和默认值。Python 类型只表达一部分约束，示例中 1 到 10 的范围仍由函数检查。若希望范围直接出现在 Schema，需要使用 SDK 支持的校验模型或字段约束，并用实际 `tools/list` 结果确认生成内容，不能只看 Python 声明猜测。

Docstring 要描述动作与返回，不写营销句，也不要隐瞒副作用。`Search a fixed, public policy sample` 明确表示它查固定样本；真实服务可以写“在当前用户可见的已发布文档中搜索并返回来源 ID”。如果工具会写入、发送或删除，应在说明和风险元数据中直接写明，Host 才能把它放入审批路径。

工具名称要稳定。把 `search_policy` 改成 `find_rules` 后，旧 Client 缓存、固定测试和 Agent Trace 都会失去对应关系。需要重命名时可以在一段迁移期同时暴露旧、新名称，旧名称返回弃用提示，等活动 Client 更新后再撤回。长期同时保留两个同义工具会增加模型误选和重复调用，应设定删除版本。

输入字段也遵循兼容规则：新增可选字段通常比新增必填字段容易迁移，删除字段前要确认调用样本不再出现，改变字段含义则应创建新版本。Server 收到未知字段时采用明确策略，严格拒绝比静默忽略更容易发现客户端漂移。兼容判断不能只比较工具名。

输出合同面向程序，不面向人眼排版。稳定 ID、机器可判定状态、分页和警告使用独立字段；给模型阅读的摘要可以放在 `text`，但不要让 Client 从自然语言里解析 `total` 或错误类别。结构化结果中某个字段暂时缺失时，返回 `null`、省略还是报错要事先约定，不能由每次工具调用自由决定。

Schema 审查应进入发布门禁。保存当前工具目录快照，升级 SDK 或改函数后重新生成，比较工具新增、撤回、字段必填性、类型和返回结构。差异符合预期才更新快照。这样能在上线前发现依赖升级导致的合同变化，而不是等模型开始产生旧参数才排查。

## 先用开发工具检查 Server

在包含 `server.py` 的目录运行：

```bash
uv run mcp dev server.py
```

这个命令适合开发时查看工具目录并手动调用。输入 `query=remote access`、`limit=2` 后，结果应包含 `policy-remote-access`，`total` 为 1。把 `limit` 改成 0，工具应返回错误，而不是偷偷替换成默认值。

也可以直接按 stdio 启动：

```bash
uv run python server.py
```

此时终端看起来像停住了，因为进程正在等待标准输入中的协议消息。不要在标准输出里加入 `print("server started")` 之类调试文本，它会和 JSON-RPC 消息混在一起。日志写标准错误，或交给 SDK 的日志接口。

启动失败先看三处：当前目录是否有 `server.py`，`uv run python -c "import mcp"` 是否成功，代码是否使用了 v2 API。把 v1 文档中的类名和 v2 包混用，通常在导入阶段就报错。遇到问题先核对 [SDK Get Started](https://py.sdk.modelcontextprotocol.io/get-started/)和安装的主版本，不要通过反复重装随机尝试。

## Client 怎样发现和调用工具

最小 Client 直接连接已经创建的 Server 对象，不启动子进程，也不占端口。这条内存路径适合测试 Server 合同，不能证明 stdio 或 HTTP 传输正确。

<<< ../../examples/ai-agent/mcp-python/client.py

`async with Client(mcp)` 会初始化并在退出时关闭会话。`list_tools()` 返回 `ListToolsResult`，工具列表位于 `.tools`；直接遍历结果对象会遍历模型字段，不是工具项。这个差别已经由下面的测试实际验证，不应照搬旧版本示例的返回结构。

调用 `search_policy` 时，第二个参数是工具参数字典。正常结果包含两种表达：`content` 是协议内容块，`structured_content` 是按照输出 Schema 解析的结构。应用需要固定使用哪一种，不能在不同调用中随机读取。要绑定来源和做字段校验时，结构化结果更容易处理；面向不支持结构化结果的旧 Client 时，还要保留文本内容。

这段代码直接打印结果，只是为了观察。Agent Runtime 接入时会把结果转换为内部 Observation，附上 Server 身份、工具版本、应用 `call_id` 和用户范围，再进入 Evidence 校验。Tool Result 中的文本仍是不可信外部内容，不能成为系统指令。

## 可信身份为什么不能出现在模型参数里

搜索示例没有用户系统，因此函数签名里只有 `query` 和 `limit`。接入真实知识库后，最容易犯的错误是再加一个 `user_id` 或 `tenant_id`，然后让模型按对话内容填写。模型能生成结构正确的字符串，却不能证明这个身份属于当前会话。

Host 已经完成登录时，认证信息应通过 Client 的受控配置或认证 Header 进入 Server。Server 在请求上下文中恢复调用者，再根据当前角色、组织和资源计算可见范围。工具参数只保留用户想查什么，不包含用户可以看什么。即使 Tool Result 诱导模型换成管理员 ID，调用合同里也没有可利用的字段。

远程 Server 使用 Bearer Token 时，Token 从密钥存储加载，不放进 URL，不写进 Prompt，也不出现在工具描述。Client 日志只记录凭证是否存在、种类和校验结果。Server 返回带 Token 的错误正文时，适配器先脱敏再保存。Token 轮换由认证层处理，不需要修改工具 Schema。

本地 stdio 也有身份问题。Host 可能为不同用户启动独立 Server 进程，或向同一进程传递短期凭证。无论哪种方式，环境变量和启动参数由受控配置生成，模型不能改写。把完整 Host 环境继承给 Server 会泄露无关凭证，应该建立显式允许清单。

业务 Scope 往往比用户 ID 更细。一次请求可能只允许某个知识空间、已发布版本和指定文档集合。运行时在创建 Tool Call 时固定 Scope 快照，Server 以当前权限再次确认。权限在调用中途撤回时，结果进入答案前继续检查；不能因为搜索启动时合法，就永久接纳随后返回的内容。

权限拒绝应返回稳定错误。它和合法空结果、查询语法错误、依赖超时分别代表不同状态。上层收到 `permission_denied` 后结束当前路径，不让模型尝试同一 Server 的另一个宽范围工具。空结果则可以在同一 Scope 内调整查询，但不能扩大范围。

多租户缓存还要把权限版本放进键或在读取后过滤。直接缓存未过滤的完整结果，再按用户取前几条，容易在排序、摘要和分页中泄露其他租户信息。更安全的设计在检索阶段应用 Scope，缓存候选也绑定租户与数据版本，命中时重新检查当前授权。

测试至少创建两个身份和互不重叠的文档。A 用户查询只能得到 A 的来源 ID，直接传入 B 的文档 ID 被拒绝；撤回权限后，同一个缓存键也不能返回旧内容。更换问题表达重复测试，确保限制来自数据结构和 ACL，不是某个关键词特判。

## 目录发现结果怎样缓存和失效

每次模型调用都重新向所有 Server 请求完整工具目录，简单但会增加延迟和连接压力。缓存目录可以降低这部分开销，前提是键与失效条件足够明确。

原始目录属于某个 Server 身份、协议会话和实现版本。Host 按用户与策略过滤后得到模型可见目录，这一层还要关联用户权限和策略版本。把过滤后的结果做全局缓存，会让第一个用户的可见能力泄露给其他用户。缓存原始目录与缓存用户视图应使用不同对象。

Server 声明 `listChanged` 时，Client 收到变化通知后重新拉取目录。没有变化通知的 Server 可以用较短 TTL、重连刷新和发布事件失效。无论哪种方式，Client 不能在网络失败时永久沿用旧目录；允许短暂降级时要标明目录年龄和风险，并禁止新出现的写动作。

运行中的候选引用目录版本。模型提出动作后，工具在新目录中被删除，执行器在发送前拒绝；请求已经发送则等待原回执，但结果进入后续状态前按原合同解析，并记录工具已经撤回。简单地把旧候选映射到同名新工具，可能跨过 Schema 和风险变化。

缓存命中不应省略 Host 策略。比如管理员刚撤销一个 Server 的使用权，目录缓存尚未到期，新请求也必须在策略过滤时移除该 Server。能力发现解决“有什么”，授权解决“当前谁能用”，两者生命周期不同。

目录缓存测试先拉取 v1，再让 Fake Server 返回 v2 并发出变化通知。断言新候选只看到 v2，旧候选在执行前发生版本冲突。另一个用例切换用户，断言两份模型目录不会因为共用原始 Server 缓存而串线。

观测指标可以记录目录获取耗时、缓存命中、目录版本和过滤后工具数，不记录完整描述和 Schema 到低权限指标系统。工具数突然归零时报警有用，报警动作应指向初始化、权限服务或 Server 健康检查，而不是自动放宽过滤。

## Tool Result 怎样变成应用里的 Observation

SDK 返回 `CallToolResult` 后，应用适配器需要做一次边界转换。转换的输入包括协议结果、Server 身份、工具目录版本、调用参数摘要和可信 Scope；输出是内部 Observation，供 Agent Runtime 保存和评估。

先看 `is_error`。为真时，不把错误文本混入正常证据列表，而是映射为参数、权限、依赖、超时或未知类别。错误正文可以提供排障信息，但模型不能根据它修改系统策略。可重试性由错误类型和工具副作用共同判断，不从文案里的“try again”推断。

正常结果再解析 `structured_content`。适配器检查必需字段、数据类型、来源 ID 和大小上限。Schema 通过只表示形状可读；来源是否存在、用户是否可见、数据版本是否活动，仍要查询权威状态。验证失败时保存候选与问题列表，不伪造成工具执行错误。

`content` 中的文本适合给模型阅读，但要带外部数据标记。若文本包含指令句、HTML 或未知链接，它们仍是工具返回内容，不会提升为系统消息。需要下载链接或二次读取时，只通过白名单工具与受控 URL 校验，不让模型直接把文本拼成网络请求。

结果体积超过预算时，适配器按字段和来源截断，并返回 `truncated`、原始数量和续页信息。直接在字符串尾部切断会破坏 JSON，也可能把来源 ID 留掉。更好的工具返回短摘要与稳定 ID，需要正文时再调用读取工具。

Observation 保存 `call_id`，而不是只保存 JSON-RPC 请求 ID。一次应用调用可能因只读超时发生多个协议尝试，所有尝试都归到同一个动作；每次尝试仍保留独立 ID、开始时间和错误。这样可以判断最终成功是否经历重试，也能避免重复结果进入 Evidence。

最后才把 Observation 交给答案层。答案层按 Claim 需要挑选 Evidence，无法覆盖关键事实时明确说资料不足。Tool 调用成功不是回答必须成功的理由，尤其在范围内空结果、旧版本结果或引用缺失时，安全拒答是正确终态。

## 一次端到端请求如何变化

用“远程访问需要哪些条件”走完整链路。Host 从登录会话得到用户身份和可见知识空间，连接管理器返回已初始化的 Server 会话与目录 v3。模型只看到 `search_policy(query, limit)`，提出查询词和数量。

执行器确认工具属于目录 v3，参数结构正确，当前策略允许只读搜索；它创建 `call-42`，固定 Scope、数据 Release 和绝对 Deadline。Client 发送协议请求，Server 从认证上下文恢复用户，重新计算可见范围，然后搜索数据。

Server 返回两条候选。第一条来自当前 Release 且在 Scope 内，第二条在调用期间被撤回。适配器保留两条原始候选和撤回证据，只有第一条进入 Observation 的可用项。答案层据此给出条件，并引用第一条来源，不把第二条内容拼进回答。

失败轨迹把 `limit` 改为 0。Server 函数在访问数据前拒绝，`CallToolResult.is_error` 为真，执行器把它分类为不可网络重试的参数错误。若参数来自模型且修复预算尚在，可以把稳定错误和原 Schema 交回一次；修复仍非法就终止。用户身份、Scope 和 Deadline 不参与模型修复。

另一条失败轨迹在 Server 完成搜索后断开网络。只读搜索没有外部副作用，Runtime 可以在剩余 Deadline 内创建第二个协议尝试，仍归属 `call-42`。第二次成功后去重来源。若工具是发送审批，则不能这样处理，必须凭幂等键查询第一次回执。

最终 Trace 能回答输入问题、模型候选、可信参数、Server 与工具版本、两次尝试、接纳来源、排除原因和停止状态。只保存最终文本时，这些工程判断都无法复查，也不能写出可靠回归用例。

## 三层测试分别证明什么

内存测试证明 Python 函数、SDK 生成的合同和 Client 结果解析能够配合。它速度快，适合覆盖必填字段、值域、结构化结果、工具错误和目录变化。它没有操作系统进程、网络栈和认证，不能证明部署可用。

stdio 集成测试从真实命令启动 Server。测试读取初始化结果，发现工具，完成调用，再关闭 Client 并等待进程退出。额外用例让 Server 向标准错误写日志、向标准输出误写普通文本、在调用中超时和忽略退出，检查 Client 是否给出正确错误并清理资源。

HTTP 集成测试启动隔离端口和测试认证。它覆盖 JSON 与 SSE 响应、Session ID、协议版本 Header、401、403、404 会话失效、响应过大、连接断开、取消与重连。测试目标只绑定环回地址，随机端口由测试夹具分配，不能连接生产服务。

应用契约测试位于 MCP 之上，创建真实的身份与 Scope，检查工具目录过滤、Server 再授权、缓存命中后鉴权、Evidence 来源绑定和安全拒答。前面三层都通过，应用仍可能因为错误映射或范围遗漏泄露数据，这一层不能省略。

故障注入要精确选择边界。Server 执行前断开，预期零副作用；执行后响应前断开，预期状态未知且不盲目重试；结果保存后答案交付失败，预期只重放交付，不再次调用 Tool。一次用例只改变一个故障位置，证据才容易解释。

回归报告按错误类型和阶段统计。把权限拒绝变成空结果、把参数错误变成超时、把取消变成成功，都属于行为退化，即使测试总数仍然通过。断言状态和调用次数比断言文本包含某句话更可靠。

在线冒烟使用专用测试身份、只读工具和最小数据。检查完成后清理测试会话与临时记录，不在日志保存 Token。没有执行在线测试时，发布说明只能说本地合同与隔离传输通过，不能写成生产验证完成。

执行 Client：

```bash
uv run python client.py
```

在当前示例数据下，第一行是工具名列表，第二部分是结构化查询结果。输出内容由固定样本决定；换成数据库或远程服务后，不要在文章、测试或日志中写死动态结果。

## stdio Client 怎样管理子进程

内存 Client 省略了最容易出错的资源管理。实际 Host 连接本地 Server 时，通常配置解释器命令、脚本路径和少量受控环境变量，再由 Client 启动子进程。工作目录和路径应使用绝对值或由配置解析，不能假设 Host 总从项目根启动。

stdio 的数据流很简单：Client 写 Server 的标准输入，Server 把协议消息写到标准输出，日志写标准错误。消息和日志通道分开后，Client 才能逐条解析 JSON-RPC。子进程退出时保存退出码和标准错误尾部，便于区分导入错误、配置错误和主动关闭。

Client 是进程所有者时，也要负责关闭。正常退出先关闭输入，给 Server 一段时间自行结束；超时后发送终止信号，最后才强制结束。强制结束不是正常成功，Trace 要记录资源清理被升级。Host 重启后还应扫描自己创建且失去所有者的子进程，不能杀掉来源不明的同名进程。

环境变量只注入 Server 必需的配置。不要把整个 Host 环境原样继承给第三方 Server，其中可能含有云凭证、数据库地址和代理认证。文件系统根、网络访问和可执行命令也应按 Server 风险放进沙箱或白名单。stdio 是本地传输，不是信任证明。

## Streamable HTTP 怎样改变部署边界

需要让多个 Host 连接同一 Server 时，可以把 Server 运行成 Streamable HTTP 服务。官方 CLI 的最小启动方式是：

```bash
uv run mcp run server.py --transport streamable-http
```

按照当前 SDK 默认配置，Client URL 通常是 `http://127.0.0.1:8000/mcp`。实际端口和参数以 `mcp run --help` 输出为准，不应把开发默认值硬编码进生产配置。

Client 把 Server 对象换成 URL，其余发现和调用过程保持相似：

```python
from mcp import Client

async with Client("http://127.0.0.1:8000/mcp") as client:
    tools = await client.list_tools()
    result = await client.call_tool(
        "search_policy",
        {"query": "remote access", "limit": 2},
    )
```

换成 HTTP 后，Server 成了独立服务，要新增认证、TLS、Origin 校验、请求和响应大小限制、连接超时以及真实对端校验。本地开发只绑定 `127.0.0.1`，不能为了省配置直接监听所有网卡。Client 接收用户填写的 URL 时还要防止访问环回地址、云元数据地址和内网网段，避免 MCP 入口变成 SSRF 通道。

Streamable HTTP 可能返回单个 JSON，也可能返回 SSE 流，Client 要按 SDK 生命周期关闭连接。网络断开不代表工具取消；带副作用的工具在未知回执时先查询状态。Server 返回的 `Mcp-Session-Id` 用于协议会话，访问 Token 仍通过认证 Header 传递，两者不能互换。

## 测试怎样覆盖成功和参数错误

示例测试使用内存 Client，固定验证工具发现、结构化结果和非法参数。它不需要端口，执行速度快，适合每次改工具合同后运行。

<<< ../../examples/ai-agent/mcp-python/tests/test_server.py

第一条用例先读取目录，断言只有 `search_policy`，再发起正常调用。它检查 `is_error` 为假，并比较完整的 `structured_content`。若函数改名、返回字段变化或过滤逻辑出错，用例会在合同变化的位置失败。

第二条把 `limit` 设为 0，断言结果是工具错误。这里没有要求异常一定穿过 Client 抛出，因为 SDK 会把工具执行失败包装为 `CallToolResult`。调用方需要检查 `is_error`，不能看到 HTTP 或协议请求成功就直接读取内容。

运行测试：

```bash
uv run --group dev pytest
```

本文仓库还把示例纳入 `yarn ai-agent:examples`。当前执行结果是 MCP 示例 2 条测试通过；这个数字只对应当前锁文件、当前代码和本地内存传输，不代表远程 Server、网络、认证或生产数据已经验证。

下一层集成测试要启动隔离的 stdio 子进程，断言初始化、目录发现、调用、参数错误和关闭后的进程状态。HTTP 测试再覆盖 JSON 与 SSE 两种返回、Session Header、认证失败、响应过大、重定向、超时和取消。三层测试各自证明不同边界，不能用内存用例替代真实传输。

## 失败时按发生位置排查

**导入阶段失败**，先运行 `uv run python -c "import mcp"`，再检查 Python 版本和锁文件。`ModuleNotFoundError` 是环境问题，尚未进入 MCP 生命周期。

**Server 启动后立即退出**，查看退出码和标准错误。常见原因是脚本路径、导入、语法和配置；不要把标准错误合并到标准输出后再交给协议解析器。

**Client 发现不到工具**，确认初始化成功、Server 声明了 `tools`、装饰器实际执行、Host 没有按策略过滤。目录为空和权限拒绝不是同一种状态。

**工具调用返回参数错误**，打印工具的输入 Schema 与候选参数摘要，检查字段名、类型和值域。模型可以重新生成普通业务参数，用户身份和 Scope 仍由运行时注入。

**工具返回成功但内容不可用**，核对 `structured_content`、来源 ID、版本和可见范围。协议成功只说明调用完成，Evidence 校验仍可能排除全部候选并安全拒答。

**调用超时**，区分连接超时、等待响应超时和总体 Deadline。只读搜索可以按同一应用 `call_id` 建立新尝试，写操作先查回执。无限重试会消耗连接并隐藏原始故障。

**退出后仍有进程或连接**，检查 Client 上下文管理器是否离开、后台任务是否持有引用、stdio 输入是否关闭、HTTP Client 是否由当前组件拥有。资源共享时，单次 Tool Call 不应关闭整个连接池。

排障记录保留 Server 身份、工具名、协议请求 ID、应用 `call_id`、阶段和稳定错误类型。完整参数可能含有用户内容，Token 和私有 URL 更不能进入普通日志。远程错误正文在记录前先做敏感字段清理和长度限制。

## 从演示走向生产还缺什么

当前 Server 的数据在内存里，任何人只要能连接就会看到同一份结果。生产实现至少补上认证、用户范围、数据版本、分页、响应预算、限流和审计。每次读取都执行当前 ACL，缓存只保存候选，命中后不能跳过授权。

只读工具也要有清晰边界。搜索与读取拆成两个工具时，搜索返回稳定 ID 与短摘要，读取工具再按当前权限取正文。这样可以控制上下文体积，也能在文档撤回后拒绝旧 ID。一次返回整库正文既浪费 Token，也扩大泄露范围。

写工具还需要幂等键、审批、业务回执和补偿。SDK 能把函数注册成 Tool，却不会自动防止重复副作用。网络断开后结果未知时，Runtime 停在待确认状态，不要重新调用模型生成一个“更可能成功”的动作。

部署时固定 SDK 主版本和锁文件，升级先跑目录、Schema 与错误类型的契约测试。工具描述变化也要进入回归，因为模型的选择可能随描述改变。候选版本通过隔离环境的 stdio 与 HTTP 测试后再切流，旧版本保留到会话和任务稳定结束。

最小示例真正证明的只有三件事：v2 SDK 能从函数生成工具，Client 能发现并调用它，非法业务参数会形成工具错误。MCP 的权限、安全、可靠性和答案质量仍要由应用补齐。把这些职责分开，代码才不会因为“已经用了标准协议”而跳过最重要的验证。
