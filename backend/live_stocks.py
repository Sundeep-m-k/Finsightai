"""Finnhub WebSocket streaming for live stock watchlist prices."""
import json
import os
import threading
from websocket import WebSocketApp

# Latest prices in memory
latest_quotes = {}

# WebSocket connection status
ws_connected = False

# Connected frontend websocket send functions
subscribers = set()

# Watchlist symbols to stream
WATCHLIST = ["VTI", "VOO", "SPY"]


def get_api_key():
    """Get Finnhub API key from environment."""
    return os.getenv("FINNHUB_API_KEY", "")


def broadcast(payload: dict):
    """Send payload to all connected frontend WebSocket clients."""
    dead = []
    for send_func in subscribers:
        try:
            send_func(payload)
        except Exception:
            dead.append(send_func)
    for d in dead:
        subscribers.discard(d)


def on_message(ws, message):
    """Handle incoming WebSocket message from Finnhub."""
    try:
        data = json.loads(message)
        if data.get("type") == "trade":
            for item in data.get("data", []):
                symbol = item.get("s")
                latest_quotes[symbol] = {
                    "symbol": symbol,
                    "price": item.get("p"),
                    "timestamp": item.get("t"),
                    "volume": item.get("v"),
                }
            # Broadcast to all connected WebSocket clients
            broadcast({"type": "live_quotes", "quotes": latest_quotes})
    except json.JSONDecodeError:
        pass  # Ignore malformed messages
    except Exception as e:
        print(f"Error processing Finnhub message: {e}")


def on_error(ws, error):
    """Handle WebSocket error."""
    print(f"Finnhub WS error: {error}")


def on_close(ws, close_status_code, close_msg):
    """Handle WebSocket close."""
    global ws_connected
    ws_connected = False
    print(f"Finnhub WS closed: {close_status_code} {close_msg}")


def on_open(ws):
    """Handle WebSocket open - subscribe to watchlist symbols."""
    global ws_connected
    ws_connected = True
    print("Finnhub WS opened, subscribing to watchlist:", WATCHLIST)
    for symbol in WATCHLIST:
        ws.send(json.dumps({"type": "subscribe", "symbol": symbol}))


def start_finnhub_stream():
    """Connect to Finnhub WebSocket and stream prices."""
    api_key = get_api_key()
    
    if not api_key:
        print("WARNING: FINNHUB_API_KEY not set - live streaming disabled")
        return

    print(f"Starting Finnhub WebSocket connection with API key: {api_key[:10]}...")
    try:
        ws = WebSocketApp(
            f"wss://ws.finnhub.io?token={api_key}",
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
        )
        ws.run_forever()
    except Exception as e:
        print(f"Finnhub WebSocket error: {e}")


def get_connection_status():
    """Get current WebSocket connection status."""
    return ws_connected


def start_stream_in_background():
    """Start Finnhub WebSocket in background thread."""
    thread = threading.Thread(target=start_finnhub_stream, daemon=True)
    thread.start()
    print("Live stock streaming started in background")
