from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_PROMPT_DIR = Path(__file__).parent.parent.parent.parent / "prompts"

def _load(name: str) -> str:
    return (_PROMPT_DIR / name).read_text(encoding="utf-8")

ADVISOR_SYSTEM = _load("advisor_system.txt")
INTENT_ROUTER  = _load("intent_router.txt")


def build_advisor_system_prompt(
    *,
    financial_profile: dict[str, Any],
    risk_profile: str | None,
    calculations: dict[str, Any],
    tool_context: dict[str, Any],
    short_term_memory: list[dict[str, Any]],
) -> str:
    route = str(tool_context.get("route") or "unknown")
    return ADVISOR_SYSTEM.format(
        route=route,
        financial_profile=json.dumps(financial_profile, ensure_ascii=False),
        risk_profile=risk_profile or "unknown",
        calculations=json.dumps(calculations, ensure_ascii=False),
        tool_context=json.dumps(tool_context, ensure_ascii=False),
        recent_messages=json.dumps(short_term_memory[-6:], ensure_ascii=False),
    )
