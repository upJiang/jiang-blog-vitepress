from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request

from .database import engine
from .problems import ApiProblem, problem_handler
from .projects import router as projects_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="Backend Learning Admin API", version="1.0.0", lifespan=lifespan)
app.add_exception_handler(ApiProblem, problem_handler)  # type: ignore[arg-type]
app.include_router(projects_router, prefix="/api")


@app.middleware("http")
async def request_id(request: Request, call_next):
    request.state.request_id = request.headers.get("x-request-id", str(uuid4()))
    response = await call_next(request)
    response.headers["x-request-id"] = request.state.request_id
    return response


@app.get("/api/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}
