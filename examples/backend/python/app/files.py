from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit, urlunsplit
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from minio import Minio  # type: ignore[import-untyped]
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, current_principal
from .config import settings
from .database import database_session
from .models import StoredFile
from .problems import ApiProblem

router = APIRouter(prefix="/files", tags=["files"])


class FileIntent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    filename: str = Field(min_length=1, max_length=255)
    content_type: str = Field(
        validation_alias=AliasChoices("contentType", "content_type"),
        serialization_alias="contentType",
        min_length=1,
        max_length=120,
    )
    size: int = Field(ge=1, le=52_428_800)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


@router.post("/presign", status_code=201)
async def presign_file(
    body: FileIntent,
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, str]:
    config = settings()
    file_id = str(uuid4())
    object_key = f"tenants/{actor.tenant_id}/files/{file_id}/source"
    expires = timedelta(minutes=15)
    try:
        upload_url = Minio(
            config.minio_endpoint,
            access_key=config.minio_access_key,
            secret_key=config.minio_secret_key,
            secure=config.minio_secure,
        ).presigned_put_object(config.minio_bucket, object_key, expires=expires)
    except Exception as error:
        raise ApiProblem(503, "object_storage_unavailable", "Unable to sign upload") from error
    if config.minio_public_endpoint:
        signed = urlsplit(upload_url)
        published = urlsplit(config.minio_public_endpoint)
        upload_url = urlunsplit(
            (published.scheme, published.netloc, signed.path, signed.query, signed.fragment)
        )
    now = datetime.now(UTC).replace(tzinfo=None)
    session.add(
        StoredFile(
            id=file_id,
            tenant_id=actor.tenant_id,
            owner_id=actor.user_id,
            bucket=config.minio_bucket,
            object_key=object_key,
            filename=body.filename.strip(),
            content_type=body.content_type,
            size_bytes=body.size,
            sha256=body.sha256,
            status="pending",
            version=1,
            created_at=now,
            updated_at=now,
        )
    )
    await session.commit()
    return {
        "fileId": file_id,
        "objectKey": object_key,
        "uploadUrl": upload_url,
        "expiresAt": (datetime.now(UTC) + expires).isoformat(),
    }


@router.get("/{file_id}/download", response_class=RedirectResponse, status_code=302)
async def download_file(
    file_id: UUID,
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> RedirectResponse:
    file = await session.scalar(
        select(StoredFile).where(
            StoredFile.id == str(file_id),
            StoredFile.tenant_id == actor.tenant_id,
            StoredFile.status.not_in(["deleted", "deleting"]),
        )
    )
    if file is None:
        raise ApiProblem(404, "file_not_found", "File is not visible")
    config = settings()
    try:
        download_url = Minio(
            config.minio_endpoint,
            access_key=config.minio_access_key,
            secret_key=config.minio_secret_key,
            secure=config.minio_secure,
        ).presigned_get_object(file.bucket, file.object_key, expires=timedelta(minutes=5))
    except Exception as error:
        raise ApiProblem(503, "object_storage_unavailable", "Unable to sign download") from error
    if config.minio_public_endpoint:
        signed = urlsplit(download_url)
        published = urlsplit(config.minio_public_endpoint)
        download_url = urlunsplit(
            (published.scheme, published.netloc, signed.path, signed.query, signed.fragment)
        )
    return RedirectResponse(download_url, status_code=302)
