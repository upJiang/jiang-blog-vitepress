from __future__ import annotations

import unittest

from pydantic import ValidationError

from contracts import (
    AuthContext,
    SearchCandidate,
    authorize_search,
    parse_search_arguments,
    search_candidate_schema,
)


def error_types(error: ValidationError) -> set[str]:
    return {item["type"] for item in error.errors()}


class SearchContractTests(unittest.TestCase):
    def test_candidate_model_is_the_single_schema_source(self) -> None:
        schema = search_candidate_schema()

        self.assertEqual(schema["required"], ["query", "limit"])
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(schema["properties"]["query"]["minLength"], 1)
        self.assertEqual(schema["properties"]["query"]["maxLength"], 500)
        self.assertEqual(schema["properties"]["limit"]["minimum"], 1)
        self.assertEqual(schema["properties"]["limit"]["maximum"], 20)

    def test_valid_candidate_is_normalized_once(self) -> None:
        candidate = parse_search_arguments({"query": " 设备合规要求 ", "limit": 5})

        self.assertIsInstance(candidate, SearchCandidate)
        self.assertEqual(candidate.query, "设备合规要求")
        self.assertEqual(candidate.limit, 5)

    def test_missing_fields_are_not_filled_with_local_defaults(self) -> None:
        for payload in ({"query": "设备合规要求"}, {"limit": 5}):
            with self.subTest(payload=payload):
                with self.assertRaises(ValidationError) as caught:
                    parse_search_arguments(payload)
                self.assertIn("missing", error_types(caught.exception))

    def test_model_cannot_supply_trusted_scope(self) -> None:
        with self.assertRaises(ValidationError) as caught:
            parse_search_arguments(
                {"query": "设备合规要求", "limit": 5, "scope_ids": ["other"]}
            )

        self.assertIn("extra_forbidden", error_types(caught.exception))

    def test_query_validation_is_strict_and_bounded(self) -> None:
        samples = [
            ({"query": "   ", "limit": 5}, "string_too_short"),
            ({"query": "x" * 501, "limit": 5}, "string_too_long"),
            ({"query": 12, "limit": 5}, "string_type"),
        ]

        for payload, expected in samples:
            with self.subTest(payload=payload):
                with self.assertRaises(ValidationError) as caught:
                    parse_search_arguments(payload)
                self.assertIn(expected, error_types(caught.exception))

    def test_limit_validation_rejects_coercion_and_out_of_range_values(self) -> None:
        samples = [
            (0, "greater_than_equal"),
            (21, "less_than_equal"),
            (True, "int_type"),
            ("5", "int_type"),
        ]

        for value, expected in samples:
            with self.subTest(value=value):
                with self.assertRaises(ValidationError) as caught:
                    parse_search_arguments({"query": "设备合规要求", "limit": value})
                self.assertIn(expected, error_types(caught.exception))

    def test_command_uses_only_authenticated_scope(self) -> None:
        candidate = parse_search_arguments({"query": "设备合规要求", "limit": 5})
        command = authorize_search(
            candidate,
            AuthContext("current_user", ("authorized_scope",), "active_release"),
        )

        self.assertEqual(command.query, candidate.query)
        self.assertEqual(command.limit, candidate.limit)
        self.assertEqual(command.user_id, "current_user")
        self.assertEqual(command.scope_ids, ("authorized_scope",))
        self.assertEqual(command.release_id, "active_release")

    def test_missing_authentication_data_cannot_create_a_command(self) -> None:
        candidate = parse_search_arguments({"query": "设备合规要求", "limit": 5})
        samples = [
            AuthContext("", ("authorized_scope",), "active_release"),
            AuthContext("current_user", (), "active_release"),
            AuthContext("current_user", ("authorized_scope",), ""),
        ]

        for auth in samples:
            with self.subTest(auth=auth):
                with self.assertRaisesRegex(PermissionError, "search_scope_is_missing"):
                    authorize_search(candidate, auth)


if __name__ == "__main__":
    unittest.main()
