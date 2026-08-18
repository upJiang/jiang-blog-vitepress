from __future__ import annotations

import unittest

from production_flow import ProductionDependencies, route_request


class ProductionFlowTests(unittest.TestCase):
    def test_database_failure_stops_before_admission_side_effects(self) -> None:
        decision = route_request(ProductionDependencies(database="unavailable"))
        self.assertEqual(decision.status, "rejected")
        self.assertEqual(decision.calls, ())

    def test_duplicate_idempotency_does_not_repeat_dependencies(self) -> None:
        decision = route_request(ProductionDependencies(), idempotency_seen=True)
        self.assertEqual(decision.status, "duplicate")
        self.assertEqual(decision.calls, ())

    def test_retrieval_outage_degrades_without_calling_model(self) -> None:
        decision = route_request(ProductionDependencies(retrieval="unavailable"))
        self.assertEqual(decision.status, "degraded")
        self.assertNotIn("model", decision.calls)

    def test_no_evidence_is_not_treated_as_model_input(self) -> None:
        decision = route_request(ProductionDependencies(retrieval="no_evidence"))
        self.assertEqual(decision.reason, "evidence_unavailable")
        self.assertNotIn("model", decision.calls)

    def test_model_rate_limit_does_not_replay_retrieval(self) -> None:
        decision = route_request(ProductionDependencies(model="rate_limited"))
        self.assertEqual(decision.status, "rejected")
        self.assertEqual(decision.calls, ("admission", "turn.create", "retrieval"))

    def test_success_reaches_validation_before_event_commit(self) -> None:
        decision = route_request(ProductionDependencies())
        self.assertEqual(decision.status, "accepted")
        self.assertLess(decision.calls.index("validation"), decision.calls.index("event.commit"))


if __name__ == "__main__":
    unittest.main()
