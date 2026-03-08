from __future__ import annotations

from io import BytesIO
from typing import Any

import pandas as pd

from models import CategoryAggregate


CATEGORY_RULES: dict[str, list[str]] = {
    "dining": [
        "restaurant", "restaurtant", "mcdonald", "starbucks", "doordash",
        "ubereats", "uber eats", "grubhub", "chipotle", "pizza", "sushi",
        "cafe", "coffee", "burger", "taco", "subway", "dominos", "royal indian",
        "dining", "eat", "food delivery",
    ],
    "groceries": [
        "walmart", "target", "kroger", "safeway", "trader joe", "whole foods",
        "aldi", "costco", "grocery", "groceries", "supermarket", "egg", "rice",
        "oil", "chicken", "banana", "avocado", "cilantro",
    ],
    "transport": [
        "uber", "lyft", "gas", "parking", "metro", "transit", "subway pass",
        "bus", "shell", "bp", "chevron", "exxon", "trip", "travel",
    ],
    "rent": ["rent", "apartment", "lease", "housing", "landlord", "mather street"],
    "subscriptions": [
        "netflix", "spotify", "hulu", "disney", "amazon prime", "apple",
        "google", "youtube", "subscription", "monthly", "lovable", "drive",
        "applecare", "gym subscription", "splitwise", "zolve annual fee",
    ],
    "entertainment": [
        "cinema", "movie", "concert", "ticketmaster", "bar", "club",
        "bowling", "arcade", "steam", "playstation", "alcohol",
    ],
    "education": [
        "tuition", "university", "college", "bookstore", "course",
        "udemy", "coursera", "textbook", "education",
    ],
    "health": [
        "pharmacy", "cvs", "walgreens", "doctor", "hospital", "clinic",
        "insurance", "gym", "fitness", "healthcare",
    ],
    "debt_payment": [
        "loan payment", "student loan", "credit card payment", "minimum payment",
        "navient", "sallie mae",
    ],
    "income": [
        "payroll", "direct deposit", "salary", "transfer in", "venmo credit",
        "zelle credit", "deposit", "income", "stipend", "refund",
    ],
    "savings_transfer": [
        "savings", "transfer to savings", "high yield",
    ],
    "other": [],
}


CATEGORY_MAP: dict[str, str] = {
    "restaurtant food": "dining",
    "restaurant food": "dining",
    "dining": "dining",
    "groceries": "groceries",
    "housing rent": "rent",
    "rent": "rent",
    "productivity and subscriptions": "subscriptions",
    "subscriptions": "subscriptions",
    "local transportation": "transport",
    "travel expenses": "transport",
    "transport": "transport",
    "education expenses": "education",
    "education": "education",
    "healthcare and insurance": "health",
    "health": "health",
    "family expenses": "other",
    "friends expenses": "other",
    "clothing and shopping": "other",
    "beauty and personal care": "other",
    "alcohol": "entertainment",
    "entertainment": "entertainment",
    "electronic accessories": "other",
    "shopping": "other",
    "trips": "transport",
    "income": "income",
    "savings": "savings_transfer",
    "debt payment": "debt_payment",
}


MONTH_PREFIXES = {
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
}


COLUMN_ALIASES: dict[str, list[str]] = {
    "date": ["date", "transaction date", "posted date"],
    "description": ["description", "memo", "narration", "details", "merchant", "name"],
    "category": ["category", "expense category", "type"],
    "amount": [
        "amount",
        "amount in usd",
        "amount in usd/other",
        "transaction amount",
        "usd amount",
    ],
    "debit": ["debit", "withdrawal", "amount debited in inr"],
    "credit": ["credit", "deposit amount"],
    "funding_source": ["funding source", "source"],
}


def _clean_label(value: Any) -> str:
    return str(value).strip().lower().replace("_", " ")


def _find_matching_alias(column_name: str) -> str | None:
    clean = _clean_label(column_name)
    for standard, aliases in COLUMN_ALIASES.items():
        if clean in aliases:
            return standard
    return None


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map: dict[str, str] = {}
    for col in df.columns:
        matched = _find_matching_alias(col)
        if matched:
            rename_map[col] = matched
    return df.rename(columns=rename_map)


def _is_monthly_sheet(sheet_name: str) -> bool:
    name = str(sheet_name).strip().lower()
    parts = name.split()
    return len(parts) >= 2 and parts[0][:3] in MONTH_PREFIXES


def _load_excel_sheets(file_bytes: bytes) -> dict[str, pd.DataFrame]:
    return pd.read_excel(BytesIO(file_bytes), sheet_name=None, header=None)


def _load_csv(file_bytes: bytes) -> pd.DataFrame:
    return pd.read_csv(BytesIO(file_bytes))


