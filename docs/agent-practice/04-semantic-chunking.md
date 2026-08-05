---
title: "04｜语义切片与质量门禁"
description: "保留标题、表格、列表和上下文关系，用可量化门禁阻止坏切片发布。"
category: agent-practice
tags: ["Chunking", "Quality Gate"]
updated: 2026-08-04
order: 40
depth: core
series: "生产级知识 Agent 实战"
---
# 04｜语义切片与质量门禁

固定每 500 个字符切一刀，是最容易实现、也最容易把知识切坏的方案。它会把标题与正文分开、把表格行拆断、让列表项失去父标题，并且在中英文混排和代码段中产生难以检索的碎片。切片的目的不是让文本短，而是让每个候选同时拥有足够的回答上下文、可独立排序的主题和可回到源文档的定位。

## 先定义 Chunk 的可用性

一个可发布的 chunk 至少满足四个条件：

1. 它是语义单元或语义单元的连续分片，不在句子、代码行、表格行中间任意截断；
2. 它携带标题路径、源版本、文档和可见范围；
3. 它能够通过 `previous/next` 或父级摘要恢复邻接上下文；
4. 它有稳定 ID，重建相同版本时不会因为运行顺序改变而随机变化。

```python
class ChunkRecord(BaseModel):
    id: str
    document_id: str
    source_version_id: str
    ordinal: int
    kind: Literal["paragraph", "list", "table", "code", "heading"]
    content: str
    display_content: str
    section_path: tuple[str, ...]
    parent_chunk_id: str | None = None
    previous_id: str | None = None
    next_id: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)
```

`content` 用于检索和 embedding，`display_content` 用于引用展示，二者可以不同。例如检索文本包含父标题和表头，展示文本保留原始排版；不要在生成回答时把仅用于召回的重复标题当作用户原文的额外事实。

## 解析标题栈

Markdown/HTML 标题是最便宜、最有价值的上下文。遍历 block 时维护 heading stack：遇到同级或更高 heading 就弹出后级路径，遇到正文则复制当前路径。标题本身可以创建轻量 section chunk，帮助查询“某章节有哪些内容”。

```python
def section_path(blocks: list[ParsedBlock]) -> list[tuple[ParsedBlock, tuple[str, ...]]]:
    stack: list[tuple[int, str]] = []
    result = []
    for block in blocks:
        if block.kind == "heading":
            level = int(block.metadata.get("level", 1))
            while stack and stack[-1][0] >= level:
                stack.pop()
            stack.append((level, block.text.strip()))
        result.append((block, tuple(text for _, text in stack)))
    return result
```

不能假设标题级别永远连续。缺少 `h2` 时保留作者实际路径；解析错误要写 warning，而不是偷偷修正成另一套文档结构。section path 的顺序也应该进入稳定 ID，避免同名章节互相覆盖。

## 语义单元和长度上限

先按段落、列表、代码、表格等类型分组，再处理超长单元。长度应按模型 token 而非 Python 字符粗估；中文、emoji、URL 和代码的 token 比例不同。每个类型使用不同分割器：普通段落按句号/换行寻找边界，代码按函数或 fenced block，表格按完整行。

```python
def split_units(text: str, budget: int, counter: TokenCounter) -> list[str]:
    sentences = re.split(r"(?<=[。！？.!?])\s+|\n{2,}", text.strip())
    chunks: list[str] = []
    current: list[str] = []
    for sentence in sentences:
        candidate = "\n".join([*current, sentence])
        if current and counter.text(candidate) > budget:
            chunks.append("\n".join(current))
            current = [sentence]
        else:
            current.append(sentence)
    if current:
        chunks.append("\n".join(current))
    return chunks
```

这是教学实现，不是万能分词器。真正工程要覆盖一个句子本身超过预算的情况：按标点继续拆，最后才允许按 token 截断，并将 `oversized=true` 交质量门禁。绝不能静默丢掉尾部。

## 表格必须整体理解

“某权限下可以做什么”常常由第一行表头定义。把每行单独 embedding 会让“角色”与“动作”关系变成孤立词。一个实用策略是生成三种表示：完整表格摘要、带表头的行 chunk、结构化字段。行 chunk 仍携带表头和 section path，结构化字段用于精确过滤。

```python
def table_row_text(headers: list[str], row: list[str]) -> str:
    pairs = [f"{header}: {value}" for header, value in zip(headers, row, strict=False)]
    return "表格列定义：" + "；".join(pairs)
```

跨页表格要先检测重复表头并合并，不能把每一页看成独立表。合并失败应标记 warning，宁可降低召回信任，也不要生成看似完整的错误关系。

