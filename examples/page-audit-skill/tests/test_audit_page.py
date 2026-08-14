from __future__ import annotations

import email.message
import io
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "scripts"))

from audit_page import AuditError, HeadFieldsParser, MAX_RESPONSE_BYTES, audit_page, validate_url


class FakeResponse:
    def __init__(self, body: bytes, *, content_type: str = "text/html", status: int = 200) -> None:
        self._body = io.BytesIO(body)
        self._status = status
        self.headers = email.message.Message()
        self.headers["Content-Type"] = f"{content_type}; charset=utf-8"

    def getcode(self) -> int:
        return self._status

    def geturl(self) -> str:
        return "https://example.com/final"

    def read(self, size: int = -1) -> bytes:
        return self._body.read(size)

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        pass


class FakeOpener:
    def __init__(self, response: FakeResponse) -> None:
        self.response = response

    def open(self, request: object, timeout: float) -> FakeResponse:
        self.timeout = timeout
        return self.response


class PageAuditTests(unittest.TestCase):
    def test_parser_handles_multiline_attributes_and_text(self) -> None:
        parser = HeadFieldsParser()
        parser.feed(
            """<html><head><title>  Example\n title </title>
            <link href='/canonical' rel='alternate canonical'>
            <meta content='noindex,follow' name='ROBOTS'></head></html>"""
        )
        self.assertEqual(parser.title, "Example title")
        self.assertEqual(parser.canonical, "/canonical")
        self.assertEqual(parser.robots, "noindex,follow")

    def test_audit_returns_structured_raw_html_facts(self) -> None:
        response = FakeResponse(
            b"<title>Example</title><link rel='canonical' href='/canonical'><meta name='robots' content='index'>"
        )
        facts = audit_page(
            "https://example.com/start",
            {"example.com"},
            opener=FakeOpener(response),
            resolve_dns=False,
        )
        self.assertEqual(facts.final_url, "https://example.com/final")
        self.assertEqual(facts.canonical, "https://example.com/canonical")
        self.assertEqual(facts.evidence, "raw_html")

    def test_rejects_non_html_and_large_responses(self) -> None:
        with self.assertRaisesRegex(AuditError, "expected text/html"):
            audit_page(
                "https://example.com/file",
                {"example.com"},
                opener=FakeOpener(FakeResponse(b"{}", content_type="application/json")),
                resolve_dns=False,
            )
        with self.assertRaisesRegex(AuditError, "response exceeds"):
            audit_page(
                "https://example.com/large",
                {"example.com"},
                opener=FakeOpener(FakeResponse(b"x" * (MAX_RESPONSE_BYTES + 1))),
                resolve_dns=False,
            )

    def test_rejects_unsafe_or_unapproved_urls(self) -> None:
        for url in (
            "file:///etc/passwd",
            "https://user:secret@example.com/",
            "https://other.example/",
        ):
            with self.subTest(url=url), self.assertRaises(AuditError):
                validate_url(url, {"example.com"}, resolve_dns=False)


if __name__ == "__main__":
    unittest.main()
