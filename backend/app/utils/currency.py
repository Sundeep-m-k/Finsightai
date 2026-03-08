"""Currency parsing."""
import re


def parse_amount(s: str | float) -> float | None:
    """Parse amount; negative for expense (e.g. -50.00 or (50.00))."""
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return float(s)
    s = str(s).strip().replace(",", "")
    # (1,234.56) or -1,234.56 -> negative
    m = re.match(r"^\((.+)\)$", s)
    if m:
        try:
            return -abs(float(m.group(1).replace(",", "")))
        except ValueError:
            pass
    try:
        return float(s)
    except ValueError:
        return None
