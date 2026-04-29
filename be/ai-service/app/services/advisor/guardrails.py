from __future__ import annotations

import re
from typing import Any

FORBIDDEN_PATTERNS = [
    re.compile(r"loi\s*nhuan\s*(chac\s*chan|cam\s*ket)", re.IGNORECASE),
    re.compile(r"all\s*-?in", re.IGNORECASE),
    re.compile(r"dung\s*don\s*bay\s*cao", re.IGNORECASE),
]

EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_PATTERN = re.compile(r"\b(0|\+84)\d{8,10}\b")
ACCOUNT_PATTERN = re.compile(r"\b\d{9,16}\b")


def sanitize_pii(text: str) -> str:
    redacted = EMAIL_PATTERN.sub("[redacted-email]", text)
    redacted = PHONE_PATTERN.sub("[redacted-phone]", redacted)
    redacted = ACCOUNT_PATTERN.sub("[redacted-account]", redacted)
    return redacted


def apply_output_guardrails(answer: str) -> dict[str, Any]:
    violations: list[str] = []
    for pattern in FORBIDDEN_PATTERNS:
        if pattern.search(answer):
            violations.append(pattern.pattern)

    sanitized = sanitize_pii(answer)
    blocked = bool(violations)

    if blocked:
        sanitized = (
            "Minh khong the dua ra cam ket loi nhuan hoac khuyen nghi rui ro cao. "
            "Toi co the giup ban danh gia rui ro va xay dung ke hoach dau tu than trong hon."
        )

    return {
        "blocked": blocked,
        "violations": violations,
        "sanitized_answer": sanitized,
    }
