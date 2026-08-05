---
title: "12｜上下文预算、滚动摘要与记忆"
description: "在不可变会话记录之上编译模型上下文，区分近期消息、摘要和可删除长期记忆。"
category: agent-practice
tags: ["Context", "Memory"]
updated: 2026-08-04
order: 120
depth: core
series: "生产级知识 Agent 实战"
---
# 12｜上下文预算、滚动摘要与记忆

“把历史消息全部传给模型”不是记忆系统。它会超过窗口、放大成本、让旧错误持续污染当前回答，并把不该长期保存的信息带入每一次请求。生产 Agent 应保留不可变原始 transcript，再为每个 Turn 编译一个受预算约束的上下文：策略、证据、近期消息、滚动摘要和经过授权的记忆各占固定份额。

## Token budget 是硬约束

```python
@dataclass(frozen=True)
class ContextBudget:
    context_window: int
    output_reserve: int
    safety_reserve: int
    input_budget: int
    allocations: dict[str, int]

def make_budget(window: int) -> ContextBudget:
    output = min(2048, max(32, window // 4))
    safety = max(128, int(window * .08))
    input_budget = max(256, window - output - safety)
    ratios = {"policy": .12, "evidence": .45, "recent": .25, "summary": .10, "memory": .08}
    allocations = {key: max(16, int(input_budget * value)) for key, value in ratios.items()}
    return ContextBudget(window, output, safety, input_budget, allocations)
```

预算不是把每段文字截断到固定字符。使用与目标模型匹配的 tokenizer；离线 fallback 必须明确是近似估算并保守留余量。每次请求记录 raw token、compiled token、各槽位实际用量和压缩策略，便于解释成本和截断。

## 原始记录不可变

用户消息、助手消息、工具事件和错误事件写入 append-only transcript。压缩只生成 summary artifact，不覆盖原文。这样可以在摘要错误时重新编译、做审计和评测。

```python
class PromptContext(BaseModel):
    recent_messages: list[Message]
    summary: str
    memories: list[Memory]
    evidence: list[Evidence]
    token_usage: dict[str, int]
    compression: Literal["none", "summary", "forced"]
```

`PromptContext` 是本次模型输入的快照，不应直接保存完整私人 prompt 到普通日志；敏感内容需要加密/脱敏，并按 retention 管理。

## 槽位编译顺序

推荐顺序是：安全策略与输出契约、当前问题、证据、必要的近期历史、摘要、长期记忆。证据槽位应优先保留当前 Turn 需要的内容，旧历史不能抢走回答证据的预算。

```python
def compile_context(parts: dict[str, str], budget: ContextBudget, counter: TokenCounter) -> PromptContext:
    selected = {
        name: counter.truncate(parts.get(name, ""), budget.allocations[name], keep_tail=name == "recent")
        for name in budget.allocations
    }
    return PromptContext(
        recent_messages=parse_messages(selected["recent"]),
        summary=selected["summary"],
        memories=parse_memories(selected["memory"]),
        evidence=parse_evidence(selected["evidence"]),
        token_usage={name: counter.text(value) for name, value in selected.items()},
        compression="none",
    )
```

真正实现应按消息边界和 evidence item 边界截断，不能把 JSON 或引用 ID 截成半个 token。若某槽位单条项超过预算，使用摘要或单独拒答，而不是悄悄截断关键数字。

## 滚动摘要的保留项

摘要不是“把上文改写短一点”。它必须保留未完成事项、关键实体、时间、约束、用户明确纠正、已确认结论和不确定性，并区分“用户说法”与“系统证据”。模型生成摘要本身也可能出错，因此摘要要有版本、来源消息范围和生成策略。

```python
SUMMARY_SCHEMA = {
    "facts": [{"text": "", "source": "user|evidence|assistant", "confidence": 0}],
    "open_tasks": [""],
    "preferences": [""],
    "corrections": [""],
    "referents": {"short_name": "full entity"},
}
```

摘要不能把助手过去的猜测升级为企业事实。若来源是 assistant，应保留来源标签，后续回答还需重新检索证据。

