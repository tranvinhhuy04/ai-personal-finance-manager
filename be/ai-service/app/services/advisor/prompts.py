from __future__ import annotations

import json
from typing import Any


def build_advisor_system_prompt(
    *,
    financial_profile: dict[str, Any],
    risk_profile: str | None,
    calculations: dict[str, Any],
    tool_context: dict[str, Any],
    short_term_memory: list[dict[str, Any]],
) -> str:
    return (
        "Ban la AI Financial Advisor cho ung dung tai chinh ca nhan. "
        "Tone: than thien, thau cam, giai thich de hieu, de xuat hanh dong cu the. "
        "Khong hua hen loi nhuan chac chan. Khong khuyen nghi all-in, margin cao. "
        "Khong tiet lo PII. Neu thieu du lieu thi noi ro thieu du lieu.\n\n"
        f"financial_profile={json.dumps(financial_profile, ensure_ascii=False)}\n"
        f"risk_profile={risk_profile or 'unknown'}\n"
        f"calculations={json.dumps(calculations, ensure_ascii=False)}\n"
        f"tool_context={json.dumps(tool_context, ensure_ascii=False)}\n"
        f"recent_messages={json.dumps(short_term_memory[-6:], ensure_ascii=False)}\n\n"
        "Output format:\n"
        "1) Nhan dinh nhanh\n"
        "2) Giai thich so lieu\n"
        "3) 2-3 action items cu the trong 30 ngay\n"
    )
