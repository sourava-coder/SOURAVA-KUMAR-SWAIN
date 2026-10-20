import asyncio
import unittest
from unittest.mock import patch

import httpx
from fastapi import HTTPException
from starlette.requests import Request

from app.main import app, csrf_check, validate_content
from app.security import create_session, verify_session


def sample_portfolio():
    return {
        "name": "Portfolio Owner",
        "displayName": "Owner",
        "role": "Developer",
        "city": "Bhubaneswar",
        "tz": "Asia/Kolkata",
        "photo": "assets/hero.png",
        "photoAlt": "Portrait",
        "photoPos": "50% 20%",
        "email": "owner@example.com",
        "whatsapp": "+919876543210",
        "available": True,
        "phrases": ["Full-stack apps"],
        "socials": [["GitHub", "https://github.com/example"], ["Email", "owner@example.com"]],
        "about": ["Builds useful products."],
        "facts": [["Location", "India"]],
        "skills": {"Frontend": [["JavaScript", 5]]},
        "projects": [{
            "t": "Example", "cat": "Web", "tags": ["HTML"], "big": True, "published": True,
            "d": "A useful project.", "live": "https://example.com", "code": "#", "image": "",
        }],
        "journey": [{"w": "2025", "t": "Developer", "o": "Company", "d": "Built software."}],
        "education": [{"t": "Degree", "o": "School", "w": "2025", "d": "Computer science."}],
        "certs": [{"t": "Certificate", "o": "Issuer", "w": "2025"}],
        "summary": "Developer shipping helpful software.",
        "resumeUrl": "",
        "settings": {
            "title": "Owner | Developer",
            "description": "Portfolio",
            "heroIntro": "",
            "footer": "",
            "maintenanceNotice": "",
            "navLabels": {},
        },
    }


class ValidationTests(unittest.TestCase):
    def test_valid_data_allows_local_profile_photo_and_project_placeholder_link(self):
        self.assertEqual(validate_content(sample_portfolio())["projects"][0]["t"], "Example")

    def test_rejects_unsafe_project_link_scheme(self):
        data = sample_portfolio()
        data["projects"][0]["live"] = "javascript:alert(1)"
        with self.assertRaises(HTTPException) as error:
            validate_content(data)
        self.assertEqual(error.exception.status_code, 422)

    def test_rejects_skill_levels_outside_range(self):
        data = sample_portfolio()
        data["skills"]["Frontend"][0][1] = 6
        with self.assertRaises(HTTPException):
            validate_content(data)


class SessionTests(unittest.TestCase):
    def test_session_cookie_is_signed_and_expires(self):
        token = create_session("csrf-token", 4_000_000_000)
        self.assertEqual(verify_session(token)["csrf"], "csrf-token")
        self.assertIsNone(verify_session(token + "tampered"))
        self.assertIsNone(verify_session(create_session("csrf-token", 1)))


class AuthorizationTests(unittest.TestCase):
    def test_admin_read_and_write_require_a_session(self):
        async def check():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                read = await client.get("/api/admin/portfolio")
                write = await client.put("/api/admin/portfolio", json=sample_portfolio())
                return read.status_code, write.status_code

        self.assertEqual(asyncio.run(check()), (401, 401))

    def test_login_requires_a_four_digit_pin_in_backend_code(self):
        async def check():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                unset = await client.post("/api/admin/login", json={"pin": "2468"})
                invalid = await client.post("/api/admin/login", json={"pin": "246"})
                return unset.status_code, invalid.status_code

        with patch("app.main.ADMIN_PIN", ""):
            self.assertEqual(asyncio.run(check()), (503, 422))

    def test_code_configured_pin_signs_in_without_database_auth(self):
        async def check():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                wrong = await client.post("/api/admin/login", json={"pin": "9999"})
                good = await client.post("/api/admin/login", json={"pin": "2468"})
                me = await client.get("/api/admin/me")
                csrf = await client.get("/api/admin/csrf")
                logout = await client.post(
                    "/api/admin/logout",
                    headers={"X-CSRF-Token": csrf.json()["csrfToken"]},
                )
                expired = await client.get("/api/admin/me")
                return (
                    wrong.status_code, good.status_code, me.status_code, csrf.status_code,
                    logout.status_code, expired.status_code, good.headers.get("set-cookie", ""),
                )

        with patch("app.main.ADMIN_PIN", "2468"), patch("app.main._login_attempts", {}), patch("app.main.cookie_secure", return_value=False), patch("app.main.connection", side_effect=AssertionError("Auth must not access Supabase")):
            wrong_status, good_status, me_status, csrf_status, logout_status, expired_status, cookies = asyncio.run(check())
        self.assertEqual(
            (wrong_status, good_status, me_status, csrf_status, logout_status, expired_status),
            (401, 200, 200, 200, 200, 401),
        )
        self.assertIn("portfolio_session=", cookies)
        self.assertIn("httponly", cookies.lower())

    def test_rate_limits_five_pin_attempts(self):
        async def check():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                responses = [
                    await client.post("/api/admin/login", json={"pin": "9999"})
                    for _ in range(6)
                ]
                return [response.status_code for response in responses]

        with patch("app.main.ADMIN_PIN", "2468"), patch("app.main._login_attempts", {}):
            self.assertEqual(asyncio.run(check()), [401, 401, 401, 401, 401, 429])

    def test_mutations_reject_missing_csrf_token(self):
        request = Request({"type": "http", "method": "PUT", "path": "/", "headers": []})
        with patch("app.main.authenticated"):
            with self.assertRaises(HTTPException) as error:
                csrf_check(request, None)
        self.assertEqual(error.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
