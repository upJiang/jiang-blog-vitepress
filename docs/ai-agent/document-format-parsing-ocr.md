---
title: PDF、Word、PPT、Excel、HTML 与 Markdown 怎样解析入库
description: 逐种文件拆开原生文本、版面结构、表格、图片、扫描页与 OCR，最后统一成可追溯的 Block。
category: ai-agent
part: RAG 知识工程
chapter: 44
tags:
  - Document Parsing
  - OCR
  - Block
prerequisites:
  - 知道文件和文本的区别
  - 了解 RAG 数据导入流程
outcomes:
  - 为不同文件选择解析器与 OCR 条件
  - 检查解析覆盖率和原文定位
practice:
  type: diagnosis
  result: 完成一张多格式文档解析决策表
  verify:
    - 扫描 PDF 不会被当成空文档
    - 表格和标题层级可以追溯
evidence: anonymized-practice
updated: 2026-08-07T00:00:00.000Z
lastUpdated: false
---
# PDF、Word、PPT、Excel、HTML 与 Markdown 怎样解析入库

## 文档解析在 RAG 中的位置

**文档解析**是把 PDF、Word、PPT、Excel、HTML 或 Markdown 中的文字、表格、图片和版面结构，转换成程序能够处理且可以回到原文定位的数据。它位于文件准入检查之后、切片与 Embedding 之前，用来为检索、引用和后续质量校验准备可靠输入。

这里最先要确认的不是向量模型，而是文件里的信息有没有被正确读出来。一份扫描 PDF 如果被普通文本解析器读成空字符串，后面再好的 Embedding 也检索不到；**Excel** 如果丢掉表头，单独的“5 秒”或“生产”就失去含义。

下面把常见格式逐个拆开，最后统一成带来源位置和结构信息的 `Block`。重点是判断何时使用原生解析、何时触发 **OCR**，怎样保存表格和幻灯片的上下文，以及解析失败时为什么要关闭导入版本。

## 文档导入状态机

```mermaid
flowchart LR
  F[上传文件与 MIME] --> G[文件准入和安全检查]
  G --> P[原生解析并保留结构]
  P --> Q{内容覆盖率足够吗}
  Q -->|是| B[统一成 Block]
  Q -->|否| O[渲染缺失页并 OCR]
  O --> R{OCR 有可验证文本吗}
  R -->|是| B
  R -->|否| E[失败并标记原因]
  B --> C[切片、向量化和质量校验]
  C --> A[候选版本等待激活]

  classDef input fill:#DDF8F2,stroke:#0F766E,color:#134E4A;
  classDef program fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A;
  classDef tool fill:#FFEDD5,stroke:#EA580C,color:#7C2D12;
  classDef data fill:#FEF3C7,stroke:#CA8A04,color:#713F12;
  classDef success fill:#DCFCE7,stroke:#16A34A,color:#14532D;
  classDef failure fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D;
  class F input;
  class G,P,Q,R program;
  class O tool;
  class B,C data;
  class A success;
  class E failure;
```

文件先经过扩展名、MIME、大小、压缩炸弹和恶意内容检查。原生解析得到 Block 后要计算**覆盖率**，例如页数、非空文本页、表格数量和图片页。只有缺失内容才进入 OCR；OCR 仍为空、置信度过低或页数超限时，状态进入失败，不发布半成品。

## 统一 Block 保留文档结构

切片和向量化需要文本，但回答和引用需要知道文本来自哪一页、哪一节、哪一行。可以先建立这样一个公开最小模型：

```python
# Block 保留结构类型、标题路径、页码和位置信息，后续切片不需要重新猜文档结构。
from dataclasses import dataclass, field
from typing import Literal

@dataclass(frozen=True)
class Source:
    # file_id 与结构路径共同定位来源；文件改名时仍可通过稳定 ID 追踪。
    file_id: str
    path: tuple[str, ...]
    # 不同格式使用页码、幻灯片号或工作表名，未适用的定位字段保持为空。
    page: int | None = None
    slide: int | None = None
    sheet: str | None = None

@dataclass(frozen=True)
class Block:
    # Block 使用稳定 ID 和 kind 保存结构单元，正文不再是无法定位的一整段字符串。
    block_id: str
    kind: Literal["paragraph", "heading", "list", "table", "code", "slide", "sheet"]
    text: str
    source: Source
    order: int
    parent_id: str | None = None
    metadata: dict[str, str | int | bool] = field(default_factory=dict)
```

