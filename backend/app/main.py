import hashlib
import hmac
import os
import re
import threading
import time
from urllib.parse import urlparse

import httpx
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import cookie_secure, origins, required
from .security import create_session, new_token, verify_session
from .store import connection, load_content, save_content
try:
    from .local_auth import ADMIN_PIN
except ImportError:
    ADMIN_PIN = ""
ADMIN_PIN = os.getenv("ADMIN_PIN", ADMIN_PIN)

app = FastAPI(title="Portfolio content API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)
SESSION_COOKIE = "portfolio_session"
CSRF_COOKIE = "portfolio_csrf"
SESSION_HOURS = 12
MAX_UPLOAD = int(os.getenv("MAX_UPLOAD_MB", "5")) * 1024 * 1024
ALLOWED_UPLOADS = {"image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"}
SAFE_URL_SCHEMES = {"http", "https"}
_login_attempts: dict[str, list[float]] = {}
_login_attempts_lock = threading.Lock()


@app.middleware("http")
async def disable_admin_caching(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/admin/"):
        response.headers["Cache-Control"] = "no-store"
    return response


class Credentials(BaseModel):
    pin: str = Field(pattern=r"^\d{4}$")


def _configured_pin() -> str:
    if not isinstance(ADMIN_PIN, str) or not re.fullmatch(r"\d{4}", ADMIN_PIN):
        raise HTTPException(
            status_code=503,
            detail="Set your 4-digit ADMIN_PIN in backend/app/local_auth.py first",
        )
    return ADMIN_PIN


def _reserve_login_attempt(client_ip: str) -> bool:
    now = time.monotonic()
    with _login_attempts_lock:
        attempts = [stamp for stamp in _login_attempts.get(client_ip, []) if now - stamp < 900]
        if len(_login_attempts) > 1000:
            _login_attempts.update({
                ip: [stamp for stamp in stamps if now - stamp < 900]
                for ip, stamps in _login_attempts.items()
                if any(now - stamp < 900 for stamp in stamps)
            })
        if len(attempts) >= 5:
            _login_attempts[client_ip] = attempts
            return False
        attempts.append(now)
        _login_attempts[client_ip] = attempts
        return True


def _clear_login_attempts(client_ip: str) -> None:
    with _login_attempts_lock:
        _login_attempts.pop(client_ip, None)


def _set_session_cookies(response: Response, csrf_token: str) -> None:
    expires_at = int(time.time()) + SESSION_HOURS * 3600
    response.set_cookie(
        SESSION_COOKIE, create_session(csrf_token, expires_at), httponly=True,
        secure=cookie_secure(), samesite="none" if cookie_secure() else "lax",
        max_age=SESSION_HOURS * 3600, path="/",
    )
    response.set_cookie(
        CSRF_COOKIE, csrf_token, httponly=False, secure=cookie_secure(),
        samesite="none" if cookie_secure() else "lax",
        max_age=SESSION_HOURS * 3600, path="/",
    )


def csrf_check(
    request: Request,
    x_csrf_token: str | None = Header(default=None),
):
    session = authenticated(request)
    cookie_value = request.cookies.get(CSRF_COOKIE, "")
    origin = request.headers.get("origin", "").rstrip("/")
    if not cookie_value or not x_csrf_token or not hmac.compare_digest(cookie_value, x_csrf_token):
        raise HTTPException(status_code=403, detail="CSRF check failed")
    if origin and origin not in origins():
        raise HTTPException(status_code=403, detail="Untrusted request origin")
    if not hmac.compare_digest(session["csrf"], cookie_value):
        raise HTTPException(status_code=403, detail="CSRF token is not associated with this session")


def authenticated(request: Request):
    token = request.cookies.get(SESSION_COOKIE, "")
    if not token:
        raise HTTPException(status_code=401, detail="Sign in required")
    session = verify_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Session expired")
    return session


def _valid_url(
    value: str,
    *,
    allow_empty: bool = True,
    allow_relative: bool = False,
    allow_placeholder: bool = False,
) -> bool:
    if not value and allow_empty:
        return True
    if value == "#":
        return allow_placeholder
    if allow_relative and (value.startswith("/") and not value.startswith("//") or value.startswith("assets/")):
        return ".." not in value.split("/")
    parsed = urlparse(value)
    return parsed.scheme in SAFE_URL_SCHEMES and bool(parsed.netloc)


def validate_content(data: dict) -> dict:
    def text(value, name, limit=4000):
        if not isinstance(value, str) or len(value) > limit:
            raise HTTPException(status_code=422, detail=f"Invalid {name}")
        return value.strip()

    required_keys = ("name", "role", "city", "tz", "photo", "photoAlt", "photoPos", "email",
                     "whatsapp", "available", "phrases", "socials", "about", "facts", "skills",
                     "projects", "journey", "education", "certs", "summary")
    if not isinstance(data, dict) or any(key not in data for key in required_keys):
        raise HTTPException(status_code=422, detail="Portfolio data is missing required fields")
    for key in ("name", "role", "city", "tz", "photoAlt", "email", "whatsapp", "summary", "photoPos"):
        data[key] = text(data[key], key, 500)
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]{2,}", data["email"]):
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    if not re.fullmatch(r"[0-9+() .-]{5,30}", data["whatsapp"]):
        raise HTTPException(status_code=422, detail="Enter a valid WhatsApp number")
    if not isinstance(data["available"], bool):
        raise HTTPException(status_code=422, detail="Invalid availability status")
    if not re.fullmatch(r"(?:\d{1,3}%\s+\d{1,3}%|left|center|right|top|bottom)(?:\s+(?:left|center|right|top|bottom|\d{1,3}%))*", data["photoPos"]):
        raise HTTPException(status_code=422, detail="Photo position must use safe CSS position values")
    for key in ("phrases", "about"):
        if not isinstance(data[key], list) or len(data[key]) > 50:
            raise HTTPException(status_code=422, detail=f"Invalid {key}")
        for value in data[key]:
            text(value, key)
    if not isinstance(data["facts"], list) or len(data["facts"]) > 100 or not isinstance(data["socials"], list) or len(data["socials"]) > 100 or not isinstance(data["skills"], dict) or len(data["skills"]) > 100:
        raise HTTPException(status_code=422, detail="Invalid profile lists")
    for pair in data["facts"] + data["socials"]:
        if not isinstance(pair, list) or len(pair) != 2:
            raise HTTPException(status_code=422, detail="List entries must have two values")
        pair[0] = text(pair[0], "label", 120)
        pair[1] = text(pair[1], "value", 1000)
    for name, url in data["socials"]:
        if name.lower() == "email" and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]{2,}", url):
            raise HTTPException(status_code=422, detail="Invalid email social link")
        if name.lower() != "email" and not _valid_url(url, allow_empty=False):
            raise HTTPException(status_code=422, detail=f"Invalid URL for {name}")
    for category, skills in data["skills"].items():
        text(category, "category", 120)
        if not isinstance(skills, list) or len(skills) > 200:
            raise HTTPException(status_code=422, detail="Invalid skills")
        for item in skills:
            if not isinstance(item, list) or len(item) != 2:
                raise HTTPException(status_code=422, detail="Invalid skill item")
            text(item[0], "skill name", 120)
            if not isinstance(item[1], int) or isinstance(item[1], bool) or not 1 <= item[1] <= 5:
                raise HTTPException(status_code=422, detail="Skill proficiency must be between 1 and 5")
    specs = {
        "projects": (("t", "cat", "d", "live", "code"), ("t", "cat", "d")),
        "journey": (("w", "t", "o", "d"), ("w", "t", "o", "d")),
        "education": (("t", "o", "w", "d"), ("t", "o", "w", "d")),
        "certs": (("t", "o", "w"), ("t", "o", "w")),
    }
    for group, (keys, nonempty) in specs.items():
        values = data[group]
        if not isinstance(values, list) or len(values) > 200:
            raise HTTPException(status_code=422, detail=f"Invalid {group}")
        for item in values:
            if not isinstance(item, dict) or any(key not in item for key in keys):
                raise HTTPException(status_code=422, detail=f"Invalid {group} entry")
            for key in keys:
                text(item[key], key)
            if any(not item[key] for key in nonempty):
                raise HTTPException(status_code=422, detail=f"Required {group} fields cannot be empty")
            if group == "projects":
                if not isinstance(item.get("tags"), list) or len(item["tags"]) > 50 or any(not isinstance(tag, str) for tag in item["tags"]):
                    raise HTTPException(status_code=422, detail="Project tags must be a list of text")
                item["tags"] = [text(tag, "project tag", 120) for tag in item["tags"]]
                if not _valid_url(item["live"], allow_placeholder=True) or not _valid_url(item["code"], allow_placeholder=True) or not _valid_url(item.get("image", ""), allow_relative=True):
                    raise HTTPException(status_code=422, detail="Project links must use http or https")
                for key in ("big", "published"):
                    if key in item and not isinstance(item[key], bool):
                        raise HTTPException(status_code=422, detail=f"Invalid project {key} flag")
    data["displayName"] = text(data.get("displayName", data["name"]), "display name", 200)
    data["photo"] = text(data["photo"], "photo URL", 1000)
    data["resumeUrl"] = text(data.get("resumeUrl", ""), "resume URL", 1000)
    if not _valid_url(data["photo"], allow_relative=True) or not _valid_url(data["resumeUrl"]):
        raise HTTPException(status_code=422, detail="Photo and resume URLs must use http or https")
    settings = data.get("settings", {})
    if not isinstance(settings, dict):
        raise HTTPException(status_code=422, detail="Invalid website settings")
    for key in ("title", "description", "heroIntro", "footer", "maintenanceNotice"):
        settings[key] = text(settings.get(key, ""), f"settings.{key}", 2000)
    if not isinstance(settings.get("navLabels", {}), dict):
        raise HTTPException(status_code=422, detail="Navigation labels must be an object")
    settings["navLabels"] = {
        text(key, "navigation key", 80): text(value, "navigation label", 120)
        for key, value in settings.get("navLabels", {}).items()
    }
    data["settings"] = settings
    return data


