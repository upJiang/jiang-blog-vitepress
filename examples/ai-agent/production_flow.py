from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


DependencyStatus = Literal["ok", "unavailable", "rate_limited", "no_evidence"]


@dataclass(frozen=True)
class ProductionDependencies:
    database: DependencyStatus = "ok"
    retrieval: DependencyStatus = "ok"
    model: DependencyStatus = "ok"


@dataclass(frozen=True)
class RouteDecision:
    status: Literal["accepted", "rejected", "degraded", "duplicate"]
    reason: str
    calls: tuple[str, ...]


def route_request(
    deps: ProductionDependencies,
    *,
    idempotency_seen: bool = False,
    requires_evidence: bool = True,
) -> RouteDecision:
    if idempotency_seen:
        return RouteDecision("duplicate", "existing_turn", ())
    if deps.database != "ok":
        return RouteDecision("rejected", "domain_store_unavailable", ())

    calls = ["admission", "turn.create"]
    if deps.retrieval == "unavailable":
        return RouteDecision("degraded", "retrieval_unavailable", tuple(calls))
    if deps.retrieval == "no_evidence" and requires_evidence:
        return RouteDecision("degraded", "evidence_unavailable", tuple(calls + ["retrieval"]))
    calls.append("retrieval")
    if deps.model == "rate_limited":
        return RouteDecision("rejected", "model_rate_limited", tuple(calls))
    if deps.model != "ok":
        return RouteDecision("rejected", "model_unavailable", tuple(calls))
    calls.extend(["model", "validation", "event.commit"])
    return RouteDecision("accepted", "completed_path", tuple(calls))


if __name__ == "__main__":
    print(route_request(ProductionDependencies()))
