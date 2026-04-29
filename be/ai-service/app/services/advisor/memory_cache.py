from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient


@dataclass
class SessionMemory:
    _sessions: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    max_messages: int = 20

    def append(self, session_id: str, role: str, content: str) -> None:
        bucket = self._sessions.setdefault(session_id, [])
        bucket.append({"role": role, "content": content})
        if len(bucket) > self.max_messages:
            del bucket[0 : len(bucket) - self.max_messages]

    def get(self, session_id: str) -> list[dict[str, Any]]:
        return list(self._sessions.get(session_id, []))


class MemoryStore:
    def __init__(self) -> None:
        self.session_memory = SessionMemory()
        self.mongo_uri = os.getenv("MONGODB_URI", "").strip()
        self.mongo_db = os.getenv("MONGODB_DB", "finance").strip()
        self.redis_url = os.getenv("REDIS_URL", "").strip()
        self._mongo: AsyncIOMotorClient | None = None
        self._redis = None
        self._fallback_cache: dict[str, str] = {}

    async def ensure_connections(self) -> None:
        if self.mongo_uri and self._mongo is None:
            self._mongo = AsyncIOMotorClient(self.mongo_uri)

        if self.redis_url and self._redis is None:
            try:
                from redis.asyncio import from_url

                self._redis = from_url(self.redis_url, decode_responses=True)
            except Exception:
                self._redis = None

    async def get_user_preferences(self, user_id: str) -> dict[str, Any]:
        await self.ensure_connections()
        if not self._mongo:
            return {}

        document = await self._mongo[self.mongo_db]["user_preferences"].find_one({"userId": user_id})
        if not document:
            return {}
        document.pop("_id", None)
        return document

    async def upsert_user_preferences(self, user_id: str, preferences: dict[str, Any]) -> None:
        await self.ensure_connections()
        if not self._mongo:
            return

        await self._mongo[self.mongo_db]["user_preferences"].update_one(
            {"userId": user_id},
            {"$set": {"userId": user_id, **preferences}},
            upsert=True,
        )

    async def get_cached_answer(self, key: str) -> dict[str, Any] | None:
        await self.ensure_connections()

        if self._redis is not None:
            raw = await self._redis.get(key)
            if raw:
                return json.loads(raw)

        raw_local = self._fallback_cache.get(key)
        return json.loads(raw_local) if raw_local else None

    async def set_cached_answer(self, key: str, value: dict[str, Any], ttl_seconds: int = 120) -> None:
        await self.ensure_connections()
        payload = json.dumps(value, ensure_ascii=False)

        if self._redis is not None:
            await self._redis.setex(key, ttl_seconds, payload)
            return

        self._fallback_cache[key] = payload
