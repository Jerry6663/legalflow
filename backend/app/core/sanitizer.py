"""Input sanitization utilities."""

import re
import html


def sanitize_text(text: str, max_length: int = 100000) -> str:
    """Sanitize user input text."""
    if not text:
        return ""
    # Truncate
    text = text[:max_length]
    # Strip dangerous chars but preserve Chinese
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text


def sanitize_html(text: str) -> str:
    """Escape HTML entities."""
    return html.escape(text)
