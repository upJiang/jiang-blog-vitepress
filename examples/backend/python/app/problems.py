from dataclasses import dataclass
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


@dataclass(slots=True)
class ApiProblem(Exception):
    status: int
    code: str
    detail: str
    fields: list[dict[str, Any]] | None = None


async def problem_handler(request: Request, error: ApiProblem) -> JSONResponse:
    request_id = request.state.request_id
    payload: dict[str, Any] = {
        "status": error.status,
        "code": error.code,
        "detail": error.detail,
        "requestId": request_id,
    }
    if error.fields:
        payload["fields"] = error.fields
    return JSONResponse(payload, status_code=error.status, media_type="application/problem+json")