def _looks_like_header_row(row_values: list[Any]) -> bool:
    cleaned = {_clean_label(v) for v in row_values if pd.notna(v) and str(v).strip()}
    needed = {"date"}
    optional_hits = 0

    for value in cleaned:
        matched = _find_matching_alias(value)
        if matched in {"description", "category", "amount", "debit", "credit"}:
            optional_hits += 1

    return "date" in cleaned or (needed <= cleaned and optional_hits >= 1)


def _extract_table_from_sheet(raw_sheet: pd.DataFrame) -> pd.DataFrame:
    header_row_idx: int | None = None

    scan_limit = min(len(raw_sheet), 20)
    for idx in range(scan_limit):
        row_values = raw_sheet.iloc[idx].tolist()
        if _looks_like_header_row(row_values):
            header_row_idx = idx
            break

    if header_row_idx is None:
        raise ValueError("Could not detect transaction table header row in sheet.")

    header_row = raw_sheet.iloc[header_row_idx].tolist()

    # Find the transaction table boundary from left to right.
    # We only want columns up to "Funding source".
    last_useful_col = None
    for i, value in enumerate(header_row):
        clean = _clean_label(value)
        if clean in {"funding source", "source"}:
            last_useful_col = i
            break

    # Fallback: keep first 11 columns if "Funding source" is not found
    if last_useful_col is None:
        last_useful_col = 10

    trimmed_sheet = raw_sheet.iloc[:, : last_useful_col + 1].copy()

    header = [
        str(x).strip() if pd.notna(x) else f"unnamed_{i}"
        for i, x in enumerate(trimmed_sheet.iloc[header_row_idx].tolist())
    ]

    data = trimmed_sheet.iloc[header_row_idx + 1 :].copy()
    data.columns = header

    data = data.dropna(how="all")

    # Remove unnamed columns
    data = data.loc[:, ~data.columns.astype(str).str.startswith("unnamed_")]

    # Normalize names
    data = _normalize_columns(data)

    wanted = [
        col for col in ["date", "category", "description", "amount", "debit", "credit", "funding_source"]
        if col in data.columns
    ]
    data = data[wanted].copy()

    if "date" not in data.columns:
        raise ValueError("Detected table does not contain a date column.")

    return data


def _normalize_amount_series(series: pd.Series) -> pd.Series:
    return (
        series.astype(str)
        .str.replace("$", "", regex=False)
        .str.replace("₹", "", regex=False)
        .str.replace(",", "", regex=False)
        .str.strip()
        .replace({"": None, "nan": None, "None": None})
        .pipe(pd.to_numeric, errors="coerce")
    )


def _normalize_category(raw_category: Any, description: str, amount: float) -> str:
    if pd.notna(raw_category):
        category = _clean_label(raw_category)
        if category in CATEGORY_MAP:
            return CATEGORY_MAP[category]

    return classify_transaction(description=description, amount=amount)


def _standardize_dataframe(df: pd.DataFrame, source_type: str, sheet_name: str | None = None) -> pd.DataFrame:
    df = df.copy()
    df = _normalize_columns(df)

    if "description" not in df.columns:
        df["description"] = ""

    if "amount" in df.columns:
        df["amount"] = _normalize_amount_series(df["amount"])
    else:
        debit = _normalize_amount_series(df["debit"]) if "debit" in df.columns else pd.Series([0.0] * len(df))
        credit = _normalize_amount_series(df["credit"]) if "credit" in df.columns else pd.Series([0.0] * len(df))
        df["amount"] = credit.fillna(0) - debit.fillna(0)

    df["date"] = pd.to_datetime(df["date"], errors="coerce", dayfirst=True)
    df["description"] = df["description"].fillna("").astype(str).str.strip()

    if "funding_source" not in df.columns:
        df["funding_source"] = None

    if "category" in df.columns:
        df["category"] = df.apply(
            lambda row: _normalize_category(
                raw_category=row.get("category"),
                description=str(row.get("description", "")),
                amount=float(row.get("amount", 0) or 0),
            ),
            axis=1,
        )
    else:
        df["category"] = df.apply(
            lambda row: classify_transaction(
                description=str(row.get("description", "")),
                amount=float(row.get("amount", 0) or 0),
            ),
            axis=1,
        )

    df["source_type"] = source_type
    df["sheet_name"] = sheet_name
    df["month"] = df["date"].dt.to_period("M").astype(str)

    df = df.dropna(subset=["date", "amount"]).copy()
    df = df[df["date"].notna()].copy()
    df = df[["date", "description", "amount", "category", "source_type", "month", "funding_source", "sheet_name"]]
    df = df.sort_values("date").reset_index(drop=True)

    if df.empty:
        raise ValueError("No valid transaction rows found after cleaning.")

    return df