@app.get("/api/health")
def health():
    try:
        with connection() as conn:
            conn.execute("SELECT 1")
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


@app.get("/api/portfolio")
def public_portfolio(response: Response):
    try:
        with connection() as conn:
            data = load_content(conn)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Portfolio content is unavailable") from exc
    if not data:
        raise HTTPException(status_code=503, detail="Portfolio content has not been initialized")
    data["projects"] = [item for item in data["projects"] if item.get("published", True)]
    response.headers["Cache-Control"] = "no-store"
    return data


@app.post("/api/admin/login")
def login(body: Credentials, request: Request, response: Response):
    expected_pin = _configured_pin()
    client_ip = request.client.host if request.client else "unknown"
    if not _reserve_login_attempt(client_ip):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 15 minutes.")
    if not hmac.compare_digest(body.pin, expected_pin):
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    _clear_login_attempts(client_ip)
    csrf_token = new_token()
    _set_session_cookies(response, csrf_token)
    return {"authenticated": True, "csrfToken": csrf_token}


@app.get("/api/admin/csrf")
def refresh_csrf(request: Request, response: Response, admin_id: str = Depends(authenticated)):
    origin = request.headers.get("origin", "").rstrip("/")
    if origin and origin not in origins():
        raise HTTPException(status_code=403, detail="Untrusted request origin")
    csrf_token = new_token()
    _set_session_cookies(response, csrf_token)
    return {"csrfToken": csrf_token}


