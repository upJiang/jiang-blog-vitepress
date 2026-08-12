from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .database import database_session
from .models import Project
from .problems import ApiProblem

router = APIRouter(prefix="/projects", tags=["projects"])


class Principal(BaseModel):
    user_id: str
    tenant_id: str


class ProjectInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=4000)


class ProjectUpdate(ProjectInput):
    version: int = Field(ge=1)


def principal() -> Principal:
    # The teaching service replaces this dependency with JWT verification in auth tests.
    return Principal(user_id="00000000-0000-0000-0000-000000000002", tenant_id="00000000-0000-0000-0000-000000000001")


def project_json(project: Project) -> dict[str, object]:
    return {
        "id": project.id,
        "tenantId": project.tenant_id,
        "name": project.name,
        "description": project.description,
        "version": project.version,
        "createdAt": project.created_at.replace(tzinfo=UTC).isoformat(),
        "updatedAt": project.updated_at.replace(tzinfo=UTC).isoformat(),
    }


@router.get("")
async def list_projects(
    cursor_time: datetime | None = Query(default=None, alias="cursorTime"),
    cursor_id: str | None = Query(default=None, alias="cursorId"),
    limit: int = Query(default=50, ge=1, le=100),
    actor: Principal = Depends(principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    statement = select(Project).where(Project.tenant_id == actor.tenant_id, Project.deleted_at.is_(None))
    if cursor_time and cursor_id:
        statement = statement.where(
            or_(Project.updated_at < cursor_time, and_(Project.updated_at == cursor_time, Project.id < cursor_id))
        )
    rows = list((await session.scalars(statement.order_by(Project.updated_at.desc(), Project.id.desc()).limit(limit + 1))).all())
    has_next = len(rows) > limit
    items = rows[:limit]
    next_cursor = None if not has_next else {"updatedAt": items[-1].updated_at.isoformat(), "id": items[-1].id}
    return {"items": [project_json(item) for item in items], "nextCursor": next_cursor}


@router.post("", status_code=201)
async def create_project(
    body: ProjectInput,
    idempotency_key: str = Header(min_length=16, max_length=128),
    actor: Principal = Depends(principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    del idempotency_key
    now = datetime.now(UTC).replace(tzinfo=None)
    project = Project(id=str(uuid4()), tenant_id=actor.tenant_id, owner_id=actor.user_id, name=body.name, description=body.description, version=1, created_at=now, updated_at=now)
    session.add(project)
    await session.commit()
    return project_json(project)


@router.patch("/{project_id}")
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    actor: Principal = Depends(principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    statement = (
        update(Project)
        .where(Project.id == str(project_id), Project.tenant_id == actor.tenant_id, Project.version == body.version, Project.deleted_at.is_(None))
        .values(name=body.name, description=body.description, version=Project.version + 1, updated_at=datetime.now(UTC).replace(tzinfo=None))
    )
    result = await session.execute(statement)
    if result.rowcount != 1:
        exists = await session.scalar(select(Project.id).where(Project.id == str(project_id), Project.tenant_id == actor.tenant_id, Project.deleted_at.is_(None)))
        raise ApiProblem(409 if exists else 404, "version_conflict" if exists else "not_found", "Project changed or is not visible")
    await session.commit()
    project = await session.scalar(select(Project).where(Project.id == str(project_id), Project.tenant_id == actor.tenant_id))
    assert project is not None
    return project_json(project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    actor: Principal = Depends(principal),
    session: AsyncSession = Depends(database_session),
) -> Response:
    result = await session.execute(update(Project).where(Project.id == str(project_id), Project.tenant_id == actor.tenant_id, Project.deleted_at.is_(None)).values(deleted_at=datetime.now(UTC).replace(tzinfo=None)))
    if result.rowcount != 1:
        raise ApiProblem(404, "not_found", "Project is not visible")
    await session.commit()
    return Response(status_code=204)
