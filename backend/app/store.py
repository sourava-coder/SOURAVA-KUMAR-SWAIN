import json
from contextlib import contextmanager
from pathlib import Path
from typing import Any
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .config import required


@contextmanager
def connection():
    with psycopg.connect(required("DATABASE_URL"), row_factory=dict_row) as conn:
        yield conn


def _one(conn, query: str, params=()):
    row = conn.execute(query, params).fetchone()
    return row


def _rows(conn, query: str, params=()):
    return conn.execute(query, params).fetchall()


def load_content(conn) -> dict[str, Any]:
    profile = _one(conn, "SELECT * FROM portfolio_profile WHERE id = 1")
    if not profile:
        return {}
    settings = _one(conn, "SELECT * FROM website_settings WHERE id = 1") or {}
    categories = _rows(conn, "SELECT * FROM skill_categories ORDER BY position, name")
    skill_rows = _rows(conn, "SELECT * FROM skills ORDER BY position, name")
    skills = {
        category["name"]: [
            [item["name"], item["level"]]
            for item in skill_rows
            if item["category_id"] == category["id"]
        ]
        for category in categories
    }
    projects = _rows(conn, "SELECT * FROM projects ORDER BY position, title")
    tags = _rows(conn, "SELECT project_id, name FROM project_tags ORDER BY position, name")
    tags_by_project: dict[str, list[str]] = {}
    for tag in tags:
        tags_by_project.setdefault(str(tag["project_id"]), []).append(tag["name"])
    social_rows = _rows(conn, "SELECT name, url FROM social_links ORDER BY position, name")
    journey = _rows(conn, "SELECT period, title, organization, description FROM journey_entries ORDER BY position")
    education = _rows(conn, "SELECT title, organization, period, description FROM education ORDER BY position")
    certs = _rows(conn, "SELECT title, organization, period FROM certifications ORDER BY position")
    return {
        "name": profile["name"],
        "displayName": profile["display_name"],
        "role": profile["role"],
        "city": profile["city"],
        "tz": profile["timezone"],
        "photo": profile["photo_url"],
        "photoAlt": profile["photo_alt"],
        "photoPos": profile["photo_position"],
        "email": profile["email"],
        "whatsapp": profile["whatsapp"],
        "available": profile["available"],
        "phrases": profile["phrases"],
        "about": profile["about"],
        "facts": profile["facts"],
        "skills": skills,
        "projects": [
            {
                "t": item["title"], "cat": item["category"], "tags": tags_by_project.get(str(item["id"]), []),
                "big": item["featured"], "published": item["published"], "d": item["description"],
                "live": item["live_url"], "code": item["source_url"], "image": item["image_url"],
            }
            for item in projects
        ],
        "socials": [[item["name"], item["url"]] for item in social_rows],
        "journey": [{"w": item["period"], "t": item["title"], "o": item["organization"], "d": item["description"]} for item in journey],
        "education": [{"t": item["title"], "o": item["organization"], "w": item["period"], "d": item["description"]} for item in education],
        "certs": [{"t": item["title"], "o": item["organization"], "w": item["period"]} for item in certs],
        "summary": profile["summary"],
        "resumeUrl": profile["resume_url"],
        "settings": {
            "title": settings.get("title", ""),
            "description": settings.get("description", ""),
            "heroIntro": settings.get("hero_intro", ""),
            "footer": settings.get("footer", ""),
            "maintenanceNotice": settings.get("maintenance_notice", ""),
            "navLabels": settings.get("nav_labels", {}),
        },
        "updatedAt": settings.get("updated_at").isoformat() if settings.get("updated_at") else None,
    }


