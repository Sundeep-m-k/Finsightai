import os
import requests

MARKETSTACK_API_KEY = os.getenv("MARKETSTACK_API_KEY")
BASE_URL = "http://api.marketstack.com/v1"

def get_latest_eod(symbol: str):
    r = requests.get(
        f"{BASE_URL}/eod/latest",
        params={"access_key": MARKETSTACK_API_KEY, "symbols": symbol},
        timeout=20,
    )
    r.raise_for_status()
    return r.json()