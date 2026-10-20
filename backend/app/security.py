import base64
import hmac
import json
import os
import secrets
import time

_configured_key = os.getenv("SESSION_SIGNING_KEY", "")
if _configured_key and len(_configured_key) < 32:
    raise RuntimeError("SESSION_SIGNING_KEY must contain at least 32 characters")
_SESSION_KEY = _configured_key.encode() if _configured_key else secrets.token_bytes(32)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def create_session(csrf_token: str, expires_at: int) -> str:
    payload = base64.urlsafe_b64encode(
        json.dumps({"csrf": csrf_token, "exp": expires_at}, separators=(",", ":")).encode()
    ).rstrip(b"=").decode()
    signature = hmac.new(_SESSION_KEY, payload.encode(), "sha256").hexdigest()
    return f"{payload}.{signature}"


def verify_session(token: str) -> dict | None:
    try:
        payload, signature = token.rsplit(".", 1)
        expected = hmac.new(_SESSION_KEY, payload.encode(), "sha256").hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        decoded = base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))
        session = json.loads(decoded)
        if not isinstance(session.get("exp"), int) or session["exp"] <= int(time.time()):
            return None
        if not isinstance(session.get("csrf"), str):
            return None
        return session
    except (ValueError, TypeError, json.JSONDecodeError):
        return None