@app.get("/api/admin/setup-status")
def setup_status():
    return {"pinConfigured": bool(re.fullmatch(r"\d{4}", ADMIN_PIN))}


@app.get("/api/admin/me")
def me(admin_id: str = Depends(authenticated)):
    return {"authenticated": True}


@app.post("/api/admin/logout", dependencies=[Depends(csrf_check)])
def logout(request: Request, response: Response, admin_id: str = Depends(authenticated)):
    response.delete_cookie(SESSION_COOKIE, path="/", secure=cookie_secure(), httponly=True, samesite="none" if cookie_secure() else "lax")
    response.delete_cookie(CSRF_COOKIE, path="/", secure=cookie_secure(), samesite="none" if cookie_secure() else "lax")
    return {"loggedOut": True}


@app.get("/api/admin/portfolio")
def admin_portfolio(admin_id: str = Depends(authenticated)):
    with connection() as conn:
        data = load_content(conn)
    if not data:
        raise HTTPException(status_code=503, detail="Portfolio content has not been initialized")
    return data


@app.put("/api/admin/portfolio", dependencies=[Depends(csrf_check)])
def update_portfolio(data: dict, admin_id: str = Depends(authenticated)):
    validated = validate_content(data)
    try:
        with connection() as conn:
            save_content(conn, validated)
            updated = load_content(conn)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not save portfolio content") from exc
    return {"ok": True, "portfolio": updated}


