from __future__ import annotations

from io import BytesIO
from typing import Any
from dataclasses import dataclass

import pandas as pd

from models import CategoryAggregate


@dataclass
class ParseAudit:
    """Track detailed parsing information for validation."""
    total_sheets_scanned: int
    sheets_accepted: list[str]
    sheets_skipped: list[str]
    rows_extracted: int
    rows_dropped: int
    parse_warnings: list[str]
    detected_months: list[str]


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


def _parse_dates_robust(series: pd.Series, audit: ParseAudit | None = None) -> pd.Series:
    """Parse dates format-first, then fallback to inference."""
    # Try common formats first
    formats_to_try = [
        "%m/%d/%Y",    # US format: 01/15/2024
        "%Y-%m-%d",    # ISO format: 2024-01-15
        "%d/%m/%Y",    # EU format: 15/01/2024
        "%m-%d-%Y",    # Alt US: 01-15-2024
        "%d-%m-%Y",    # Alt EU: 15-01-2024
        "%B %d, %Y",   # Long: January 15, 2024
        "%b %d, %Y",   # Short: Jan 15, 2024
    ]
    
    for fmt in formats_to_try:
        try:
            result = pd.to_datetime(series, format=fmt, errors="coerce")
            if not result.isna().all():
                success_rate = (~result.isna()).sum() / len(result)
                if success_rate > 0.95:  # At least 95% matched this format
                    if audit:
                        audit.parse_warnings.append(
                            f"Successfully parsed dates using format: {fmt}"
                        )
                    return result
        except Exception:
            pass
    
    # Fallback to dateutil
    if audit:
        audit.parse_warnings.append(
            "Date format not recognized; using dateutil inference"
        )
    return pd.to_datetime(series, errors="coerce", dayfirst=True)


def _normalize_category(raw_category: Any, description: str, amount: float) -> str:
    if pd.notna(raw_category):
        category = _clean_label(raw_category)
        if category in CATEGORY_MAP:
            return CATEGORY_MAP[category]

    return classify_transaction(description=description, amount=amount)


def _standardize_dataframe(df: pd.DataFrame, source_type: str, sheet_name: str | None = None, audit: ParseAudit | None = None) -> pd.DataFrame:
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

    df["date"] = _parse_dates_robust(df["date"], audit=audit)
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

    rows_before = len(df)
    df = df.dropna(subset=["date", "amount"]).copy()
    df = df[df["date"].notna()].copy()
    rows_dropped = rows_before - len(df)
    
    if audit:
        audit.rows_dropped += rows_dropped

    df = df[["date", "description", "amount", "category", "source_type", "month", "funding_source", "sheet_name"]]
    df = df.sort_values("date").reset_index(drop=True)

    if df.empty:
        raise ValueError("No valid transaction rows found after cleaning.")

    if audit:
        audit.rows_extracted += len(df)
        audit.detected_months.extend(df["month"].dropna().unique().tolist())

    return df


def parse_monthly_workbook(file_bytes: bytes, filename: str) -> tuple[pd.DataFrame, ParseAudit]:
    if not (filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls")):
        raise ValueError("Monthly workbook parser only supports Excel files.")

    sheets = _load_excel_sheets(file_bytes)
    parsed_frames: list[pd.DataFrame] = []
    
    audit = ParseAudit(
        total_sheets_scanned=len(sheets),
        sheets_accepted=[],
        sheets_skipped=[],
        rows_extracted=0,
        rows_dropped=0,
        parse_warnings=[],
        detected_months=[],
    )

    for sheet_name, raw_sheet in sheets.items():
        if not _is_monthly_sheet(sheet_name):
            audit.sheets_skipped.append(f"{sheet_name} (not a monthly sheet)")
            continue

        try:
            table_df = _extract_table_from_sheet(raw_sheet)
            parsed = _standardize_dataframe(
                table_df,
                source_type="monthly_workbook",
                sheet_name=sheet_name,
                audit=audit,
            )
            parsed_frames.append(parsed)
            audit.sheets_accepted.append(sheet_name)
        except Exception as e:
            audit.sheets_skipped.append(f"{sheet_name} ({str(e)[:50]})")
            continue

    if not parsed_frames:
        raise ValueError("Could not find any valid monthly transaction sheets in workbook.")

    combined = pd.concat(parsed_frames, ignore_index=True)
    combined = combined.sort_values("date").reset_index(drop=True)
    
    # Deduplicate detected_months
    audit.detected_months = sorted(set(audit.detected_months))
    
    return combined, audit


def parse_bank_export(file_bytes: bytes, filename: str) -> tuple[pd.DataFrame, ParseAudit]:
    lower_name = filename.lower()
    
    audit = ParseAudit(
        total_sheets_scanned=1,
        sheets_accepted=[],
        sheets_skipped=[],
        rows_extracted=0,
        rows_dropped=0,
        parse_warnings=[],
        detected_months=[],
    )

    if lower_name.endswith(".csv"):
        raw_df = _load_csv(file_bytes)
        audit.sheets_accepted.append("csv_file")
    elif lower_name.endswith(".xlsx") or lower_name.endswith(".xls"):
        sheet_map = pd.read_excel(BytesIO(file_bytes), sheet_name=None)
        first_sheet = next(iter(sheet_map.values()))
        raw_df = first_sheet
        audit.sheets_accepted.append(next(iter(sheet_map.keys())))
    else:
        raise ValueError("Unsupported file type. Please upload a CSV or Excel file.")

    parsed = _standardize_dataframe(raw_df, source_type="bank_export", audit=audit)
    audit.detected_months = sorted(set(audit.detected_months))
    
    return parsed, audit


def detect_file_format(file_bytes: bytes, filename: str) -> str:
    """Detect if file is a monthly workbook or bank export."""
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


def parse_transactions(file_bytes: bytes, filename: str) -> tuple[pd.DataFrame, ParseAudit]:
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
    df, audit = parse_transactions(file_bytes, filename)
    aggregates = build_category_aggregates(df)

    return {
        "transactions": df.to_dict(orient="records"),
        "category_aggregates": [item.model_dump() for item in aggregates],
        "months_analyzed": int(df["month"].nunique()),
        "source_type": df["source_type"].iloc[0] if not df.empty else "unknown",
        "audit": {
            "total_sheets_scanned": audit.total_sheets_scanned,
            "sheets_accepted": audit.sheets_accepted,
            "sheets_skipped": audit.sheets_skipped,
            "rows_extracted": audit.rows_extracted,
            "rows_dropped": audit.rows_dropped,
            "parse_warnings": audit.parse_warnings,
            "detected_months": audit.detected_months,
        },
    }