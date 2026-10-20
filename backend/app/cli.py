import argparse
from pathlib import Path

from .store import connection, seed_if_empty

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description="Portfolio API setup")
    parser.add_argument("command", choices=["migrate", "seed"])
    args = parser.parse_args()
    if args.command == "migrate":
        import psycopg
        from .config import required

        with psycopg.connect(required("DATABASE_URL")) as conn:
            conn.execute((ROOT / "schema.sql").read_text(encoding="utf-8"))
        print("Database schema is ready.")
    else:
        source = ROOT / "seed.json"
        if not source.is_file():
            raise SystemExit("Run `node ..\\tools\\export-content.js` first to export js/data.js.")
        with connection() as conn:
            seeded = seed_if_empty(conn, source)
        print("Portfolio content imported." if seeded else "Existing content was left unchanged.")


if __name__ == "__main__":
    main()