解析器执行后，每识别出一个标题、段落、表格或代码单元，就输出一个 `Block`。`block_id` 是当前原文单元的稳定标识；`kind` 告诉后续切片器采用哪种处理规则；`text` 是用于搜索的规范化文字；`source` 保留文件和页面位置；`path` 保存标题层级或工作表上下文；`order` 保证同一文件内的先后关系；`parent_id` 把表格行、幻灯片元素等子单元连回父级；`metadata` 保存解析器版本、语言和 OCR 标记等可筛选字段。

这个类型只是解析阶段的输出契约，不负责读取 **PDF**，也不直接生成向量。输入仍是解析器从文件中识别出的原始对象，后续切片器消费 `Block[]`。如果 `page`、`slide` 和 `sheet` 都为空，或者 `text` 有内容却无法回到原文，应该把它判为定位失败，而不是继续写入向量库。

这个模型没有把原始文件丢掉。生产系统还要保存原文件校验和、解析器版本、渲染页图像位置和原始坐标，以便用户点击引用时重新定位。

## 按文档结构选择解析器

没有一个解析库能等质量处理全部格式。下面列的是常见起点，不代表它们会自动解决版面、OCR 和引用定位：

| 格式 | 常见公开库 | 能直接取得 | 仍需自己处理 |
| --- | --- | --- | --- |
| PDF | PyMuPDF、pypdf | 页面文字、部分坐标或对象 | 阅读顺序、复杂表格、扫描页 |
| DOCX | python-docx | 段落、样式、表格 | 修订、复杂编号、文本框 |
| **PPT**X | python-pptx | 幻灯片、占位符、形状文字 | 视觉阅读顺序、图片内容、图表语义 |
| XLSX | openpyxl | Sheet、单元格、公式和缓存值 | 表头识别、合并语义、超大文件策略 |
| HTML | lxml、Beautiful Soup | DOM、属性和文本节点 | 正文抽取、模板噪声、渲染后内容 |
| Markdown | markdown-it-py 等 AST 解析器 | 标题、围栏、列表、表格 Token | 方言扩展、链接目标和自定义容器 |

选库前先写出需要保留的结构和失败语义。若需求是复杂 PDF 表格，能提取普通文字不代表符合目标；若 HTML 依赖 JavaScript 渲染，静态 DOM 解析器拿不到最终正文，需要浏览器渲染作为另一条受控采集路径。

下面给出一个适配器路由骨架。运行时需要先用 `uv add pydantic` 安装 Pydantic；具体 PDF/DOCX 库由各 Adapter 自己依赖。输入是经过文件签名探测得到的可信 MIME，而不是用户填写的扩展名；输出是统一 `ParseResult`。代码故意没有实现第三方库细节，因为每个 Adapter 的结构提取会在后面的格式章节独立测试。

```python
# 调度器根据已验证的内容类型选择解析器，并把不支持、损坏和需 OCR 分成不同结果。
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

@dataclass(frozen=True)
class ParseResult:
    blocks: tuple[Block, ...]
    parser_name: str
    parser_version: str
    warnings: tuple[str, ...] = ()

class ParserAdapter(Protocol):
    def parse(self, file_path: Path) -> ParseResult: ...

class ParserRegistry:
    def __init__(self, adapters: dict[str, ParserAdapter]) -> None:
        self._adapters = adapters

    def parse(self, file_path: Path, *, detected_mime: str) -> ParseResult:
        # 根据已检测 MIME 从注册表取适配器，文件扩展名不参与可信类型判断。
        adapter = self._adapters.get(detected_mime)
        if adapter is None:
            raise ValueError(f"unsupported MIME: {detected_mime}")
        # 调用具体解析器得到统一 ParseResult，后续校验与格式实现解耦。
        result = adapter.parse(file_path)
        if not result.blocks:
            raise RuntimeError("parser returned no blocks")
        # 逐个拒绝空正文 Block，避免无内容片段占用向量和检索结果。
        if any(not block.text.strip() for block in result.blocks):
            raise RuntimeError("parser returned an empty block")
        return result
```