def save_content(conn, data: dict[str, Any]) -> None:
    conn.execute("SELECT pg_advisory_xact_lock(hashtext('portfolio-content'))")
    conn.execute("SELECT pg_advisory_xact_lock(hashtext('portfolio-content'))")
    p = data
    conn.execute(
        """INSERT INTO portfolio_profile
           (id, name, display_name, role, city, timezone, photo_url, photo_alt, photo_position,
            email, whatsapp, available, phrases, about, facts, summary, resume_url)
           VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
           ON CONFLICT (id) DO UPDATE SET
            name=excluded.name, display_name=excluded.display_name, role=excluded.role, city=excluded.city,
            timezone=excluded.timezone, photo_url=excluded.photo_url, photo_alt=excluded.photo_alt,
            photo_position=excluded.photo_position, email=excluded.email, whatsapp=excluded.whatsapp,
            available=excluded.available, phrases=excluded.phrases, about=excluded.about, facts=excluded.facts,
            summary=excluded.summary, resume_url=excluded.resume_url""",
        (p["name"], p.get("displayName", p["name"]), p["role"], p["city"], p["tz"], p["photo"],
         p["photoAlt"], p["photoPos"], p["email"], p["whatsapp"], p["available"], Jsonb(p["phrases"]),
         Jsonb(p["about"]), Jsonb(p["facts"]), p["summary"], p.get("resumeUrl", "")),
    )
    conn.execute("DELETE FROM skill_categories")
    category_ids = {}
    for order, (name, entries) in enumerate(p["skills"].items()):
        category_id = uuid4()
        category_ids[name] = category_id
        conn.execute("INSERT INTO skill_categories (id, name, position) VALUES (%s, %s, %s)", (category_id, name, order))
        for skill_order, (skill_name, level) in enumerate(entries):
            conn.execute(
                "INSERT INTO skills (id, category_id, name, level, position) VALUES (%s, %s, %s, %s, %s)",
                (uuid4(), category_id, skill_name, level, skill_order),
            )
    conn.execute("DELETE FROM projects")
    for order, item in enumerate(p["projects"]):
        project_id = uuid4()
        conn.execute(
            """INSERT INTO projects (id, title, category, description, live_url, source_url, image_url,
                                     featured, published, position)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (project_id, item["t"], item["cat"], item["d"], item["live"], item["code"], item.get("image", ""),
             item.get("big", False), item.get("published", True), order),
        )
        for tag_order, tag in enumerate(item["tags"]):
            conn.execute("INSERT INTO project_tags (id, project_id, name, position) VALUES (%s, %s, %s, %s)",
                         (uuid4(), project_id, tag, tag_order))
    for table in ("social_links", "journey_entries", "education", "certifications"):
        conn.execute(f"DELETE FROM {table}")
    for position, (name, url) in enumerate(p["socials"]):
        conn.execute("INSERT INTO social_links (id, name, url, position) VALUES (%s, %s, %s, %s)", (uuid4(), name, url, position))
    for position, item in enumerate(p["journey"]):
        conn.execute("INSERT INTO journey_entries (id, period, title, organization, description, position) VALUES (%s, %s, %s, %s, %s, %s)",
                     (uuid4(), item["w"], item["t"], item["o"], item["d"], position))
    for position, item in enumerate(p["education"]):
        conn.execute("INSERT INTO education (id, title, organization, period, description, position) VALUES (%s, %s, %s, %s, %s, %s)",
                     (uuid4(), item["t"], item["o"], item["w"], item["d"], position))
    for position, item in enumerate(p["certs"]):
        conn.execute("INSERT INTO certifications (id, title, organization, period, position) VALUES (%s, %s, %s, %s, %s)",
                     (uuid4(), item["t"], item["o"], item["w"], position))
    s = p.get("settings", {})
    conn.execute(
        """INSERT INTO website_settings (id, title, description, hero_intro, footer, maintenance_notice, nav_labels, updated_at)
           VALUES (1, %s, %s, %s, %s, %s, %s, now())
           ON CONFLICT (id) DO UPDATE SET title=excluded.title, description=excluded.description,
           hero_intro=excluded.hero_intro, footer=excluded.footer, maintenance_notice=excluded.maintenance_notice,
           nav_labels=excluded.nav_labels, updated_at=now()""",
        (s.get("title", p["name"] + " | " + p["role"]), s.get("description", ""), s.get("heroIntro", ""),
         s.get("footer", ""), s.get("maintenanceNotice", ""), Jsonb(s.get("navLabels", {}))),
    )


def seed_if_empty(conn, seed_path: Path) -> bool:
    if _one(conn, "SELECT id FROM portfolio_profile WHERE id = 1"):
        return False
    data = json.loads(seed_path.read_text(encoding="utf-8"))
    save_content(conn, data)
    return True
