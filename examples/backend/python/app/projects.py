import json
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import cast
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, current_principal
from .database import database_session
from .models import IdempotencyKey, Project
from .problems import ApiProblem

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=4000)


class ProjectUpdate(ProjectInput):
    version: int = Field(ge=1)


IDEMPOTENCY_SCOPE = "projects.create"


def normalized_project_input(body: ProjectInput) -> dict[str, str | None]:
    return {
        "name": body.name.strip(),
        "description": body.description.strip()
        if body.description and body.description.strip()
        else None,
    }


def project_request_hash(body: ProjectInput) -> bytes:
    encoded = json.dumps(
        normalized_project_input(body), ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode()
    return sha256(encoded).digest()


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
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    statement = select(Project).where(
        Project.tenant_id == actor.tenant_id, Project.deleted_at.is_(None)
    )
    if cursor_time and cursor_id:
        statement = statement.where(
            or_(
                Project.updated_at < cursor_time,
                and_(Project.updated_at == cursor_time, Project.id < cursor_id),
            )
        )
    rows = list(
        (
            await session.scalars(
                statement.order_by(Project.updated_at.desc(), Project.id.desc()).limit(limit + 1)
            )
        ).all()
    )
    has_next = len(rows) > limit
    items = rows[:limit]
    next_cursor = (
        None
        if not has_next
        else {"updatedAt": items[-1].updated_at.isoformat(), "id": items[-1].id}
    )
    return {"items": [project_json(item) for item in items], "nextCursor": next_cursor}


@router.get("/{project_id}")
async def get_project(
    project_id: UUID,
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    project = await session.scalar(
        select(Project).where(
            Project.id == str(project_id),
            Project.tenant_id == actor.tenant_id,
            Project.deleted_at.is_(None),
        )
    )
    if project is None:
        raise ApiProblem(404, "resource_not_found", "Project is not visible")
    return project_json(project)


@router.post("", status_code=201)
async def create_project(
    body: ProjectInput,
    idempotency_key: str = Header(min_length=16, max_length=128),
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    request_hash = project_request_hash(body)
    normalized = normalized_project_input(body)
    now = datetime.now(UTC).replace(tzinfo=None)
    try:
        async with session.begin():
            existing = await session.scalar(
                select(IdempotencyKey)
                .where(
                    IdempotencyKey.tenant_id == actor.tenant_id,
                    IdempotencyKey.scope == IDEMPOTENCY_SCOPE,
                    IdempotencyKey.idem_key == idempotency_key,
                )
                .with_for_update()
            )
            if existing:
                if existing.request_hash != request_hash:
                    raise ApiProblem(
                        409, "idempotency_key_reused", "Idempotency key has another payload"
                    )
                if existing.status == "completed" and existing.response_json:
                    return existing.response_json
                raise ApiProblem(
                    409, "idempotency_request_in_progress", "Original request is still running"
                )

            idempotency = IdempotencyKey(
                tenant_id=actor.tenant_id,
                scope=IDEMPOTENCY_SCOPE,
                idem_key=idempotency_key,
                request_hash=request_hash,
                status="processing",
                response_status=None,
                response_json=None,
                expires_at=now + timedelta(hours=24),
                created_at=now,
            )
            project = Project(
                id=str(uuid4()),
                tenant_id=actor.tenant_id,
                owner_id=actor.user_id,
                name=normalized["name"],
                description=normalized["description"],
                version=1,
                created_at=now,
                updated_at=now,
            )
            session.add_all([idempotency, project])
            await session.flush()
            response = project_json(project)
            idempotency.status = "completed"
            idempotency.response_status = 201
            idempotency.response_json = response
        return response
    except IntegrityError as error:
        await session.rollback()
        existing = await session.scalar(
            select(IdempotencyKey).where(
                IdempotencyKey.tenant_id == actor.tenant_id,
                IdempotencyKey.scope == IDEMPOTENCY_SCOPE,
                IdempotencyKey.idem_key == idempotency_key,
            )
        )
        if existing:
            if existing.request_hash != request_hash:
                raise ApiProblem(
                    409, "idempotency_key_reused", "Idempotency key has another payload"
                ) from error
            if existing.status == "completed" and existing.response_json:
                return cast(dict[str, object], existing.response_json)
            raise ApiProblem(
                409, "idempotency_request_in_progress", "Original request is still running"
            ) from error
        raise ApiProblem(409, "project_name_exists", "Project already exists") from error


@router.patch("/{project_id}")
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    statement = (
        update(Project)
        .where(
            Project.id == str(project_id),
            Project.tenant_id == actor.tenant_id,
            Project.version == body.version,
            Project.deleted_at.is_(None),
        )
        .values(
            name=body.name,
            description=body.description,
            version=Project.version + 1,
            updated_at=datetime.now(UTC).replace(tzinfo=None),
        )
    )
    result = await session.execute(statement)
    if result.rowcount != 1:
        exists = await session.scalar(
            select(Project.id).where(
                Project.id == str(project_id),
                Project.tenant_id == actor.tenant_id,
                Project.deleted_at.is_(None),
            )
        )
        raise ApiProblem(
            409 if exists else 404,
            "version_conflict" if exists else "not_found",
            "Project changed or is not visible",
        )
    await session.commit()
    project = await session.scalar(
        select(Project).where(Project.id == str(project_id), Project.tenant_id == actor.tenant_id)
    )
    assert project is not None
    return project_json(project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> Response:
    result = await session.execute(
        update(Project)
        .where(
            Project.id == str(project_id),
            Project.tenant_id == actor.tenant_id,
            Project.deleted_at.is_(None),
        )
        .values(deleted_at=datetime.now(UTC).replace(tzinfo=None))
    )
    if result.rowcount != 1:
        raise ApiProblem(404, "not_found", "Project is not visible")
    await session.commit()
    return Response(status_code=204)
