from __future__ import annotations

import unittest

from agent_boundaries import (
    ActionProposal,
    ApprovalGrant,
    RuntimeContext,
    evaluate_proposal,
)


def runtime_context(**changes: object) -> RuntimeContext:
    values = {
        "actor": "authenticated_user",
        "scope": ("current_user_records",),
        "allowed_actions": frozenset(
            {
                "search_policy",
                "read_request_status",
                "read_device_status",
                "resubmit_request",
            }
        ),
        "write_actions": frozenset({"resubmit_request"}),
        "approvals": frozenset(),
        "required_evidence": frozenset({"request_status", "device_status"}),
        "observed_evidence": frozenset(),
    }
    values.update(changes)
    return RuntimeContext(**values)  # type: ignore[arg-type]


class AgentBoundaryTests(unittest.TestCase):
    def test_read_action_uses_runtime_identity_and_scope(self) -> None:
        proposal = ActionProposal("search_policy", (("query", "设备合规要求"),))

        decision = evaluate_proposal(proposal, runtime_context())

        self.assertEqual(decision.status, "execute")
        self.assertIsNotNone(decision.command)
        arguments = dict(decision.command.arguments)
        self.assertEqual(arguments["actor"], "authenticated_user")
        self.assertEqual(arguments["scope"], ("current_user_records",))

    def test_model_cannot_supply_trusted_context(self) -> None:
        for field in ("actor", "scope", "approved"):
            with self.subTest(field=field):
                proposal = ActionProposal(
                    "read_device_status",
                    ((field, "model_value"),),
                )
                decision = evaluate_proposal(proposal, runtime_context())
                self.assertEqual(decision.status, "reject")
                self.assertEqual(
                    decision.reason,
                    "trusted_context_is_model_controlled",
                )

    def test_unlisted_action_is_rejected(self) -> None:
        proposal = ActionProposal("export_all_records")

        decision = evaluate_proposal(proposal, runtime_context())

        self.assertEqual(decision.status, "reject")
        self.assertEqual(decision.reason, "action_not_allowed")

    def test_duplicate_arguments_are_rejected_before_execution(self) -> None:
        proposal = ActionProposal(
            "search_policy",
            (("query", "设备"), ("query", "合规")),
        )

        decision = evaluate_proposal(proposal, runtime_context())

        self.assertEqual(decision.status, "reject")
        self.assertEqual(decision.reason, "duplicate_argument")

    def test_missing_runtime_identity_or_scope_is_rejected(self) -> None:
        proposal = ActionProposal("read_device_status")

        for changes in ({"actor": ""}, {"scope": ()}):
            with self.subTest(changes=changes):
                decision = evaluate_proposal(proposal, runtime_context(**changes))
                self.assertEqual(decision.status, "reject")
                self.assertEqual(decision.reason, "trusted_context_is_missing")

    def test_write_action_requires_the_exact_proposal_actor_and_scope(self) -> None:
        proposal = ActionProposal("resubmit_request", (("reason", "条件已满足"),))
        approval = ApprovalGrant(
            proposal,
            "authenticated_user",
            ("current_user_records",),
        )

        paused = evaluate_proposal(proposal, runtime_context())
        approved = evaluate_proposal(
            proposal,
            runtime_context(approvals=frozenset({approval})),
        )
        changed = evaluate_proposal(
            ActionProposal("resubmit_request", (("reason", "另一项说明"),)),
            runtime_context(approvals=frozenset({approval})),
        )
        changed_scope = evaluate_proposal(
            proposal,
            runtime_context(
                scope=("another_scope",),
                approvals=frozenset({approval}),
            ),
        )
        changed_actor = evaluate_proposal(
            proposal,
            runtime_context(
                actor="another_user",
                approvals=frozenset({approval}),
            ),
        )

        self.assertEqual(paused.status, "pause")
        self.assertEqual(approved.status, "execute")
        self.assertEqual(changed.status, "pause")
        self.assertEqual(changed_scope.status, "pause")
        self.assertEqual(changed_actor.status, "pause")

    def test_finish_is_rejected_when_required_evidence_is_missing(self) -> None:
        decision = evaluate_proposal(
            ActionProposal("finish", (("answer", "申请因设备不合规被拒绝"),)),
            runtime_context(observed_evidence=frozenset({"request_status"})),
        )

        self.assertEqual(decision.status, "reject")
        self.assertEqual(decision.reason, "completion_evidence_missing")

    def test_finish_is_accepted_after_all_required_evidence_is_observed(self) -> None:
        decision = evaluate_proposal(
            ActionProposal("finish", (("answer", "申请因设备不合规被拒绝"),)),
            runtime_context(
                observed_evidence=frozenset({"request_status", "device_status"})
            ),
        )

        self.assertEqual(decision.status, "complete")
        self.assertEqual(decision.reason, "completion_verified")
        self.assertIsNone(decision.command)


if __name__ == "__main__":
    unittest.main()
