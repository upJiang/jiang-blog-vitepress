---
title: "03｜文档解析、OCR 与内容保真"
description: "统一处理文本、HTML、PDF 和 Office 文档，并识别需要 OCR 的失败页面。"
category: agent-practice
tags: ["Ingestion", "OCR"]
updated: 2026-08-04
order: 30
depth: core
series: "生产级知识 Agent 实战"
---
# 03｜文档解析、OCR 与内容保真

知识 Agent 的上限经常由导入链路决定。解析阶段若丢掉表头、标题层级、页码和列表关系，后续换更强 embedding 或 LLM 也无法恢复。文档导入不是“提取一串 text”，而是把不同格式投影为可验证的中间表示，并为丢失、重复和 OCR 不确定性保留证据。

## 统一输入清单

一次导入先生成 DocumentManifest。它记录逻辑文档、来源、顺序、深度、内容类型、可见范围和内容哈希；解析器不直接写在线 chunk 表。

```python
class DocumentSource(BaseModel):
    source_id: str
    title: str
    content_type: str
    bytes_hash: str
    order: int
    depth: int = 0
    parent_source_id: str = ""
    visibility_subjects: tuple[str, ...] = ()

class DocumentManifest(BaseModel):
    document_id: str
    sources: list[DocumentSource]
    imported_at: datetime
```

`bytes_hash` 判断原始输入是否改变，解析后再计算规范化内容 hash。二者不能混用：解析器升级可能让相同源文件产生更好的结构，必须允许重建索引。

## 中间表示要保留结构

统一结构可以是带扩展 metadata 的 Markdown，但不能仅返回字符串。每个 block 保存类型、来源定位和顺序：

```python
class ParsedBlock(BaseModel):
    kind: Literal["heading", "paragraph", "list", "table", "code", "image_text"]
    text: str
    page: int | None = None
    section_path: tuple[str, ...] = ()
    source_locator: str = ""
    confidence: float | None = None

class ParsedDocument(BaseModel):
    blocks: list[ParsedBlock]
    warnings: list[str]
    source_format: str
```

页码不是装饰。PDF 引用需要定位到页；PPTX 需要幻灯片号；XLSX 需要工作表和区域。后续 chunk 合并时必须保留 locator 集合，不能只记合并后文本。

## 不同格式的真实难点

### 文本与 Markdown

先处理 BOM 和编码。服务端不能假设所有上传都是 UTF-8；可明确只接受 UTF-8 并给出错误，也可用可靠探测器后记录选择。Markdown 的 fenced code、表格、链接和标题要在语义解析前识别，避免按空行粗暴切开代码。

### HTML

HTML 解析要使用真正的 parser，删除脚本、样式和隐藏控制内容，再按 DOM 结构提取标题、段落、列表、表格和链接。不能用一个正则去标签；实体解码、错误嵌套与 `pre` 内容都会出错。外部 HTML 始终按不可信输入处理，资源 URL 仅作为 metadata，不在 Worker 中自动访问二次链接。

```python
from bs4 import BeautifulSoup

def parse_html(data: bytes) -> ParsedDocument:
    soup = BeautifulSoup(data, "html.parser")
    for node in soup(["script", "style", "template", "noscript"]):
        node.decompose()
    # 真实实现继续按元素类型输出 block，而不是 soup.get_text() 一把梭。
```

### DOCX 与 PPTX

Office 文档不是连续段落。DOCX 要保留 heading style、表格、列表级别与关系链接；PPTX 要按 slide 和 shape 顺序读取，同时避免把页脚模板在每页重复索引。文本框视觉顺序可能与 XML 顺序不同，解析器应记录限制并允许人工抽检。

### XLSX

工作表是二维数据。把每个 cell 拼成一长串会丢失字段关系。先修正合并单元格和矩形区域，生成 Markdown 表格或结构化字段；公式需要决定保存公式、缓存值还是两者。宏文件只读解析，不执行 VBA。

### PDF

PDF 存储绘制指令，不保证阅读顺序。文字版 PDF 也可能有多栏错序、页眉重复、连字符断词和字体映射问题。先按 page 提取 text block，做阅读顺序和重复页眉处理，再判定哪些页面需要 OCR。

## OCR 不是“文本为空就整本识别”