@app.post("/api/admin/upload", dependencies=[Depends(csrf_check)])
async def upload(
    file: UploadFile = File(...),
    admin_id: str = Depends(authenticated),
):
    if file.content_type not in ALLOWED_UPLOADS:
        raise HTTPException(status_code=415, detail="Use JPEG, PNG, WebP, AVIF or PDF files")
    content = await file.read(MAX_UPLOAD + 1)
    await file.close()
    if not content or len(content) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail=f"File must be smaller than {MAX_UPLOAD // (1024 * 1024)} MB")
    signatures = {
        "image/jpeg": content.startswith(b"\xff\xd8\xff"),
        "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP",
        "image/avif": len(content) >= 12 and content[4:8] == b"ftyp" and content[8:12] in {b"avif", b"avis"},
        "application/pdf": content.startswith(b"%PDF-"),
    }
    if not signatures[file.content_type]:
        raise HTTPException(status_code=415, detail="The file content does not match its declared type")
    extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "application/pdf": "pdf"}[file.content_type]
    name = f"{'resume' if extension == 'pdf' else 'images'}/{hashlib.sha256(content).hexdigest()}.{extension}"
    base = required("SUPABASE_URL").rstrip("/")
    bucket = required("SUPABASE_STORAGE_BUCKET")
    key = required("SUPABASE_SERVICE_ROLE_KEY")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            result = await client.post(
                f"{base}/storage/v1/object/{bucket}/{name}",
                content=content,
                headers={"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": file.content_type, "x-upsert": "true"},
            )
        if result.status_code >= 300:
            raise HTTPException(status_code=502, detail="Remote storage rejected the upload")
    except HTTPException:
        raise
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach remote file storage") from exc
    return {"url": f"{base}/storage/v1/object/public/{bucket}/{name}", "name": name}


@app.get("/api/admin/stats")
def stats(admin_id: str = Depends(authenticated)):
    with connection() as conn:
        data = load_content(conn)
        count = conn.execute("SELECT count(*) AS n FROM skills").fetchone()["n"]
    if not data:
        raise HTTPException(status_code=503, detail="Portfolio content has not been initialized")
    fields = ("name", "role", "city", "email", "photo", "summary")
    complete = sum(bool(data.get(key)) for key in fields)
    return {
        "publishedProjects": sum(item.get("published", True) for item in data["projects"]),
        "skills": count,
        "profileCompletion": round(complete / len(fields) * 100),
        "updatedAt": data["updatedAt"],
    }
