import asyncio
import json
from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Depends, Header
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, current_principal
from .database import database_session, session_factory
from .models import BackgroundTask, TaskEvent
from .problems import ApiProblem

router = APIRouter(prefix="/tasks", tags=["tasks"])
TERMINAL_STATES = {"completed", "failed", "cancelled"}


def task_json(task: BackgroundTask) -> dict[str, object]:
    return {
        "id": task.id,
        "type": task.task_type,
        "status": task.status,
        "progress": task.progress,
        "attempt": task.attempt,
        "result": task.result_json,
    }


async def scoped_task(session: AsyncSession, actor: Principal, task_id: UUID) -> BackgroundTask:
    task = await session.scalar(
        select(BackgroundTask).where(
            BackgroundTask.id == str(task_id), BackgroundTask.tenant_id == actor.tenant_id
        )
    )
    if task is None:
        raise ApiProblem(404, "task_not_found", "Task is not visible")
    return task


@router.get("/{task_id}")
async def get_task(
    task_id: UUID,
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    return task_json(await scoped_task(session, actor, task_id))


async def task_event_stream(actor: Principal, task_id: UUID, after: int) -> AsyncIterator[str]:
    last_sequence = after
    for _ in range(60):
        async with session_factory() as session:
            task = await scoped_task(session, actor, task_id)
            events = list(
                (
                    await session.scalars(
                        select(TaskEvent)
                        .where(
                            TaskEvent.task_id == str(task_id),
                            TaskEvent.sequence > last_sequence,
                        )
                        .order_by(TaskEvent.sequence)
                    )
                ).all()
            )
            for event in events:
                last_sequence = event.sequence
                yield (
                    f"id: {event.sequence}\n"
                    f"event: {event.event_type}\n"
                    f"data: {json.dumps(event.data_json, ensure_ascii=False)}\n\n"
                )
            yield f"event: snapshot\ndata: {json.dumps(task_json(task), ensure_ascii=False)}\n\n"
            if task.status in TERMINAL_STATES:
                return
        await asyncio.sleep(1)


@router.get("/{task_id}/events")
async def stream_task_events(
    task_id: UUID,
    last_event_id: str | None = Header(default=None),
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> StreamingResponse:
    await scoped_task(session, actor, task_id)
    after = int(last_event_id) if last_event_id and last_event_id.isdigit() else 0
    return StreamingResponse(
        task_event_stream(actor, task_id, after),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )
