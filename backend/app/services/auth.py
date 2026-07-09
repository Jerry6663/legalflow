"""Auth service — simple token-based authentication (MVP)."""

import hashlib
import json
import secrets
from pathlib import Path

USERS_FILE = Path(__file__).parent.parent.parent / "data" / "users.json"

_users: dict[str, dict] = {}      # username → {password_hash, ...}
_tokens: dict[str, str] = {}      # token → username


def _load_users():
    global _users
    if USERS_FILE.exists():
        _users = json.loads(USERS_FILE.read_text(encoding="utf-8"))
    else:
        _users = {}


def _save_users():
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    USERS_FILE.write_text(json.dumps(_users, ensure_ascii=False, indent=2), encoding="utf-8")


_load_users()


def register(username: str, password: str) -> str | None:
    """Register a new user. Returns token on success, None if username taken."""
    if username in _users:
        return None
    salt = secrets.token_hex(8)
    pwd_hash = hashlib.sha256(f"{password}{salt}".encode()).hexdigest()
    _users[username] = {
        "password_hash": pwd_hash,
        "salt": salt,
        "review_count": 0,
        "created_at": "",
    }
    _save_users()
    return _make_token(username)


def login(username: str, password: str) -> str | None:
    """Login. Returns token on success, None otherwise."""
    user = _users.get(username)
    if not user:
        return None
    pwd_hash = hashlib.sha256(f"{password}{user['salt']}".encode()).hexdigest()
    if pwd_hash != user["password_hash"]:
        return None
    return _make_token(username)


def _make_token(username: str) -> str:
    token = secrets.token_hex(32)
    _tokens[token] = username
    return token


def get_user_by_token(token: str) -> dict | None:
    """Get user info from token."""
    username = _tokens.get(token)
    if not username:
        return None
    user = _users.get(username)
    if not user:
        return None
    return {"username": username, "review_count": user.get("review_count", 0)}


def increment_review_count(username: str):
    """Increment user's review count."""
    if username in _users:
        _users[username]["review_count"] = _users[username].get("review_count", 0) + 1
        _save_users()


def get_user_profile(username: str) -> dict | None:
    """Get full user profile (without password)."""
    user = _users.get(username)
    if not user:
        return None
    return {
        "username": username,
        "review_count": user.get("review_count", 0),
    }
