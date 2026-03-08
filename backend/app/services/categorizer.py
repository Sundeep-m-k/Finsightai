"""Simple rule-based categorization for transaction descriptions."""
from __future__ import annotations

from app.models import Transaction

# Keywords -> category (order matters: first match wins)
CATEGORY_RULES: list[tuple[list[str], str]] = [
    (["rent", "lease", "apartment", "housing"], "Rent"),
    (["groceries", "grocery", "supermarket", "food", "restaurant", "dining", "doordash", "uber eats", "grubhub"], "Food"),
    (["gas", "fuel", "uber", "lyft", "transit", "parking", "bus", "train"], "Transport"),
    (["netflix", "spotify", "hulu", "subscription", "prime", "disney"], "Subscriptions"),
    (["utilities", "electric", "water", "internet", "phone", "mobile"], "Utilities"),
    (["insurance", "health"], "Insurance"),
    (["tuition", "college", "university", "student", "bookstore"], "Education"),
    (["savings", "transfer to save", "deposit"], "Savings"),
    (["payment", "payoff", "credit card"], "Debt"),
]


def categorize(description: str) -> str:
    d = (description or "").lower()
    for keywords, category in CATEGORY_RULES:
        if any(k in d for k in keywords):
            return category
    return "Other"


def categorize_transactions(transactions: list[Transaction]) -> list[Transaction]:
    return [
        Transaction(date=t.date, amount=t.amount, description=t.description, category=categorize(t.description))
        for t in transactions
    ]
