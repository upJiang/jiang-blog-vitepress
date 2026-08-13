import json
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, current_principal
from .database import database_session
from .problems import ApiProblem

router = APIRouter(tags=["ai"])


class DocumentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    file_id: UUID = Field(validation_alias="fileId", serialization_alias="fileId")


class ChatRunInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    knowledge_base_id: UUID = Field(
        validation_alias="knowledgeBaseId", serialization_alias="knowledgeBaseId"
    )
    question: str = Field(min_length=1, max_length=8000)


@router.get("/knowledge-bases")
async def knowledge_bases(
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    result = await session.execute(
        text("""
            SELECT id, tenant_id AS tenantId, name, active_version AS activeVersion,
                   CAST(version AS CHAR) AS version, created_at AS createdAt
            FROM knowledge_bases WHERE tenant_id = :tenant_id ORDER BY id LIMIT 100
        """),
        {"tenant_id": actor.tenant_id},
    )
    return {"items": [dict(row) for row in result.mappings()], "nextCursor": None}


@router.post("/knowledge-bases/{knowledge_base_id}/documents", status_code=202)
async def create_document(
    knowledge_base_id: UUID,
    body: DocumentInput,
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    async with session.begin():
        knowledge_base = (
            await session.execute(
                text("""
                    SELECT id FROM knowledge_bases
                    WHERE id = :id AND tenant_id = :tenant_id FOR UPDATE
                """),
                {"id": str(knowledge_base_id), "tenant_id": actor.tenant_id},
            )
        ).first()
        if not knowledge_base:
            raise ApiProblem(404, "knowledge_base_not_found", "Knowledge base is not visible")
        file = (
            await session.execute(
                text("""
                    SELECT id FROM files
                    WHERE id = :id AND tenant_id = :tenant_id
                      AND status NOT IN ('deleted', 'deleting', 'rejected') FOR UPDATE
                """),
                {"id": str(body.file_id), "tenant_id": actor.tenant_id},
            )
        ).first()
        if not file:
            raise ApiProblem(404, "file_not_found", "File is not visible")
        task = await _create_task(
            session,
            actor.tenant_id,
            "document.parse",
            {"knowledgeBaseId": str(knowledge_base_id), "fileId": str(body.file_id)},
        )
        document_id = str(uuid4())
        await session.execute(
            text("""
                INSERT INTO documents
                  (id, tenant_id, knowledge_base_id, file_id, task_id, status)
                VALUES (:id, :tenant_id, :knowledge_base_id, :file_id, :task_id, 'queued')
            """),
            {
                "id": document_id,
                "tenant_id": actor.tenant_id,
                "knowledge_base_id": str(knowledge_base_id),
                "file_id": str(body.file_id),
                "task_id": task["id"],
            },
        )
        await _outbox(
            session,
            actor.tenant_id,
            "document",
            document_id,
            "document.parse.requested",
            task,
        )
        return task


@router.post("/chat-runs", status_code=202)
async def create_chat_run(
    body: ChatRunInput,
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    async with session.begin():
        knowledge_base = (
            await session.execute(
                text("""
                    SELECT id FROM knowledge_bases
                    WHERE id = :id AND tenant_id = :tenant_id FOR UPDATE
                """),
                {"id": str(body.knowledge_base_id), "tenant_id": actor.tenant_id},
            )
        ).first()
        if not knowledge_base:
            raise ApiProblem(404, "knowledge_base_not_found", "Knowledge base is not visible")
        question = body.question.strip()
        task = await _create_task(
            session,
            actor.tenant_id,
            "chat.run",
            {"knowledgeBaseId": str(body.knowledge_base_id), "question": question},
        )
        run_id = str(uuid4())
        await session.execute(
            text("""
                INSERT INTO chat_runs
                  (id, tenant_id, knowledge_base_id, task_id, question, status)
                VALUES (:id, :tenant_id, :knowledge_base_id, :task_id, :question, 'accepted')
            """),
            {
                "id": run_id,
                "tenant_id": actor.tenant_id,
                "knowledge_base_id": str(body.knowledge_base_id),
                "task_id": task["id"],
                "question": question,
            },
        )
        await _outbox(
            session,
            actor.tenant_id,
            "chat_run",
            run_id,
            "chat.run.requested",
            task,
        )
        return task


async def _create_task(
    session: AsyncSession,
    tenant_id: str,
    task_type: str,
    task_input: dict[str, object],
) -> dict[str, object]:
    task_id = str(uuid4())
    await session.execute(
        text("""
            INSERT INTO tasks
              (id, tenant_id, task_type, status, progress, attempt, input_json)
            VALUES (:id, :tenant_id, :task_type, 'queued', 0, 0, :input_json)
        """),
        {
            "id": task_id,
            "tenant_id": tenant_id,
            "task_type": task_type,
            "input_json": json.dumps(task_input),
        },
    )
    await session.execute(
        text("""
            INSERT INTO task_events (task_id, sequence, event_type, data_json)
            VALUES (:task_id, 1, 'task.queued', :data_json)
        """),
        {"task_id": task_id, "data_json": json.dumps({"progress": 0})},
    )
    return {
        "id": task_id,
        "type": task_type,
        "status": "queued",
        "progress": 0,
        "attempt": 0,
        "result": None,
    }


async def _outbox(
    session: AsyncSession,
    tenant_id: str,
    aggregate_type: str,
    aggregate_id: str,
    event_type: str,
    payload: object,
) -> None:
    await session.execute(
        text("""
            INSERT INTO outbox_events
              (id, tenant_id, aggregate_type, aggregate_id, event_type, payload_json)
            VALUES (:id, :tenant_id, :aggregate_type, :aggregate_id, :event_type, :payload)
        """),
        {
            "id": str(uuid4()),
            "tenant_id": tenant_id,
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id,
            "event_type": event_type,
            "payload": json.dumps(payload),
        },
    )
