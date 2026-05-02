from __future__ import annotations

import asyncio
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

from app.services.advisor.schemas import AdvisorToolResult, ExtractedEntities


class RetrievalLayer:
    def __init__(self) -> None:
        self.mongo_uri = os.getenv("MONGODB_URI", "").strip()
        self.mongo_db = os.getenv("MONGODB_DB", "finance").strip()
        self.vector_index_name = os.getenv("ATLAS_VECTOR_INDEX", "knowledge_embedding_index").strip()
        self.exchangerate_api = os.getenv("EXCHANGE_RATE_API", "https://open.er-api.com/v6/latest/USD").strip()
        self.gold_price_api = os.getenv("GOLD_PRICE_API", "https://api.gold-api.com/price/XAU/USD").strip()
        self.domestic_gold_price_url = os.getenv("DOMESTIC_GOLD_PRICE_URL", "https://www.24h.com.vn/gia-vang-hom-nay-c425.html").strip()

        self.mongo_client: AsyncIOMotorClient | None = None
        if self.mongo_uri:
            self.mongo_client = AsyncIOMotorClient(self.mongo_uri)

    def _collection(self, name: str):
        if not self.mongo_client:
            return None
        return self.mongo_client[self.mongo_db][name]

    @staticmethod
    def _resolve_time_range(label: str | None) -> tuple[datetime | None, datetime | None]:
        now = datetime.now(timezone.utc)
        if not label:
            return None, None

        normalized = label.strip().lower()
        if normalized in {"thang_nay", "month_current", "this_month"}:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            return start, now
        if normalized in {"thang_truoc", "last_month"}:
            first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_prev = first_this_month - timedelta(days=1)
            start_prev = last_prev.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_prev = first_this_month - timedelta(seconds=1)
            return start_prev, end_prev
        if normalized in {"nam_nay", "this_year", "year_current"}:
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            return start, now

        return None, None

    async def fetch_structured_data(
        self,
        *,
        user_id: str,
        intent: str,
        entities: ExtractedEntities,
    ) -> dict[str, Any]:
        transactions_col = self._collection("transactions")
        savings_col = self._collection("savings")
        investments_col = self._collection("investments")

        start_date, end_date = self._resolve_time_range(entities.time_range)
        match_and: list[dict[str, Any]] = [{"$or": [{"userId": user_id}, {"user_id": user_id}]}]
        if start_date and end_date:
            match_and.append(
                {
                    "$or": [
                        {"transactionDate": {"$gte": start_date, "$lte": end_date}},
                        {"transaction_date": {"$gte": start_date, "$lte": end_date}},
                        {"occurred_at": {"$gte": start_date, "$lte": end_date}},
                    ]
                }
            )
        match: dict[str, Any] = {"$and": match_and}

        result: dict[str, Any] = {
            "transactions": [],
            "summary": {"totalIncome": 0, "totalExpense": 0},
            "savingsBalance": 0,
            "investment": {"totalCurrentValue": 0, "totalInvested": 0},
        }

        if transactions_col is not None and intent in {"transaction_lookup", "financial_advice", "chart_analysis"}:
            pipeline = [
                {"$match": match},
                {
                    "$addFields": {
                        "normalized_type": {"$ifNull": ["$type", "$transaction_type"]},
                        "normalized_date": {"$ifNull": ["$transactionDate", {"$ifNull": ["$transaction_date", "$occurred_at"]}]},
                        "categoryObjId": {
                            "$convert": {
                                "input": "$category_id",
                                "to": "objectId",
                                "onError": None,
                                "onNull": None,
                            }
                        },
                    }
                },
                {
                    "$lookup": {
                        "from": "categories",
                        "localField": "categoryObjId",
                        "foreignField": "_id",
                        "as": "categoryDoc",
                    }
                },
                {
                    "$addFields": {
                        "normalized_category": {
                            "$ifNull": ["$category", {"$ifNull": ["$categoryName", {"$first": "$categoryDoc.name"}]}]
                        }
                    }
                },
                *([
                    {"$match": {"normalized_category": entities.category}}
                ] if entities.category else []),
                {
                    "$group": {
                        "_id": "$normalized_type",
                        "total": {"$sum": {"$toDouble": "$amount"}},
                        "items": {
                            "$push": {
                                "amount": "$amount",
                                "type": "$normalized_type",
                                "category": "$normalized_category",
                                "transactionDate": "$normalized_date",
                            }
                        },
                    }
                },
            ]
            grouped = await transactions_col.aggregate(pipeline).to_list(length=10)
            merged_items: list[dict[str, Any]] = []
            for item in grouped:
                key = str(item.get("_id", "")).upper()
                total = float(item.get("total", 0) or 0)
                if key in {"INCOME", "THU"}:
                    result["summary"]["totalIncome"] = total
                elif key in {"EXPENSE", "CHI"}:
                    result["summary"]["totalExpense"] = total
                merged_items.extend(item.get("items", []))
            result["transactions"] = merged_items

        if savings_col is not None:
            saving_doc = await savings_col.aggregate([
                {"$match": {"$or": [{"userId": user_id}, {"user_id": user_id}]}},
                {"$group": {"_id": None, "balance": {"$sum": {"$toDouble": {"$ifNull": ["$currentAmount", "$current_amount"]}}}}},
            ]).to_list(length=1)
            result["savingsBalance"] = float((saving_doc[0].get("balance") if saving_doc else 0) or 0)

        has_investment_data = False
        if investments_col is not None:
            investment_doc = await investments_col.aggregate([
                {"$match": {"$or": [{"userId": user_id}, {"user_id": user_id}]}},
                {
                    "$group": {
                        "_id": None,
                        "totalCurrentValue": {"$sum": {"$toDouble": {"$ifNull": ["$currentValue", "$current_value"]}}},
                        "totalInvested": {"$sum": {"$toDouble": {"$ifNull": ["$investedAmount", "$invested_amount"]}}},
                    }
                },
            ]).to_list(length=1)
            if investment_doc:
                result["investment"] = {
                    "totalCurrentValue": float(investment_doc[0].get("totalCurrentValue", 0) or 0),
                    "totalInvested": float(investment_doc[0].get("totalInvested", 0) or 0),
                }
                has_investment_data = True

        if not has_investment_data and savings_col is not None:
            investment_doc = await savings_col.aggregate([
                {
                    "$match": {
                        "$or": [{"userId": user_id}, {"user_id": user_id}],
                        "type": "INVESTMENT",
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "totalCurrentValue": {"$sum": {"$toDouble": {"$ifNull": ["$currentAmount", "$current_amount"]}}},
                        "totalInvested": {"$sum": {"$toDouble": {"$ifNull": ["$targetAmount", "$target_amount"]}}},
                    }
                },
            ]).to_list(length=1)
            if investment_doc:
                result["investment"] = {
                    "totalCurrentValue": float(investment_doc[0].get("totalCurrentValue", 0) or 0),
                    "totalInvested": float(investment_doc[0].get("totalInvested", 0) or 0),
                }

        return result

    async def fetch_unstructured_context(self, query: str, embedding_vector: list[float] | None) -> list[dict[str, Any]]:
        knowledge_col = self._collection("financial_knowledge")
        if knowledge_col is None or embedding_vector is None:
            return []

        pipeline = [
            {
                "$vectorSearch": {
                    "index": self.vector_index_name,
                    "path": "embedding",
                    "queryVector": embedding_vector,
                    "numCandidates": 100,
                    "limit": 4,
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "title": 1,
                    "content": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]

        try:
            docs = await knowledge_col.aggregate(pipeline).to_list(length=4)
            return docs
        except Exception:
            return []

    async def fetch_external_data(self) -> dict[str, Any]:
        async def fetch_json(url: str) -> dict[str, Any]:
            if not url:
                return {}
            async with httpx.AsyncClient(timeout=httpx.Timeout(3.0, connect=1.0)) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()

        async def fetch_text(url: str) -> str:
            if not url:
                return ""
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0, connect=2.0), follow_redirects=True) as client:
                response = await client.get(
                    url,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                    },
                )
                response.raise_for_status()
                return response.text

        def parse_domestic_sjc(html: str, fetched_at: str) -> dict[str, Any]:
            if not html:
                return {}

            row_match = re.search(
                r'<tr[^>]*data-seach="sjc"[^>]*>.*?<span class="fixW">([\d,\.]+)</span>.*?<span class="fixW">([\d,\.]+)</span>',
                html,
                re.IGNORECASE | re.DOTALL,
            )
            date_match = re.search(r'Hôm nay \((\d{2}/\d{2}/\d{4})\)', html, re.IGNORECASE)
            if not row_match:
                return {}

            def parse_thousand_vnd(raw: str) -> float | None:
                digits = re.sub(r'[^\d]', '', raw)
                if not digits:
                    return None
                return float(digits) * 1000

            buy_price = parse_thousand_vnd(row_match.group(1))
            sell_price = parse_thousand_vnd(row_match.group(2))
            return {
                "provider": "24h_domestic_gold",
                "brand": "SJC",
                "buy_vnd_per_luong": buy_price,
                "sell_vnd_per_luong": sell_price,
                "page_date": date_match.group(1) if date_match else None,
                "updated_at": fetched_at,
            }

        fetched_at = datetime.now(timezone.utc).isoformat()
        try:
            exchange_task = fetch_json(self.exchangerate_api)
            gold_task = fetch_json(self.gold_price_api)
            domestic_gold_task = fetch_text(self.domestic_gold_price_url)
            exchange_data, gold_data, domestic_gold_html = await asyncio.gather(exchange_task, gold_task, domestic_gold_task)
        except Exception:
            exchange_data = {}
            gold_data = {}
            domestic_gold_html = ""
        return {
            "exchange": {
                "provider": "open_er_api",
                "base_code": exchange_data.get("base_code") or exchange_data.get("base") or "USD",
                "updated_at": exchange_data.get("time_last_update_utc") or exchange_data.get("time_last_update_unix"),
                "rates": exchange_data.get("rates") if isinstance(exchange_data.get("rates"), dict) else {},
            },
            "gold": {
                "provider": "gold_api",
                "symbol": gold_data.get("symbol") or "XAU",
                "currency": gold_data.get("currency") or "USD",
                "price_usd_per_ounce": gold_data.get("price"),
                "updated_at": gold_data.get("updatedAt"),
                "updated_at_readable": gold_data.get("updatedAtReadable"),
            },
            "domestic_gold": parse_domestic_sjc(domestic_gold_html, fetched_at),
        }

    async def execute(
        self,
        *,
        user_id: str,
        message: str,
        intent: str,
        entities: ExtractedEntities,
        embedding_vector: list[float] | None,
    ) -> AdvisorToolResult:
        structured_task = self.fetch_structured_data(user_id=user_id, intent=intent, entities=entities)
        external_task = self.fetch_external_data()

        unstructured_context: list[dict[str, Any]] = []
        if intent in {"general_knowledge", "financial_advice"}:
            unstructured_context = await self.fetch_unstructured_context(message, embedding_vector)

        structured_data, external_data = await asyncio.gather(structured_task, external_task)

        return AdvisorToolResult(
            structured_data=structured_data,
            unstructured_context=unstructured_context,
            external_data=external_data,
        )
