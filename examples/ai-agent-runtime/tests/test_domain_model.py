import pytest

from ai_agent_runtime.domain_model import (
    EventStream,
    Turn,
    TurnEvent,
    TurnStatus,
)


def new_turn(name: str) -> Turn:
    return Turn(name, "conversation-test", "release-test")


def test_completed_turn_cannot_transition_again() -> None:
    turn = new_turn("turn-completed")
    turn.transition(TurnEvent.WORKER_CLAIMED)
    turn.transition(TurnEvent.ANSWER_VALIDATED)
    with pytest.raises(ValueError, match="invalid transition"):
        turn.transition(TurnEvent.UNRECOVERABLE_ERROR)


def test_pending_cancel_finishes_without_worker_confirmation() -> None:
    turn = new_turn("turn-pending")
    turn.transition(TurnEvent.CANCEL_REQUESTED)
    assert turn.status is TurnStatus.CANCELLED


def test_running_cancel_waits_for_worker_confirmation() -> None:
    turn = new_turn("turn-running")
    turn.transition(TurnEvent.WORKER_CLAIMED)
    turn.transition(TurnEvent.CANCEL_REQUESTED)
    assert turn.status is TurnStatus.CANCEL_REQUESTED
    turn.transition(TurnEvent.STOPPED)
    assert turn.status is TurnStatus.CANCELLED


def test_event_replay_returns_only_unseen_sequences() -> None:
    stream = EventStream("turn-events")
    stream.append("turn.created", {})
    stream.append("turn.started", {})
    stream.append("turn.completed", {"message_id": "message-1"})
    replay = stream.replay_after(1)
    assert [event.sequence for event in replay] == [2, 3]


def test_event_stream_rejects_a_second_terminal_event() -> None:
    stream = EventStream("turn-terminal")
    stream.append("turn.completed", {})
    with pytest.raises(ValueError, match="terminal event already exists"):
        stream.append("turn.cancelled", {})
