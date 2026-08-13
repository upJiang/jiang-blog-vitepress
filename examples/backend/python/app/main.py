from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import Depends, FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .admin import router as admin_router
from .ai import router as ai_router
from .auth import Principal, current_principal
from .auth import router as auth_router
from .commerce import router as commerce_router
from .config import settings
from .database import database_session, engine
from .files import router as files_router
from .problems import ApiProblem, problem_handler, validation_handler
from .projects import router as projects_router
from .tasks import router as tasks_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await engine.dispose()


app = FastAPI(title="Backend Learning Admin API", version="1.0.0", lifespan=lifespan)
app.add_exception_handler(ApiProblem, problem_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_handler)  # type: ignore[arg-type]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings().web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(commerce_router, prefix="/api")
app.include_router(ai_router, prefix="/api")


@app.middleware("http")
async def request_id(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    request.state.request_id = request.headers.get("x-request-id", str(uuid4()))
    response = await call_next(request)
    response.headers["x-request-id"] = request.state.request_id
    return response


@app.get("/api/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health/ready")
async def ready(session=Depends(database_session)) -> dict[str, str]:  # type: ignore[no-untyped-def]
    try:
        await session.execute(text("SELECT 1"))
    except Exception as error:
        raise ApiProblem(503, "database_unavailable", "Database is unavailable") from error
    return {"status": "ok"}


@app.get("/api/me")
async def me(actor: Principal = Depends(current_principal)) -> dict[str, object]:
    return {
        "userId": actor.user_id,
        "tenantId": actor.tenant_id,
        "permissions": actor.permissions,
    }
