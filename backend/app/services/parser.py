"""Parse CSV/Excel uploads into list of Transaction."""
from __future__ import annotations

import io
from typing import Any

import pandas as pd

from app.models import Transaction
from app.utils.currency import parse_amount
from app.utils.dates import parse_date


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Lower column names and strip."""
    df = df.copy()
    df.columns = [str(c).lower().strip() for c in df.columns]
    return df


def _infer_date_col(df: pd.DataFrame) -> str | None:
    for c in ["date", "transaction date", "posting date", "trans date"]:
        if c in df.columns:
            return c
    for c in df.columns:
        if "date" in c:
            return c
    return None


def _infer_amount_col(df: pd.DataFrame) -> str | None:
    for c in ["amount", "transaction amount", "debit", "credit", "total"]:
        if c in df.columns:
            return c
    for c in df.columns:
        if "amount" in c or "debit" in c or "credit" in c:
            return c
    return None


def _infer_description_col(df: pd.DataFrame) -> str | None:
    for c in ["description", "memo", "name", "merchant", "details"]:
        if c in df.columns:
            return c
    for c in df.columns:
        if "desc" in c or "memo" in c or "name" in c:
            return c
    return None


def parse_csv(content: bytes, filename: str = "") -> list[Transaction]:
    """Parse CSV bytes into Transactions."""
    df = pd.read_csv(io.BytesIO(content))
    return _dataframe_to_transactions(df)


def parse_excel(content: bytes, filename: str = "") -> list[Transaction]:
    """Parse Excel bytes (first sheet) into Transactions."""
    df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
    return _dataframe_to_transactions(df)


def _dataframe_to_transactions(df: pd.DataFrame) -> list[Transaction]:
    df = _normalize_columns(df)
    date_col = _infer_date_col(df)
    amount_col = _infer_amount_col(df)
    desc_col = _infer_description_col(df)

    if not date_col or not amount_col:
        return []

    out: list[Transaction] = []
    for _, row in df.iterrows():
        raw_date = row.get(date_col)
        raw_amt = row.get(amount_col)
        raw_desc = row.get(desc_col) if desc_col else ""
        d = parse_date(str(raw_date) if raw_date is not None else "")
        amt = parse_amount(raw_amt) if raw_amt is not None else None
        if d is None or amt is None:
            continue
        desc = str(raw_desc).strip() if raw_desc is not None else ""
        out.append(Transaction(date=d, amount=amt, description=desc[:500], category=""))
    return out


def parse_upload(content: bytes, content_type: str, filename: str = "") -> list[Transaction]:
    """Dispatch by content type or extension."""
    filename = (filename or "").lower()
    if "csv" in content_type or filename.endswith(".csv"):
        return parse_csv(content, filename)
    if "spreadsheet" in content_type or "excel" in content_type or filename.endswith((".xlsx", ".xls")):
        return parse_excel(content, filename)
    if filename.endswith(".csv"):
        return parse_csv(content, filename)
    if filename.endswith((".xlsx", ".xls")):
        return parse_excel(content, filename)
    return parse_csv(content, filename)