## 列表和代码的边界

列表项往往依赖父列表标题和前置说明。每个 item 可以单独检索，但应把父标题和列表级别作为 metadata；嵌套列表使用 `1.2` 等路径，避免排序丢失。代码块不要被普通文本的标点切割，语言、文件名、行号和相邻解释应保留。

```text
section: "部署 > 健康检查"
kind: code
language: python
line_start: 42
content: "..."
```

代码是证据还是示例也要区分。答案可以引用代码块来说明实现，但不能把注释中的“TODO”当成系统已经支持的事实。

## Parent context 与邻接上下文

大 chunk 召回成本高，小 chunk 缺上下文。常见折中是“小块排序 + 父标题/摘要补充 + 相邻块有限扩展”。扩展不能无上限，否则一个命中会把整篇文档塞进上下文。

```python
def expand_context(hit: ChunkRecord, by_id: dict[str, ChunkRecord], radius: int = 1) -> str:
    ordered = [hit]
    cursor = hit.previous_id
    for _ in range(radius):
        if not cursor or cursor not in by_id:
            break
        ordered.insert(0, by_id[cursor])
        cursor = by_id[cursor].previous_id
    cursor = hit.next_id
    for _ in range(radius):
        if not cursor or cursor not in by_id:
            break
        ordered.append(by_id[cursor])
        cursor = by_id[cursor].next_id
    return "\n\n".join(chunk.content for chunk in ordered)
```

相邻扩展必须检查同一文档版本、同一可见范围和同一 section；不能因为 chunk ID 相邻就跨越权限边界。引用展示可以只显示 hit，内部 prompt 使用扩展上下文，并记录实际进入 prompt 的 evidence ID 集合。

## 稳定 ID 与去重

随机 UUID 会让同一文档重建后无法比较差异，也让缓存命中率下降。稳定 ID 可以由 document、source version、source id、section path、ordinal 和内容 hash 组合：

```python
def stable_chunk_id(document_id: str, version_id: str, ordinal: int, content: str) -> str:
    raw = "|".join((document_id, version_id, str(ordinal), normalize(content)))
    return "chunk:" + hashlib.sha256(raw.encode()).hexdigest()[:32]
```

版本 ID 必须参与哈希：同一内容在新版本中的引用不应与旧版本混淆。`normalize` 只处理空白和 Unicode 规范化，不要删除会影响代码或标识符的字符。

## 可量化质量门禁

切片函数输出 `CoverageManifest`，在发布前检查：

| 门禁 | 目的 | 失败处理 |
| --- | --- | --- |
| no empty | 禁止空 chunk | 拒绝版本 |
| no duplicate | 防止重复召回污染排序 | 拒绝或合并并记录 |
| bounded tokens | 防止超预算 | 拒绝并定位 chunk |
| linked neighbors | 支持有限扩展 | 拒绝孤立链 |
| section preserved | 保留语义路径 | 拒绝缺标题的强制类型 |
| source coverage | 源内容被合理覆盖 | 告警或拒绝 |
| table integrity | 表头与行一致 | 拒绝损坏表 |

```python
def quality_errors(manifest: CoverageManifest) -> list[str]:
    errors = []
    if manifest.empty_chunks:
        errors.append(f"empty chunks: {manifest.empty_chunks}")
    if manifest.duplicate_chunks:
        errors.append(f"duplicate chunks: {manifest.duplicate_chunks}")
    if manifest.oversized_chunks:
        errors.append(f"oversized chunks: {manifest.oversized_chunks}")
    if manifest.orphan_links:
        errors.append(f"orphan links: {manifest.orphan_links}")
    if manifest.preservation_rate < 0.98:
        errors.append(f"preservation: {manifest.preservation_rate:.3f}")
    return errors
```

0.98 只是模拟门禁，真实值要根据文档集和业务风险标定。关键是门禁可重复、失败信息可定位，而不是选一个看起来漂亮的百分比。

## 反例驱动测试

```python
def test_heading_path_is_carried_to_child():
    chunks = build_chunks(markdown("# A\n## B\n正文"))
    assert chunks[0].section_path == ("A", "B")

def test_table_row_keeps_header():
    chunks = build_chunks(markdown("|角色|动作|\n|---|---|\n|审阅者|查看|"))
    assert "角色" in chunks[0].content

def test_oversized_code_block_is_reported():
    result = build_chunks(markdown("```python\n" + "x=1\n" * 500 + "```"))
    assert result.coverage.oversized_chunks

def test_neighbor_does_not_cross_version():
    assert expand_context(chunk_from_version("v2"), by_id) == chunk_v2_only
```

