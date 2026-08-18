from __future__ import annotations

import unittest

from safe_execution import (
    ActionRequest,
    Approval,
    CapabilitySandbox,
    SandboxPolicy,
    SandboxViolation,
    VirtualFileSystem,
    request_fingerprint,
)


def build_sandbox(**overrides: object) -> CapabilitySandbox:
    policy = SandboxPolicy(
        read_roots=("/workspace/input",),
        write_roots=("/workspace/output",),
        allowed_hosts=frozenset({"docs.example.com"}),
        max_actions=int(overrides.get("max_actions", 4)),
        max_output_bytes=int(overrides.get("max_output_bytes", 256)),
    )
    filesystem = VirtualFileSystem(
        files={
            "/workspace/input/request.txt": "生成审批摘要",
            "/host/secret.txt": "secret",
        },
        symlinks={"/workspace/input/shortcut": "/host/secret.txt"},
    )
    return CapabilitySandbox(policy, filesystem)


class SafeExecutionTests(unittest.TestCase):
    def test_reads_and_writes_only_inside_allowed_roots(self) -> None:
        sandbox = build_sandbox()
        self.assertEqual(
            sandbox.execute(
                ActionRequest("read_file", {"path": "/workspace/input/request.txt"})
            ),
            "生成审批摘要",
        )
        request = ActionRequest(
            "write_file",
            {"path": "/workspace/output/result.txt", "content": "已生成"},
            risk="high",
        )
        approval = Approval(request_fingerprint(request))
        sandbox.execute(request, approval=approval)
        self.assertEqual(sandbox.filesystem.files["/workspace/output/result.txt"], "已生成")

    def test_rejects_parent_traversal_and_symlink_escape(self) -> None:
        sandbox = build_sandbox()
        with self.assertRaisesRegex(SandboxViolation, "invalid_path"):
            sandbox.execute(ActionRequest("read_file", {"path": "/workspace/input/../secret"}))
        with self.assertRaisesRegex(SandboxViolation, "read_path_denied"):
            sandbox.execute(ActionRequest("read_file", {"path": "/workspace/input/shortcut"}))

    def test_rejects_unlisted_network_target(self) -> None:
        sandbox = build_sandbox()
        with self.assertRaisesRegex(SandboxViolation, "network_target_denied"):
            sandbox.execute(
                ActionRequest("fetch_url", {"url": "https://metadata.internal/token"}),
                network_fixtures={},
            )

    def test_approval_is_bound_to_exact_arguments(self) -> None:
        sandbox = build_sandbox()
        approved = ActionRequest(
            "write_file",
            {"path": "/workspace/output/result.txt", "content": "安全内容"},
            risk="high",
        )
        changed = ActionRequest(
            "write_file",
            {"path": "/workspace/output/result.txt", "content": "替换内容"},
            risk="high",
        )
        with self.assertRaisesRegex(SandboxViolation, "approval_mismatch"):
            sandbox.execute(
                changed,
                approval=Approval(request_fingerprint(approved)),
            )

    def test_action_and_output_budgets_stop_execution(self) -> None:
        sandbox = build_sandbox(max_actions=1, max_output_bytes=64)
        sandbox.execute(
            ActionRequest("read_file", {"path": "/workspace/input/request.txt"})
        )
        with self.assertRaisesRegex(SandboxViolation, "action_budget_exhausted"):
            sandbox.execute(
                ActionRequest("read_file", {"path": "/workspace/input/request.txt"})
            )

        small_output = build_sandbox(max_output_bytes=2)
        with self.assertRaisesRegex(SandboxViolation, "output_budget_exhausted"):
            small_output.execute(
                ActionRequest("read_file", {"path": "/workspace/input/request.txt"})
            )


if __name__ == "__main__":
    unittest.main()