整本 OCR 成本高，也可能覆盖原本更准确的文字层。采用页级判定：页面字符数过低、可见图像占比高、提取结果出现大量替换字符或字形乱码时，标记 OCR candidate。

```python
def needs_ocr(text: str, image_area_ratio: float) -> bool:
    normalized = "".join(text.split())
    replacement_ratio = normalized.count("�") / max(len(normalized), 1)
    return (
        len(normalized) < 30
        or replacement_ratio > 0.05
        or (image_area_ratio > 0.8 and len(normalized) < 120)
    )
```

这些阈值必须用自己的文档集校准，不是标准常数。OCR 结果带模型名、版本、页号、置信度和图像 hash。低置信片段可以进入搜索候选，但回答校验应降低信任或要求更多证据。

## 页面替换而非尾部追加

混合 PDF 的常见 bug 是先提取全部文本，再把 OCR 结果附到文末。这样同一页既有错误文字又有正确 OCR，且引用定位错乱。正确做法是按 page 建块，对指定页替换或并排保留两个版本，并明确选择策略。

```python
def replace_page(blocks: list[ParsedBlock], page: int, ocr_text: str) -> list[ParsedBlock]:
    kept = [block for block in blocks if block.page != page]
    kept.append(ParsedBlock(
        kind="image_text",
        text=ocr_text,
        page=page,
        source_locator=f"page:{page}",
    ))
    return sorted(kept, key=lambda block: (block.page or 0, block.source_locator))
```

## 外部内容的安全处理

解析 Worker 面对的是攻击面：压缩炸弹、超大页数、恶意 XML、路径穿越文件名、公式注入、嵌入对象和 prompt injection 文本。至少执行：

- 在读取前限制文件大小、页数、展开大小和处理时长；
- 解析库运行在无特权容器，禁止访问云 metadata 和内网；
- 文件名仅作展示，存储键由服务端生成；
- Office 宏不执行，外部关系不自动抓取；
- 原始文件和解析结果做病毒/内容策略扫描；
- 文档内“忽略系统指令”等文字标记为不可信数据，不触发工具。

解析成功也不代表可以发布。所有内容先进入 building version，经过切片、向量和质量门禁后再原子激活。

## 内容保真清单

为每次解析计算 CoverageManifest：

| 指标 | 含义 | 典型失败 |
| --- | --- | --- |
| source characters | 规范化源文本字符数 | 编码或 parser 丢内容 |
| indexed characters | 进入候选 chunk 的字符数 | 切片遗漏尾段 |
| preservation rate | 去重后内容保留比例 | 表格/列表未处理 |
| tables found/indexed | 表格保留数 | XLSX 或 HTML 表格丢失 |
| pages OCRed | OCR 页集合 | 扫描页未识别或过度 OCR |
| warnings | 可审计异常 | 公式、图片、字体问题 |

保留率不能简单用 `indexed/source`，因为标题父链被复制进多个 chunk 后可能超过 100%。应在规范化语义单元层计算覆盖，再单独统计重复。

## 测试

建立小而有攻击性的 fixture 集，而不是只测一个漂亮 PDF：

```python
@pytest.mark.parametrize("fixture, expected", [
    ("two-column.pdf", {"pages": 2, "ocr": []}),
    ("mixed-scan.pdf", {"pages": 3, "ocr": [2]}),
    ("merged-cells.xlsx", {"tables": 1}),
    ("heading-table.docx", {"headings": 2, "tables": 1}),
])
def test_parser_preserves_structure(fixture, expected):
    parsed = parse_fixture(fixture)
    assert_structure(parsed, expected)
```

此外覆盖损坏文件、加密 PDF、零字节文件、超大图片、重复页眉、跨页表格、HTML 中的恶意脚本、宏工作簿。测试断言不要只写“结果非空”，要检查页码、标题路径、表头、警告和 OCR 替换位置。

## 参考资料

- [PDF 2.0 specification](https://pdfa.org/resource/iso-32000-pdf/)：PDF 页面内容模型与规范入口。
- [Office Open XML overview](https://learn.microsoft.com/en-us/office/open-xml/open-xml-sdk)：DOCX、XLSX、PPTX 包结构与处理模型。
- [Beautiful Soup documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)：基于解析树处理错误 HTML 的 API。
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)：上传文件的类型、存储、隔离和限制原则。

