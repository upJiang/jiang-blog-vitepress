from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AccessSnapshot:
    user_id: str
    subjects: frozenset[str]
    group_ids: frozenset[str]
    scope_ids: frozenset[str]
    is_admin: bool = False


@dataclass(frozen=True)
class Chunk:
    id: str
    document_id: str
    root_node_id: str
    release_id: str
    content: str
    visibility_scope: str = "public"
    visibility_subjects: frozenset[str] = frozenset()
    required_groups: frozenset[str] = frozenset()
    creator_id: str = ""
    ready: bool = True
    revoked: bool = False


class CandidateCache:
    def __init__(self) -> None:
        self._values: dict[str, tuple[str, ...]] = {}

    def get(self, key: str) -> tuple[str, ...] | None:
        return self._values.get(key)

    def set(self, key: str, chunk_ids: list[str]) -> None:
        self._values[key] = tuple(chunk_ids)


class SecureReleaseRetriever:
    def __init__(self, chunks: list[Chunk], cache: CandidateCache) -> None:
        self.chunks = {chunk.id: chunk for chunk in chunks}
        self.cache = cache
        self.search_calls = 0

    @staticmethod
    def _visible(chunk: Chunk, access: AccessSnapshot, release_id: str) -> bool:
        if not chunk.ready or chunk.revoked or chunk.release_id != release_id:
            return False
        if access.scope_ids and not (
            {chunk.root_node_id, chunk.document_id} & access.scope_ids
        ):
            return False
        if chunk.required_groups and not (chunk.required_groups & access.group_ids):
            return False
        if access.is_admin or chunk.creator_id == access.user_id:
            return True
        if chunk.visibility_scope in {"", "public"}:
            return True
        return bool(chunk.visibility_subjects & access.subjects)

    def search(
        self,
        *,
        query: str,
        release_id: str,
        access: AccessSnapshot,
    ) -> list[Chunk]:
        # 缓存键固定版本和调用方范围，缓存值仍要在命中后重新鉴权。
        key = "|".join(
            (
                query.casefold().strip(),
                release_id,
                ",".join(sorted(access.scope_ids)),
            )
        )
        cached_ids = self.cache.get(key)
        if cached_ids is None:
            self.search_calls += 1
            candidate_ids = [
                chunk.id
                for chunk in self.chunks.values()
                if query.casefold() in chunk.content.casefold()
                and self._visible(chunk, access, release_id)
            ]
            self.cache.set(key, candidate_ids)
        else:
            candidate_ids = list(cached_ids)

        return [
            chunk
            for chunk_id in candidate_ids
            if (chunk := self.chunks.get(chunk_id)) is not None
            and self._visible(chunk, access, release_id)
        ]

    def revoke(self, chunk_id: str) -> None:
        chunk = self.chunks[chunk_id]
        self.chunks[chunk_id] = Chunk(**{**chunk.__dict__, "revoked": True})


def run_demo() -> dict[str, object]:
    cache = CandidateCache()
    retriever = SecureReleaseRetriever(
        [
            Chunk(
                "chunk-v7",
                "doc-remote",
                "node-remote",
                "release-7",
                "远程访问需要设备合规。",
                "group",
                frozenset({"dept:security"}),
            ),
            Chunk(
                "chunk-v8",
                "doc-remote",
                "node-remote",
                "release-8",
                "远程访问需要新的审批流程。",
                "group",
                frozenset({"dept:security"}),
            ),
        ],
        cache,
    )
    access = AccessSnapshot(
        "reader-1",
        frozenset({"user:reader-1", "dept:security"}),
        frozenset(),
        frozenset({"node-remote"}),
    )
    first = retriever.search(query="远程访问", release_id="release-7", access=access)
    second = retriever.search(query="远程访问", release_id="release-7", access=access)
    retriever.revoke("chunk-v7")
    after_revoke = retriever.search(
        query="远程访问",
        release_id="release-7",
        access=access,
    )
    return {
        "first": [chunk.id for chunk in first],
        "cached": [chunk.id for chunk in second],
        "after_revoke": [chunk.id for chunk in after_revoke],
        "search_calls": retriever.search_calls,
    }


if __name__ == "__main__":
    print(run_demo())