生产数据还要抽样人工审读：同一问题在标题、正文、表格和 OCR 页面中分别验证，记录“正确召回但错误上下文”和“没有召回”的样本。没有这一步，质量门禁只能证明数据结构完整，不能证明知识可用。

## 发布前的解释性报告

每个版本生成报告：源数、chunk 数、每类 chunk 数、字符/token 覆盖、表格和 OCR 页、重复率、异常 ID、与上一版本新增/删除/变化的比例。报告本身进入构建产物，便于评测发现“Recall 下降是因为切片变化，而不是模型变化”。

## 为什么不把 overlap 当作默认答案

固定 overlap 能缓解边界断句，但会重复 embedding、污染词法统计、让同一事实在 top K 中出现多次。更合理的做法是先按语义边界切割，只有在“跨块指代明显、段落超过预算、代码/表格需要连续上下文”时加有限 overlap，并在 metadata 中记录 overlap 来源。重排和引用显示仍以原始 chunk 为单位。

```python
def should_overlap(left: ParsedBlock, right: ParsedBlock) -> bool:
    if left.kind != right.kind:
        return False
    if left.kind in {"table", "code"}:
        return True
    return left.text.rstrip().endswith(("，", "、", ":", ","))
```

这个判断只是示例，真实阈值要由切片 fixture 和 recall 对照实验校准。重叠内容必须可追踪，否则无法解释为什么某个文档的索引体积突然翻倍。

## 切片的回归报告

每次切片器变更都对同一 fixture 输出 diff：新增/删除 chunk ID、section path 变化、token 分布、表格完整性、代码边界和 source coverage。把“切片器版本”写入 release manifest，评测失败时可以回答是解析变更还是检索变更。

```python
def chunk_diff(old: list[ChunkRecord], new: list[ChunkRecord]) -> dict[str, set[str]]:
    old_ids, new_ids = {item.id for item in old}, {item.id for item in new}
    return {"added": new_ids - old_ids, "removed": old_ids - new_ids}
```

不要只关注 chunk 数量。少量但更完整的 chunk 可能提升关系召回，数量变多也可能只是重复标题。报告应同时包含抽样问题的 Recall@K 和人工审读链接。

## 何时需要人工复核

以下情况自动门禁不足：跨页表格列错位、扫描图中低置信数字、复杂代码示例、同一标题多个版本、法律/合规内容的删除与替换。导入任务应把这些 warning 转为 review queue，而不是让“解析成功”直接激活。人工复核结果保存为 source version 的 metadata，下一次重建可以复用已确认的分段边界。

## 实施细节与失败路径

切片质量要在发布前抽样审阅，也要在检索后按查询反向评估。对标题、列表、表格、代码和跨页引用分别统计断裂率；遇到解析失败、OCR 噪声或文本过长时进入隔离队列。切片版本、解析器版本和元数据修订必须写入索引构建记录，避免用新切片解释旧评测结果。

实现时把关键不变量写成可执行约束：输入状态必须包含版本、权限和截止时间；节点输出必须能被序列化；外部副作用必须有幂等键和结果记录；终态必须同时写入业务状态与可重放事件。对每一条约束准备一个正常样例、一个边界样例和一个故障样例，并在 CI 中运行。

| 关注点 | 正常路径 | 故障路径 | 验收证据 |
| --- | --- | --- | --- |
| 数据版本 | 使用固定 release | 发布中途失败 | 回合可复现 |
| 权限范围 | 查询带范围快照 | 范围被撤销 | 越界证据为零 |
| 外部依赖 | 在 deadline 内完成 | 超时或限流 | 分类错误与重试记录 |
| 终态 | 答案、引用、事件一致 | Worker 崩溃 | 重放后状态一致 |

```text
请求 -> 持久化事实 -> 执行节点 -> 验证产物 -> 写入终态 -> 事件重放
```

## 参考资料

- [LangChain：Text splitters](https://python.langchain.com/docs/concepts/text_splitters/)：不同分割策略和递归分割的适用边界。
- [LlamaIndex：Node parsing](https://docs.llamaindex.ai/en/stable/module_guides/loading/node_parsers/)：文档节点、元数据和父子关系的公开实现思路。
- [PostgreSQL：Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)：结构化文本检索对 token 与文档表示的要求。
- [Web Platform Tests](https://github.com/web-platform-tests/wpt)：用可重复 fixture 验证解析与结构保真的测试方法。
