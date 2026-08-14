#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ipaddress
import json
import socket
import sys
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from typing import BinaryIO, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_RESPONSE_BYTES = 1_048_576
USER_AGENT = "page-audit-skill/1.0"


class AuditError(Exception):
    pass


class Response(Protocol):
    headers: object

    def getcode(self) -> int: ...

    def geturl(self) -> str: ...

    def read(self, size: int = -1) -> bytes: ...

    def __enter__(self) -> "Response": ...

    def __exit__(self, *args: object) -> None: ...


class Opener(Protocol):
    def open(self, request: Request, timeout: float) -> Response: ...


@dataclass(frozen=True)
class PageFacts:
    status: int
    final_url: str
    title: str | None
    canonical: str | None
    robots: str | None
    evidence: str = "raw_html"


class HeadFieldsParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title: str | None = None
        self.canonical: str | None = None
        self.robots: str | None = None
        self._inside_title = False
        self._title_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.casefold(): value for key, value in attrs}
        lowered = tag.casefold()
        if lowered == "title" and self.title is None:
            self._inside_title = True
            self._title_parts = []
        elif lowered == "link" and self.canonical is None:
            rel = (values.get("rel") or "").casefold().split()
            href = values.get("href")
            if "canonical" in rel and href:
                self.canonical = href.strip()
        elif lowered == "meta" and self.robots is None:
            if (values.get("name") or "").casefold() == "robots":
                content = values.get("content")
                if content:
                    self.robots = content.strip()

    def handle_data(self, data: str) -> None:
        if self._inside_title:
            self._title_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.casefold() == "title" and self._inside_title:
            value = " ".join("".join(self._title_parts).split())
            if value:
                self.title = value
            self._inside_title = False


def validate_url(url: str, allowed_hosts: set[str], *, resolve_dns: bool = True) -> str:
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"}:
        raise AuditError("only http and https URLs are allowed")
    if parsed.username or parsed.password:
        raise AuditError("URL userinfo is not allowed")
    hostname = (parsed.hostname or "").rstrip(".").casefold()
    if not hostname or hostname not in allowed_hosts:
        raise AuditError(f"host is outside the allowlist: {hostname or '<missing>'}")
    if resolve_dns:
        addresses = {
            item[4][0]
            for item in socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
        }
        for value in addresses:
            address = ipaddress.ip_address(value)
            if not address.is_global:
                raise AuditError(f"host resolves to a non-public address: {address}")
    return hostname


class ValidatingRedirectHandler(HTTPRedirectHandler):
    def __init__(self, allowed_hosts: set[str]) -> None:
        super().__init__()
        self.allowed_hosts = allowed_hosts

    def redirect_request(
        self,
        req: Request,
        fp: BinaryIO,
        code: int,
        msg: str,
        headers: object,
        newurl: str,
    ) -> Request | None:
        target = urljoin(req.full_url, newurl)
        validate_url(target, self.allowed_hosts)
        return super().redirect_request(req, fp, code, msg, headers, target)


def audit_page(
    url: str,
    allowed_hosts: set[str],
    *,
    opener: Opener | None = None,
    resolve_dns: bool = True,
) -> PageFacts:
    normalized_hosts = {host.rstrip(".").casefold() for host in allowed_hosts}
    validate_url(url, normalized_hosts, resolve_dns=resolve_dns)
    client = opener or build_opener(ValidatingRedirectHandler(normalized_hosts))
    request = Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with client.open(request, timeout=10) as response:
            final_url = response.geturl()
            validate_url(final_url, normalized_hosts, resolve_dns=resolve_dns)
            content_type = response.headers.get_content_type()
            if content_type != "text/html":
                raise AuditError(f"expected text/html, got {content_type}")
            body = response.read(MAX_RESPONSE_BYTES + 1)
            if len(body) > MAX_RESPONSE_BYTES:
                raise AuditError(f"response exceeds {MAX_RESPONSE_BYTES} bytes")
            charset = response.headers.get_content_charset() or "utf-8"
            html = body.decode(charset, errors="replace")
            parser = HeadFieldsParser()
            parser.feed(html)
            canonical = urljoin(final_url, parser.canonical) if parser.canonical else None
            return PageFacts(
                status=response.getcode(),
                final_url=final_url,
                title=parser.title,
                canonical=canonical,
                robots=parser.robots,
            )
    except HTTPError as error:
        raise AuditError(f"HTTP {error.code}: {error.reason}") from error
    except URLError as error:
        raise AuditError(f"network error: {error.reason}") from error


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--allow-host", action="append", required=True)
    args = parser.parse_args()
    try:
        facts = audit_page(args.url, set(args.allow_host))
    except AuditError as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 2
    print(json.dumps({"ok": True, **asdict(facts)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
