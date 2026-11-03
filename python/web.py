"""Shared request handling for the Vercel Python functions in api/.

Each function (api/predict.py, api/similarity.py, api/overview.py) is a thin
wrapper around service.handle(), the same entry point the Express server uses
locally, so production and local development run identical analytics code.
"""
import json
from http.server import BaseHTTPRequestHandler

import service

FIELD_ALIASES = {
    "temperature": ("temperature", "temp"),
    "vibration": ("vibration", "vib"),
    "pressure": ("pressure", "press"),
    "rpm": ("rpm",),
}


def reading_from(body):
    """Accept both the dashboard's short keys and the full feature names."""
    if not isinstance(body, dict):
        raise ValueError("request body must be a JSON object")
    reading = {}
    for name, keys in FIELD_ALIASES.items():
        value = next((body[k] for k in keys if k in body), None)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"'{name}' must be a number")
        reading[name] = value
    return reading


def make_handler(action):
    """Build the BaseHTTPRequestHandler subclass Vercel expects, named `handler`."""

    class Handler(BaseHTTPRequestHandler):
        def _send(self, status, payload):
            data = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def _run(self, payload):
            try:
                result = service.handle(payload)
            except ValueError as e:
                return self._send(400, {"error": str(e)})
            except Exception:  # noqa: BLE001 - never leak a traceback to the client
                return self._send(500, {"error": "analytics service failed"})
            if action == "predict":
                result["prediction"] = result["probability"]
                result["message"] = ("OUT OF RANGE" if result["outOfRange"]
                                     else "⚠️ FAULT DETECTED" if result["isFault"] else "✅ MACHINE NORMAL")
            self._send(200, result)

        def do_GET(self):
            if action != "overview":
                return self._send(405, {"error": "use POST"})
            self._run({"action": "overview"})

        def do_POST(self):
            if action == "overview":
                return self._send(405, {"error": "use GET"})
            try:
                length = int(self.headers.get("Content-Length") or 0)
                body = json.loads(self.rfile.read(length) or b"{}")
                reading = reading_from(body)
            except (ValueError, json.JSONDecodeError) as e:
                return self._send(400, {"error": str(e)})
            self._run({"action": action, "reading": reading})

        def log_message(self, *args):  # keep function logs quiet
            pass

    return Handler