`ParserAdapter` 规定每种解析器必须接收隔离文件路径并返回同一契约；`ParserRegistry` 只根据文件签名探测后的 MIME 选 Adapter，不信任后缀。调用 `adapter.parse` 后，注册表做跨格式共同门禁：零 Block 和空 Block 都失败。`ParseResult.warnings` 用于保存“第 8 页表格置信度低”等可审计问题，调用方再按策略决定失败或人工复核。

完整调用顺序是“流式保存文件 -> 签名探测 MIME -> Registry 选 Adapter -> Adapter 输出 Block -> 共同门禁 -> 覆盖率检查”。未知 MIME 抛出永久输入错误；第三方库超时、进程崩溃和损坏文件应由外层转换为稳定错误码。Adapter 不能自行激活知识版本，也不能访问当前用户范围之外的数据。

## PDF：先判定文本层是否存在

PDF 有两种完全不同的形态：

- 原生 PDF：页面里有字符对象，可以提取文字、字体和坐标；
- 扫描 PDF：页面本质是图片，文本提取可能为空或只有少量页眉。

不要根据扩展名直接选择 OCR。先对每页提取文字并统计字符数、空白页比例和异常编码。如果正文页都为空，才渲染缺失页交给 OCR。只对缺失页 OCR 可以节省成本，也减少 OCR 把原生数字识别错的机会。

表格 PDF 比普通段落更难：文字在二维坐标上排列，简单按字符顺序拼接会把列混在一起。解析器应先识别行列或表格区域，保存表头和单元格位置；如果无法可靠识别，要把表格标成低置信度，不应假装得到精确行列。

OCR 结果必须带页码、模型版本和置信度。低置信度的金额、版本号和权限值不能直接成为答案证据，可以要求人工复核或在回答中标记不确定。

## Word：段落样式和表格是语义

**Word** 文档的标题通常通过样式表示，而不是只靠字号。解析时要保留 Heading 1/2/3 的层级，把后续段落挂到当前标题路径。列表要保留顺序和编号语义，不能把“1.”、“2.” 删除成普通句子。

表格需要至少保存表头、行号和单元格文本。把整张表拼成一段长字符串会导致检索命中一行，却无法回答该值属于哪个字段。常见做法是为每行生成一份带表头的文本，例如：

```text
表：环境参数
环境=生产 | 灰度比例=10% | 负责人=张三
```

原始表格仍要保留为结构化字段，文本只是用于召回和生成。合并单元格、隐藏行、批注和修订记录需要在解析策略中明确是否纳入，不能默认当成正文。

## PPT：一页是一个版面上下文

幻灯片的阅读顺序不一定等于文件对象顺序。标题、正文框、图表、备注和图片需要分别解析，再按照版面坐标或占位符语义组合。每个 Block 至少记录 slide number 和标题路径。

一张图里只有“架构”两个字，正文却在图片中，这种页面需要 OCR 或图像理解。图片中的文字、图例和箭头关系不应被当成普通段落；如果只提取标题，检索会返回“架构”但无法解释图中组件。

演讲者备注是否导入取决于知识范围。备注可能是讲稿，不一定是面向读者的事实。导入时将 `notes` 标记为独立 kind，并在检索过滤中决定是否可见。

## Excel：表头、工作表和公式结果

Excel 至少要保留工作表名、表头行、行号和单元格坐标。单独向量化一行数字几乎没有意义，必须把表头上下文拼进 embedding text，同时保留结构化字段用于精确过滤。

