import pytest

from ai_agent_runtime.langgraph_basics import build_graph


@pytest.mark.parametrize(
    ("question", "intent", "status", "trace"),
    [
        (
            "如何申请远程访问",
            "search",
            "answer_ready",
            ["understand:search", "retrieve:1", "compose"],
        ),
        ("你好", "greeting", "answer_ready", ["understand:greeting"]),
        ("嗯", "unclear", "need_more_input", ["understand:unclear"]),
        (
            "没有收录的问题",
            "search",
            "no_evidence",
            ["understand:search", "retrieve:0", "no_evidence"],
        ),
    ],
)
def test_graph_paths(
    question: str,
    intent: str,
    status: str,
    trace: list[str],
) -> None:
    result = build_graph().invoke({"question": question, "trace": []})
    assert result["intent"] == intent
    assert result["status"] == status
    assert result["trace"] == trace
    assert result["answer"].strip()


def test_search_path_keeps_question_query_and_evidence() -> None:
    result = build_graph().invoke({"question": "如何申请远程访问", "trace": []})
    assert result["question"] == "如何申请远程访问"
    assert result["queries"] == ["如何申请远程访问"]
    assert result["evidence"] == ["证据 e-1：先提交访问申请，再等待负责人审批。"]