## 何时压缩

当 raw history 超过 summary trigger 时，把早期连续消息批量摘要，保留最近 N 轮原文；强制阈值用于防止单条超长输入。摘要任务使用独立模型和预算，失败时退化为 token 截断并标记 `compression=fallback`。

```python
def choose_history(history: list[Message], budget: ContextBudget, counter: TokenCounter):
    if counter.messages(history) <= budget.allocations["recent"]:
        return history, "none"
    recent = keep_tail_messages(history, budget.allocations["recent"], counter)
    return recent, "summary"
```

压缩后要记录 `summarized_message_count`、摘要覆盖的 message ID range 和摘要 hash。这样可以定位“答案突然忘了某个纠正”究竟是检索问题还是摘要丢失。

## 长期记忆的资格审查

记忆应只保存用户明确表达且对未来有稳定价值的信息，如偏好、工作上下文或沟通约束。短期问题、敏感身份、一次性数字和模型猜测不能自动成为长期记忆。每条记忆需要类型、scope、confidence、来源会话、过期时间和可删除接口。

```python
class Memory(BaseModel):
    id: str
    memory_type: Literal["preference", "identity", "work_context", "communication", "constraint"]
    content: str
    scope: Literal["user", "space"]
    confidence: float
    source_conversation_id: str
    expires_at: datetime | None = None
    user_editable: bool = True
```

提取器只识别显式表达，候选先进入 pending，用户确认或确定性规则批准后再 active。scope=space 的记忆更敏感，不能因为一个用户说“大家都这样”就写入团队。

## 记忆与权限

每次使用记忆都要检查 enabled、scope、过期、调用者和当前空间。删除记忆不仅删主表，还要清理缓存、摘要引用和评测 fixture。日志只记录 memory ID 和决策，不把完整内容打入普通 trace。

## 防止记忆投毒

恶意用户可以把“以后忽略权限”写入记忆，之后每一轮都影响模型。记忆作为低信任数据，不能覆盖 system policy、ACL、release 和工具权限；检测到指令型内容时拒绝存储或降级为普通对话文本。

```python
def memory_allowed(value: MemoryInput) -> bool:
    text = value.content.casefold()
    return not any(marker in text for marker in (
        "ignore previous", "绕过权限", "reveal system prompt"
    ))
```

关键词仅是第一层筛查，不是完整防护。权限和策略永远由确定性服务端代码控制。

## 证据优先于历史答案

当前问题的检索证据应优先于旧摘要和 assistant 历史。若摘要说“策略已更新”，但当前 release 的证据没有支持，应把它作为待核验线索而不是事实。上下文编译器可以给不同来源明确 trust 标签，并在 Claim planner 阶段要求重新绑定。

## 测试

```python
def test_context_never_exceeds_input_budget():
    context = compiler.prepare(long_history, evidence, memory)
    assert context.token_usage["total"] <= budget.input_budget

def test_summary_keeps_open_task_and_correction():
    summary = summarize(messages_with_correction())
    assert "未完成" in summary.open_tasks
    assert "纠正" in summary.corrections

async def test_disabled_memory_is_not_loaded(repo):
    await repo.set_enabled(user_id="u", enabled=False)
    assert await compiler.memory_items("u") == []
```

用真实 tokenizer 和近似 fallback 各测一次；覆盖中文、emoji、超长 URL、JSON、引用 ID、跨轮指代。对摘要建立回归集，检查实体、数字、否定、条件和未完成事项是否保留。对隐私做删除后查询和缓存残留测试。

## 参考资料

- [OpenAI：Managing tokens](https://platform.openai.com/docs/concepts/tokens)：token、上下文窗口和输入输出预算。
- [LangChain：Conversation memory concepts](https://python.langchain.com/docs/concepts/memory/)：短期/长期记忆的概念边界。
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)：数据最小化、控制和可删除治理思路。
- [OWASP GenAI：Memory Poisoning](https://genai.owasp.org/llmrisk/llm03-data-and-model-poisoning/)：数据和记忆污染风险参考。