公式有两个值：公式本身和上次计算结果。知识问答通常需要结果，但排障时可能需要公式。两者都保存，并记录文件最后计算时间。空单元格、合并单元格和隐藏列不能悄悄删除，因为它们可能改变表格语义。

一个稳定的表格 Block 可以长这样：

```text
sheet=容量规划
row=18
headers=环境 | 并发 | 延迟目标
values=预发 | 20 | 2s
cellRange=A18:C18
```

查询“预发并发是多少”时，精确通道可以按 `sheet`、`headers` 和 `values` 找到行；向量通道则处理用户说“测试环境同时处理多少请求”这类表达。两条通道返回同一个 row ID，引用才能落到稳定位置。

## HTML 与 Markdown：语法本身就是结构

HTML 解析要区分正文、导航、页脚、隐藏内容、脚本和结构化数据。不能把整个 `innerText` 当作正文，否则导航链接和 Cookie 提示会污染向量。需要保存最终 URL、Canonical、标题层级和抓取时间。

Markdown 的标题、列表、代码围栏、表格和链接都是可用结构。代码块通常需要独立 `kind=code`，保留语言标记；把代码和解释拼在同一向量片段里，会让“如何配置”问题召回解释段，却丢掉命令细节。

## OCR 的触发和关闭条件

OCR 是一个有成本和错误率的外部步骤，不能作为“解析失败就无限重试”的万能后备。建议为每份文件记录：

| 字段 | 作用 |
| --- | --- |
| `required_pages` | 哪些页缺少文本层 |
| `max_pages` | 单次最多允许 OCR 的页数 |
| `language` | 识别语言，影响字符结果 |
| `model_version` | 结果可复现和回滚 |
| `confidence` | 判断是否需要人工复核 |
| `render_hash` | 确认 OCR 输入图像没有变化 |
| `error` | 失败原因，不用空文本伪装成功 |

当 OCR 超过页数、服务超时或返回空结果时，导入状态应明确失败。系统可以保留旧的已发布版本，等待重试或人工处理；不应该激活“部分页面成功”的候选版本。

## 解析覆盖率怎样验证

用文件级和 Block 级两层检查：

```text
文件级：页数/幻灯片数/工作表数是否与解析记录一致
页面级：非空文本页、OCR 页、失败页数量是否匹配
结构级：标题路径、表格、代码和列表是否保留
定位级：每个 Block 能否回到页码、slide、sheet 或路径
内容级：抽样原文与 Block 文本，确认金额、版本号、否定词没有丢失
```

不要用“Block 数大于 0”作为成功条件。一个只提取出每页页码的扫描 PDF 也会有 Block，但没有可回答内容。覆盖率应记录缺口，并进入候选版本审核。

## 解析器选择表

| 文件 | 首选步骤 | 需要额外处理 | 最常见的静默错误 |
| --- | --- | --- | --- |
| 原生 PDF | 文本和坐标提取 | 表格区域识别 | 列顺序错乱 |
| 扫描 PDF | 渲染后 OCR | 置信度与人工复核 | 返回空页或数字错 |
| Word | 样式、段落、表格 | 修订、批注和合并单元格 | 标题层级丢失 |
| PPT | 占位符、坐标、备注 | 图片 OCR、图表语义 | 版面顺序错 |
| Excel | sheet、表头、行列 | 公式结果和隐藏列 | 数值失去字段上下文 |
| HTML | 正文 DOM、标题、链接 | 模板噪声、渲染差异 | 导航和隐藏文字污染 |
| Markdown | AST 和围栏 | 链接、表格、代码语言 | 代码与正文被拼平 |

选择解析器时先看目标问题。如果系统只回答原文段落，PDF 文本提取可能够用；如果要回答表格数值，二维结构和精确字段更重要；如果要审查图片里的流程图，必须纳入 OCR 或图像理解，并把结果标记为不同证据等级。

## 失败处理和版本发布

每次导入都生成候选版本。解析、OCR、切片、Embedding 和索引必须在候选版本内完成，所有质量门禁通过后再激活。激活前仍保留上一版本，避免用户在新文件解析失败时看到半套数据。

