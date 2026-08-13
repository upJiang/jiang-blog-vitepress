from __future__ import annotations

from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe
from typing import Annotated
from uuid import uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import APIRouter, Cookie, Depends, Header, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import database_session
from .models import AuthSession, User
from .problems import ApiProblem

COOKIE_NAME = "refresh_session"
AUDIENCE = "enterprise-admin-api"
ISSUER = "backend-learning-python"
PERMISSIONS = ["project.read", "project.write", "file.write", "task.read"]
password_hasher = PasswordHasher()
router = APIRouter(prefix="/auth", tags=["auth"])


class LoginInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=190)
    password: str = Field(min_length=8, max_length=1024)


class Principal(BaseModel):
    user_id: str
    tenant_id: str
    session_id: str
    permissions: list[str]


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _hash(token: str) -> bytes:
    return sha256(token.encode()).digest()


def _access_token(user_id: str, tenant_id: str, session_id: str) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": user_id,
            "tenantId": tenant_id,
            "sessionId": session_id,
            "permissions": PERMISSIONS,
            "iat": now,
            "exp": now + timedelta(seconds=settings().access_token_seconds),
            "aud": AUDIENCE,
            "iss": ISSUER,
        },
        settings().jwt_secret,
        algorithm="HS256",
    )


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=settings().refresh_token_seconds,
        httponly=True,
        secure=settings().cookie_secure,
        samesite="lax",
        path="/api/auth",
    )


async def current_principal(
    authorization: Annotated[str | None, Header()] = None,
) -> Principal:
    if not authorization or not authorization.startswith("Bearer "):
        raise ApiProblem(401, "access_token_missing", "Access token is required")
    try:
        payload = jwt.decode(
            authorization[7:],
            settings().jwt_secret,
            algorithms=["HS256"],
            audience=AUDIENCE,
            issuer=ISSUER,
        )
        return Principal(
            user_id=str(payload["sub"]),
            tenant_id=str(payload["tenantId"]),
            session_id=str(payload["sessionId"]),
            permissions=[str(value) for value in payload.get("permissions", [])],
        )
    except (jwt.PyJWTError, KeyError, TypeError) as error:
        raise ApiProblem(401, "access_token_invalid", "Access token is invalid") from error


@router.post("/login")
async def login(
    body: LoginInput,
    response: Response,
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    user = await session.scalar(
        select(User).where(User.email == body.email, User.status == "active")
    )
    if user is None:
        raise ApiProblem(401, "invalid_credentials", "Email or password is invalid")
    try:
        password_hasher.verify(user.password_hash, body.password)
    except VerificationError as error:
        raise ApiProblem(401, "invalid_credentials", "Email or password is invalid") from error

    raw_refresh = token_urlsafe(32)
    auth_session = AuthSession(
        id=str(uuid4()),
        tenant_id=user.tenant_id,
        user_id=user.id,
        token_family_id=str(uuid4()),
        refresh_token_hash=_hash(raw_refresh),
        expires_at=_now() + timedelta(seconds=settings().refresh_token_seconds),
        rotated_at=None,
        revoked_at=None,
        revoke_reason=None,
        last_used_at=None,
    )
    session.add(auth_session)
    await session.commit()
    _set_refresh_cookie(response, raw_refresh)
    return {
        "accessToken": _access_token(user.id, user.tenant_id, auth_session.id),
        "expiresIn": settings().access_token_seconds,
    }


@router.post("/refresh")
async def refresh(
    response: Response,
    refresh_session: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    if not refresh_session:
        raise ApiProblem(401, "refresh_token_missing", "Refresh token is required")

    reused = False
    next_token = ""
    user: User | None = None
    next_session_id = ""
    async with session.begin():
        auth_session = await session.scalar(
            select(AuthSession)
            .where(AuthSession.refresh_token_hash == _hash(refresh_session))
            .with_for_update()
        )
        if auth_session is None or auth_session.revoked_at or auth_session.expires_at <= _now():
            raise ApiProblem(401, "session_invalid", "Refresh session is invalid")
        user = await session.get(User, auth_session.user_id)
        if user is None or user.status != "active":
            raise ApiProblem(401, "session_invalid", "Refresh session is invalid")
        if auth_session.rotated_at:
            await session.execute(
                update(AuthSession)
                .where(
                    AuthSession.token_family_id == auth_session.token_family_id,
                    AuthSession.revoked_at.is_(None),
                )
                .values(revoked_at=_now(), revoke_reason="refresh_reuse")
            )
            reused = True
        else:
            auth_session.rotated_at = _now()
            auth_session.last_used_at = _now()
            next_token = token_urlsafe(32)
            next_session_id = str(uuid4())
            session.add(
                AuthSession(
                    id=next_session_id,
                    tenant_id=auth_session.tenant_id,
                    user_id=auth_session.user_id,
                    token_family_id=auth_session.token_family_id,
                    refresh_token_hash=_hash(next_token),
                    expires_at=auth_session.expires_at,
                    rotated_at=None,
                    revoked_at=None,
                    revoke_reason=None,
                    last_used_at=None,
                )
            )

    if reused:
        raise ApiProblem(401, "session_reused", "Refresh token reuse was detected")
    assert user is not None
    _set_refresh_cookie(response, next_token)
    return {
        "accessToken": _access_token(user.id, user.tenant_id, next_session_id),
        "expiresIn": settings().access_token_seconds,
    }


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    _: Principal = Depends(current_principal),
    refresh_session: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
    session: AsyncSession = Depends(database_session),
) -> Response:
    if refresh_session:
        current = await session.scalar(
            select(AuthSession).where(AuthSession.refresh_token_hash == _hash(refresh_session))
        )
        if current:
            await session.execute(
                update(AuthSession)
                .where(
                    AuthSession.token_family_id == current.token_family_id,
                    AuthSession.revoked_at.is_(None),
                )
                .values(revoked_at=_now(), revoke_reason="logout")
            )
            await session.commit()
    response.delete_cookie(COOKIE_NAME, path="/api/auth")
    response.status_code = 204
    return response