def parse_bank_export(file_bytes: bytes, filename: str) -> pd.DataFrame:
    lower_name = filename.lower()

    if lower_name.endswith(".csv"):
        raw_df = _load_csv(file_bytes)
    elif lower_name.endswith(".xlsx") or lower_name.endswith(".xls"):
        sheet_map = pd.read_excel(BytesIO(file_bytes), sheet_name=None)
        first_sheet = next(iter(sheet_map.values()))
        raw_df = first_sheet
    else:
        raise ValueError("Unsupported file type. Please upload a CSV or Excel file.")

    return _standardize_dataframe(raw_df, source_type="bank_export")


def parse_monthly_workbook(file_bytes: bytes, filename: str) -> pd.DataFrame:
    if not (filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls")):
        raise ValueError("Monthly workbook parser only supports Excel files.")

    sheets = _load_excel_sheets(file_bytes)
    parsed_frames: list[pd.DataFrame] = []

    for sheet_name, raw_sheet in sheets.items():
        if not _is_monthly_sheet(sheet_name):
            continue

        try:
            table_df = _extract_table_from_sheet(raw_sheet)
            parsed = _standardize_dataframe(
                table_df,
                source_type="monthly_workbook",
                sheet_name=sheet_name,
            )
            parsed_frames.append(parsed)
        except Exception:
            continue

    if not parsed_frames:
        raise ValueError("Could not find any valid monthly transaction sheets in workbook.")

    combined = pd.concat(parsed_frames, ignore_index=True)
    combined = combined.sort_values("date").reset_index(drop=True)
    return combined


def detect_file_format(file_bytes: bytes, filename: str) -> str:
    lower_name = filename.lower()

    if lower_name.endswith(".csv"):
        return "bank_export"

    if lower_name.endswith(".xlsx") or lower_name.endswith(".xls"):
        try:
            xl = pd.ExcelFile(BytesIO(file_bytes))
            monthly_sheets = [name for name in xl.sheet_names if _is_monthly_sheet(name)]
            if monthly_sheets:
                return "monthly_workbook"
            return "bank_export"
        except Exception as exc:
            raise ValueError(f"Could not inspect Excel workbook: {exc}") from exc

    raise ValueError("Unsupported file type. Please upload CSV or Excel.")


def parse_transactions(file_bytes: bytes, filename: str) -> pd.DataFrame:
    file_format = detect_file_format(file_bytes, filename)

    if file_format == "monthly_workbook":
        return parse_monthly_workbook(file_bytes, filename)

    return parse_bank_export(file_bytes, filename)


def classify_transaction(description: str, amount: float) -> str:
    desc = (description or "").strip().lower()

    if amount > 200:
        return "income"

    for category, keywords in CATEGORY_RULES.items():
        for keyword in keywords:
            if keyword in desc:
                return category

    return "other"


def _compute_trend(month_values: list[float]) -> str:
    if len(month_values) < 2:
        return "stable"

    midpoint = len(month_values) // 2
    first_half = month_values[:midpoint]
    second_half = month_values[midpoint:]

    if not first_half or not second_half:
        return "stable"

    first_avg = sum(first_half) / len(first_half)
    second_avg = sum(second_half) / len(second_half)

    if first_avg == 0:
        return "increasing" if second_avg > 0 else "stable"

    delta_ratio = (second_avg - first_avg) / abs(first_avg)

    if delta_ratio > 0.10:
        return "increasing"
    if delta_ratio < -0.10:
        return "decreasing"
    return "stable"


def build_category_aggregates(df: pd.DataFrame) -> list[CategoryAggregate]:
    months = sorted(df["month"].dropna().unique().tolist())
    categories = sorted(df["category"].dropna().unique().tolist())

    aggregates: list[CategoryAggregate] = []

    for category in categories:
        cat_df = df[df["category"] == category].copy()

        month_values: list[float] = []
        for month in months:
            month_df = cat_df[cat_df["month"] == month]
            total = float(month_df["amount"].sum()) if not month_df.empty else 0.0

            if category != "income":
                total = abs(total)

            month_values.append(round(total, 2))

        if all(value == 0 for value in month_values):
            continue

        aggregates.append(
            CategoryAggregate(
                category=category,
                monthly_avg=round(sum(month_values) / len(month_values), 2),
                months_data=month_values,
                trend=_compute_trend(month_values),
            )
        )

    return aggregates


def parse_and_aggregate(file_bytes: bytes, filename: str) -> dict[str, Any]:
    df = parse_transactions(file_bytes, filename)
    aggregates = build_category_aggregates(df)

    return {
        "transactions": df.to_dict(orient="records"),
        "category_aggregates": [item.model_dump() for item in aggregates],
        "months_analyzed": int(df["month"].nunique()),
        "source_type": df["source_type"].iloc[0] if not df.empty else "unknown",
    }