"""
PDF Skill (HTML → PDF).

Pattern:
  - Agent writes semantic HTML in chat.
  - It calls `html_to_pdf` with the HTML string.
  - This skill renders it to a real PDF and returns the file path.

Why HTML: agent already good at HTML; gives rich styling without
defining a custom JSON schema.

Render backend: WeasyPrint (pure-Python, no external binary).
Add to backend/pyproject.toml:
    dependencies += ["weasyprint>=62.0"]
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime
from typing import Optional

from langchain_core.tools import tool

OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "generated_pdfs",
)


PDF_SKILL_SYSTEM_PROMPT = """You are an expert at writing documents for the PDF skill.

When the user asks for a PDF, report, whitepaper, resume, invoice,
or any downloadable document, you MUST follow this exact workflow:

1. Write the FULL document as a single, self-contained HTML string
   using semantic tags: <h1>, <h2>, <h3>, <p>, <ul>, <li>, <table>,
   <strong>, <em>, <code>, <blockquote>, <hr>, <div class="...">.
2. Wrap the HTML in a complete document with a <style> block so the
   PDF looks polished WITHOUT depending on external CSS.
3. Call the `html_to_pdf` tool ONCE with that HTML string. Pass the
   HTML directly in the `html` argument.
4. After the tool returns, tell the user the filename, size, and
   absolute path of the generated PDF.

Required style block — always include this base CSS verbatim, then
add your own rules below it::

    <style>
      @page { size: A4; margin: 2cm; }
      body { font-family: 'Helvetica', 'Arial', sans-serif;
             font-size: 11pt; line-height: 1.55; color: #1a1a1a; }
      h1 { font-size: 24pt; margin: 0 0 0.6em; border-bottom: 2px solid #333; padding-bottom: 6pt; }
      h2 { font-size: 16pt; margin: 1.4em 0 0.4em; color: #1f3a5f; }
      h3 { font-size: 13pt; margin: 1em 0 0.3em; color: #2c4f7c; }
      p  { margin: 0 0 0.8em; text-align: justify; }
      ul, ol { margin: 0 0 0.8em 1.4em; }
      li { margin: 0 0 0.25em; }
      table { border-collapse: collapse; width: 100%; margin: 0 0 1em; }
      th, td { border: 1px solid #ccc; padding: 6pt 8pt; text-align: left; }
      th { background: #f0f3f8; }
      code { background: #f4f4f4; padding: 1pt 4pt; border-radius: 3pt; font-size: 10pt; }
      pre  { background: #f4f4f4; padding: 8pt; border-radius: 4pt; overflow-x: auto; }
      blockquote { border-left: 3px solid #888; margin: 0.5em 0 0.8em;
                   padding: 0.2em 0.8em; color: #444; background: #fafafa; }
      hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
    </style>

Document rules:
- Start the HTML with `<!DOCTYPE html><html><head>...</head><body>...`
- Title: use <h1> for the document title near the top.
- Length: aim for the length the user asked for; do not pad.
- Tables: use them for any structured data.
- No external assets (no <img src="https://...">, no <link>, no <script>).
  If the user wants a logo, generate it as inline SVG.
- The HTML must be a single string. Escape any backticks inside it
  before passing to the tool, or use a raw triple-quoted string.

Examples of good output:

  "Here's the report." -> tool call with full HTML.
  After tool returns   -> "Saved as report-ab12cd34.pdf (18,402 bytes)
                            at /path/to/generated_pdfs/report-ab12cd34.pdf."

Do NOT:
- Do NOT call the tool with markdown.
- Do NOT call it with a JSON wrapper.
- Do NOT split the document across multiple tool calls.
"""


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _slugify(text: str, max_len: int = 60) -> str:
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    text = re.sub(r"[-\s]+", "-", text)
    return (text or "document")[:max_len]


def _extract_title(html: str) -> str:
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.IGNORECASE | re.DOTALL)
    if m:
        title = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        if title:
            return title
    return "document"


def _ensure_html_skeleton(html: str) -> str:
    """If the agent forgot <html>/<body>, wrap it. Inject page CSS if missing."""
    if "<html" not in html.lower():
        html = f"<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>{html}</body></html>"
    if "<style" not in html.lower():
        css = """
        <style>
          @page { size: A4; margin: 2cm; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11pt; line-height: 1.55; color: #1a1a1a; }
          h1 { font-size: 24pt; margin: 0 0 0.6em; border-bottom: 2px solid #333; padding-bottom: 6pt; }
          h2 { font-size: 16pt; margin: 1.4em 0 0.4em; color: #1f3a5f; }
          h3 { font-size: 13pt; margin: 1em 0 0.3em; color: #2c4f7c; }
          p  { margin: 0 0 0.8em; }
        </style>
        """
        html = html.replace("<head>", f"<head>{css}", 1)
        if "<head>" not in html:
            html = html.replace("<html>", f"<html><head>{css}</head>", 1)
    return html


def _render(html: str, out_path: str) -> None:
    from weasyprint import HTML
    HTML(string=html, base_url=".").write_pdf(out_path)


# --------------------------------------------------------------------------- #
# Tool
# --------------------------------------------------------------------------- #

@tool
def html_to_pdf(
    html: str,
    filename: Optional[str] = None,
) -> str:
    """Convert a self-contained HTML string into a PDF file and return the path.

    The HTML MUST include a <style> block in <head> (the agent is
    instructed to include a base stylesheet). External CSS, images, and
    scripts are not fetched — keep the document fully self-contained.

    Args:
        html: Full HTML document. Must be a single string.
        filename: Optional output filename (no path). Defaults to a
            slug of the <h1> title plus a short UUID.

    Returns:
        JSON string with keys: status, path, filename, size_bytes, title.
        On error: status="error", error, detail.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    try:
        if not html or not html.strip():
            raise ValueError("html argument is empty")

        html = _ensure_html_skeleton(html)
        title = _extract_title(html)
        out_name = f"{_slugify(filename or title)}-{uuid.uuid4().hex[:8]}.pdf"
        out_path = os.path.join(OUTPUT_DIR, out_name)

        _render(html, out_path)

        result = {
            "status": "ok",
            "path": out_path,
            "filename": out_name,
            "size_bytes": os.path.getsize(out_path),
            "title": title,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }
    except Exception as exc:
        result = {
            "status": "error",
            "error": exc.__class__.__name__,
            "detail": str(exc),
        }
    return json.dumps(result)
