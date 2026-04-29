from __future__ import annotations


def to_float(value: object) -> float:
    try:
        parsed = float(value)  # type: ignore[arg-type]
        if parsed != parsed:  # NaN
            return 0.0
        return parsed
    except (TypeError, ValueError):
        return 0.0


def compute_total_income(transactions: list[dict]) -> float:
    return round(
        sum(
            to_float(item.get("amount"))
            for item in transactions
            if str(item.get("type", "")).upper() in {"INCOME", "THU"}
        ),
        2,
    )


def compute_total_expense(transactions: list[dict]) -> float:
    return round(
        sum(
            to_float(item.get("amount"))
            for item in transactions
            if str(item.get("type", "")).upper() in {"EXPENSE", "CHI"}
        ),
        2,
    )


def compute_savings_rate(total_income: float, total_expense: float) -> float:
    if total_income <= 0:
        return 0.0
    return round(max(total_income - total_expense, 0.0) / total_income * 100.0, 2)


def compute_roi(total_current_value: float, total_invested: float) -> float:
    if total_invested <= 0:
        return 0.0
    return round((total_current_value - total_invested) / total_invested * 100.0, 2)
