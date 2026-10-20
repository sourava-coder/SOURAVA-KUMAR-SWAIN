import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def origins() -> list[str]:
    return [item.strip().rstrip("/") for item in os.getenv("FRONTEND_ORIGINS", "").split(",") if item.strip()]


def cookie_secure() -> bool:
    return os.getenv("COOKIE_SECURE", "true").lower() in {"1", "true", "yes"}