失败记录至少包含文件 ID、阶段、页码或 sheet、解析器版本、错误类型和重试建议。可重试的网络错误与不可重试的损坏文件不能共用一个“导入失败”字符串。

## 解析检查表怎样发现内容覆盖缺口

```text
[ ] 文件扩展名、MIME、大小和安全准入已检查
[ ] PDF 已区分原生文本与扫描页
[ ] OCR 只处理缺失页，并有页数、语言和置信度限制
[ ] Word 标题、列表、表格和代码没有被抹平
[ ] PPT 保存 slide 与版面上下文，图片文字有单独证据等级
[ ] Excel 保存 sheet、表头、行号、坐标和公式结果
[ ] HTML 去掉模板噪声，Markdown 保留 AST 结构
[ ] 每个 Block 都有稳定 ID 和原文位置
[ ] 覆盖率、重复、空内容和定位检查在激活前执行
[ ] 任何失败都保留旧版本，不把部分结果发布成新版本
```

这份检查表最终产出的是“文件到 Block”的判断方法。Block 既保留可搜索文本，也保留结构、位置、证据等级和解析器版本，后续切片无需重新猜测原文版面。


**为什么不能把 PDF、Word 和 PPT 都直接转成纯文本？**

纯文本会丢失标题层级、页码、表格坐标、幻灯片版面、列表关系和代码边界。检索虽然还能找到若干词，却无法回答某个数值属于哪一列，也难以生成可回查引用。**统一 Block** 的目的不是强迫所有格式相同，而是用共同字段保存内容、结构类型、标题路径、源位置和证据等级，同时允许格式特有元数据。后续切片与引用都建立在这些结构上。

**怎样判断 PDF 需要 OCR，而不是原生文本提取？**

按页检查文本层覆盖、字符数量、可打印比例、坐标合理性和重复乱码，而不是看到整个文件文本少就全量 OCR。原生页优先使用文本与坐标，扫描页才渲染图片进入 OCR；混合 PDF 可以逐页选择。OCR 后比较页数、块数、置信度和关键数字，并保留“机器识别”证据等级。扫描器不可用或覆盖率过低时失败关闭，不能把空页发布成完整文档。

**Word 的样式名称不规范时，标题层级怎么恢复？**

先使用显式 heading style 和大纲级别，再结合字号、粗细、段前后间距与编号模式作为候选，不能单凭“字体大”就认定标题。恢复结果要保留置信度与原段落位置；层级跳跃或大量冲突进入质量检查。表格、列表和代码样式独立处理，避免它们被错误提升为标题。对一组代表文档做人工抽样，比为所有文件写死某个字号规则更可靠。

**PPT 中文本框的坐标为什么重要？**

幻灯片阅读顺序往往由版面决定，单纯按 XML 节点顺序可能先读页脚、再读右栏、最后读标题。保存页码、占位符类型、边界框和分组关系后，可以按标题、主内容、侧栏和备注组织 Block；图表和图片 OCR 也能绑定到对应区域。坐标不是为了还原设计稿，而是保留“哪些文字属于同一视觉单元”的语义，避免检索片段把不相关区域拼在一起。

**Excel 为什么必须把表头带进每一行或区域？**

单独的数值“20”没有意义，必须知道它对应哪个 sheet、列名、行键、单位和时间。解析器要识别多行表头、合并单元格、隐藏列和公式结果，生成包含坐标与表头路径的 Block。大型工作表可以按逻辑区域和行批次切分，但每个片段都重复必要表头。公式文本与计算结果最好分开保存，避免把陈旧缓存值当成实时计算事实。

**OCR 置信度低时可以让模型自动修正吗？**

模型可以提供候选，但不能无证据地覆盖原识别结果，尤其是金额、版本号和编号。低置信度 Block 应保存页码、区域、原图引用和识别置信度，按风险选择人工复核、再次 OCR 或拒绝发布。答案阶段也可降低其证据等级。验证时使用含表格、数字和混合语言的样本，比较字符与字段准确率；只看“读起来通顺”会掩盖关键数字被改错。
