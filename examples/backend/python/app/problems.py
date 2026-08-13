from dataclasses import dataclass
from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
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


async def validation_handler(request: Request, error: RequestValidationError) -> JSONResponse:
    fields: list[dict[str, Any]] = []
    for item in error.errors():
        path = ".".join(str(part) for part in item["loc"] if part not in {"body", "query"})
        fields.append({"field": path or "request", "messages": [str(item["msg"])]})
    payload = {
        "status": 422,
        "code": "invalid_field",
        "detail": "Request validation failed",
        "requestId": request.state.request_id,
        "fields": fields,
    }
    return JSONResponse(payload, status_code=422, media_type="application/problem+json")
