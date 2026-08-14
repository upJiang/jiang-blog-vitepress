from __future__ import annotations

import operator
from collections.abc import Callable, Sequence
from typing import Annotated, Literal, TypedDict

from langgraph.graph import END, START, StateGraph

Intent = Literal["search", "greeting", "unclear"]
RunStatus = Literal[
    "running",
    "answer_ready",
    "need_more_input",
    "no_evidence",
]
Retriever = Callable[[Sequence[str]], list[str]]


class AgentState(TypedDict, total=False):
    question: str
    intent: Intent
    queries: list[str]
    evidence: list[str]
    answer: str
    status: RunStatus
    trace: Annotated[list[str], operator.add]


def understand(question: str) -> tuple[Intent, list[str]]:
    text = question.strip()
    if text.casefold() in {"你好", "hello"}:
        return "greeting", []
    if len(text) < 4:
        return "unclear", []
    return "search", [text]


def fixture_retriever(queries: Sequence[str]) -> list[str]:
    """Deterministic test data; it does not prove a real search integration."""

    if queries and queries[0] == "如何申请远程访问":
        return ["证据 e-1：先提交访问申请，再等待负责人审批。"]
    return []


def build_graph(retriever: Retriever = fixture_retriever):
    def understand_node(state: AgentState) -> dict[str, object]:
        intent, queries = understand(state["question"])
        if intent == "greeting":
            return {
                "intent": intent,
                "answer": "你好，需要查询什么资料？",
                "status": "answer_ready",
                "trace": ["understand:greeting"],
            }
        if intent == "unclear":
            return {
                "intent": intent,
                "answer": "请补充要查询的资料主题。",
                "status": "need_more_input",
                "trace": ["understand:unclear"],
            }
        return {
            "intent": intent,
            "queries": queries,
            "status": "running",
            "trace": ["understand:search"],
        }

    def retrieve_node(state: AgentState) -> dict[str, object]:
        evidence = retriever(state["queries"])
        return {"evidence": evidence, "trace": [f"retrieve:{len(evidence)}"]}

    def compose_node(state: AgentState) -> dict[str, object]:
        answer = f"问题：{state['question']}\n依据：{'；'.join(state['evidence'])}"
        return {
            "answer": answer,
            "status": "answer_ready",
            "trace": ["compose"],
        }

    def no_evidence_node(_state: AgentState) -> dict[str, object]:
        return {
            "answer": "当前可见资料中没有找到足够依据。",
            "status": "no_evidence",
            "trace": ["no_evidence"],
        }

    def route_after_understand(state: AgentState) -> Intent:
        return state["intent"]

    def route_after_retrieve(state: AgentState) -> Literal["compose", "no_evidence"]:
        return "compose" if any(item.strip() for item in state["evidence"]) else "no_evidence"

    builder = StateGraph(AgentState)
    builder.add_node("understand", understand_node)
    builder.add_node("retrieve", retrieve_node)
    builder.add_node("compose", compose_node)
    builder.add_node("no_evidence", no_evidence_node)
    builder.add_edge(START, "understand")
    builder.add_conditional_edges(
        "understand",
        route_after_understand,
        {"search": "retrieve", "greeting": END, "unclear": END},
    )
    builder.add_conditional_edges(
        "retrieve",
        route_after_retrieve,
        {"compose": "compose", "no_evidence": "no_evidence"},
    )
    builder.add_edge("compose", END)
    builder.add_edge("no_evidence", END)
    return builder.compile()


def main() -> None:
    app = build_graph()
    for question in ["如何申请远程访问", "你好", "嗯", "没有收录的问题"]:
        result = app.invoke({"question": question, "trace": []})
        print(question, "=>", result["status"], result["trace"])


if __name__ == "__main__":
    main()
