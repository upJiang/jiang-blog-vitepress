from __future__ import annotations

import os
from typing import Protocol


class ResponsesClient(Protocol):
    def create(self, **kwargs: object) -> object: ...


def create_response(client: ResponsesClient, question: str) -> object:
    model = os.environ.get("OPENAI_MODEL", "").strip()
    if not model:
        raise RuntimeError("OPENAI_MODEL_is_missing")
    return client.create(
        model=model,
        instructions="缺少资料时明确说明，不要猜测。",
        input=question,
    )


def main() -> None:
    from openai import OpenAI

    response = create_response(OpenAI().responses, "用一句话解释什么是 Agent 循环。")
    print(response.output_text)
    print(response.status)
    print(response.usage)


if __name__ == "__main__":
    main()
