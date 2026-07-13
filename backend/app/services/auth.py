"""Auth service — SQLite-backed token authentication."""

import secrets
from ..core.database import register_user, verify_user, get_user_profile

_tokens: dict[str, str] = {}

def register(username: str, password: str) -> str | None:
    if register_user(username, password):
        return _make_token(username)
    return None

def login(username: str, password: str) -> str | None:
    user = verify_user(username, password)
    if not user:
        return None
    return _make_token(username)

def _make_token(username: str) -> str:
    token = secrets.token_hex(32)
    _tokens[token] = username
    return token

def get_user_by_token(token: str) -> dict | None:
    username = _tokens.get(token)
    if not username:
        return None
    return get_user_profile(username)
