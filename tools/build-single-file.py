"""Joins index.html + css/*.css + js/*.js into ONE self-contained file: dist/portfolio.html
Use it for hosts or tools that want a single file.   python tools/build-single-file.py"""
import re
import base64
import mimetypes
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf8")


def inline_css(m):
    return "<style>\n" + (root / m.group(1)).read_text(encoding="utf8") + "</style>"


def inline_js(m):
    return "<script>\n" + (root / m.group(1)).read_text(encoding="utf8") + "</script>"


def asset_data_uri(relative_path):
    path = (root / relative_path).resolve()
    assets_dir = (root / "assets").resolve()
    if assets_dir not in path.parents or not path.is_file():
        raise FileNotFoundError(f"Referenced asset not found: {relative_path}")
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, html)
# Embed local image assets so the generated file does not depend on assets/ beside it.
html = re.sub(
    r'(<link\b[^>]*\bhref=")(assets/[^"]+)(")',
    lambda m: m.group(1) + asset_data_uri(m.group(2)) + m.group(3),
    html,
)
html = re.sub(
    r'(<img\b[^>]*\bsrc=")(assets/[^"]+)(")',
    lambda m: m.group(1) + asset_data_uri(m.group(2)) + m.group(3),
    html,
)
html = re.sub(
    r'(?m)^(\s*photo:\s*)([\'"])(assets/[^\'"]+)\2',
    lambda m: m.group(1) + m.group(2) + asset_data_uri(m.group(3)) + m.group(2),
    html,
)
out = root / "dist"
out.mkdir(exist_ok=True)
(out / "portfolio.html").write_text(html, encoding="utf8")
print("wrote dist/portfolio.html", len(html) // 1024, "KB")
