from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, current_principal
from .database import database_session

router = APIRouter(tags=["admin"])
Collection = Literal["tenants", "departments", "users", "roles", "permissions", "audit-logs"]

STATEMENTS: dict[Collection, str] = {
    "tenants": """
        SELECT id, name, status, CAST(version AS CHAR) AS version,
               created_at AS createdAt, updated_at AS updatedAt
        FROM tenants WHERE id = :tenant_id ORDER BY id LIMIT 100
    """,
    "departments": """
        SELECT id, tenant_id AS tenantId, parent_id AS parentId, name,
               CAST(version AS CHAR) AS version, created_at AS createdAt, updated_at AS updatedAt
        FROM departments WHERE tenant_id = :tenant_id ORDER BY id LIMIT 100
    """,
    "users": """
        SELECT id, tenant_id AS tenantId, department_id AS departmentId, email,
               display_name AS displayName, status, CAST(version AS CHAR) AS version,
               created_at AS createdAt, updated_at AS updatedAt
        FROM users WHERE tenant_id = :tenant_id ORDER BY id LIMIT 100
    """,
    "roles": """
        SELECT id, tenant_id AS tenantId, code, name, created_at AS createdAt
        FROM roles WHERE tenant_id = :tenant_id ORDER BY id LIMIT 100
    """,
    "permissions": """
        SELECT DISTINCT p.id, p.code, p.description
        FROM permissions p
        JOIN role_permissions rp ON rp.permission_id = p.id
        JOIN roles r ON r.id = rp.role_id
        WHERE r.tenant_id = :tenant_id ORDER BY p.code LIMIT 100
    """,
    "audit-logs": """
        SELECT id, tenant_id AS tenantId, actor_id AS actorId, action,
               resource_type AS resourceType, resource_id AS resourceId,
               request_id AS requestId, result, changes_json AS changes,
               created_at AS createdAt
        FROM audit_logs WHERE tenant_id = :tenant_id
        ORDER BY created_at DESC, id DESC LIMIT 100
    """,
}


async def collection_page(
    collection: Collection,
    actor: Principal,
    session: AsyncSession,
) -> dict[str, object]:
    result = await session.execute(text(STATEMENTS[collection]), {"tenant_id": actor.tenant_id})
    return {"items": [dict(row) for row in result.mappings()], "nextCursor": None}


@router.get("/tenants")
async def tenants(
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    return await collection_page("tenants", actor, session)


@router.get("/departments")
async def departments(
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    return await collection_page("departments", actor, session)


@router.get("/users")
async def users(
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    return await collection_page("users", actor, session)


@router.get("/roles")
async def roles(
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    return await collection_page("roles", actor, session)


@router.get("/permissions")
async def permissions(
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    return await collection_page("permissions", actor, session)


@router.get("/audit-logs")
async def audit_logs(
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    return await collection_page("audit-logs", actor, session)
