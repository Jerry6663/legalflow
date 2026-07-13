"""SQLite database layer — replaces JSON file storage. Uses standard library sqlite3."""

import sqlite3
import json
import hashlib
import secrets
import os
from pathlib import Path

DB_DIR = Path(__file__).parent.parent.parent / "data"
DB_PATH = DB_DIR / "legalflow.db"

def get_conn():
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_conn()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        review_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        username TEXT,
        filename TEXT,
        contract_type TEXT,
        contract_text TEXT,
        overall_level TEXT,
        total_risks INTEGER,
        high_risks INTEGER,
        result_json TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id TEXT,
        layer TEXT NOT NULL,
        action TEXT NOT NULL,
        input_summary TEXT,
        output_summary TEXT,
        duration_ms INTEGER,
        status TEXT DEFAULT 'success',
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        rating INTEGER,
        feedback TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );
    """)
    conn.commit()
    conn.close()

# ===== User operations =====
def register_user(username, password):
    conn = get_conn()
    salt = secrets.token_hex(8)
    pwd_hash = hashlib.sha256(f"{password}{salt}".encode()).hexdigest()
    try:
        conn.execute(
            "INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
            (username, pwd_hash, salt)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def verify_user(username, password):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    if not row:
        return None
    expected = hashlib.sha256(f"{password}{row['salt']}".encode()).hexdigest()
    if expected == row['password_hash']:
        return {"username": username, "review_count": row['review_count']}
    return None

def get_user_profile(username):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    if row:
        return {"username": row['username'], "review_count": row['review_count']}
    return None

def increment_review_count(username):
    conn = get_conn()
    conn.execute("UPDATE users SET review_count = review_count + 1 WHERE username = ?", (username,))
    conn.commit()
    conn.close()

# ===== Review operations =====
def save_review(review_id, username, filename, contract_type, contract_text, overall_level, total_risks, high_risks, result_json):
    conn = get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO reviews (id, username, filename, contract_type, contract_text, overall_level, total_risks, high_risks, result_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (review_id, username, filename, contract_type, contract_text, overall_level, total_risks, high_risks, json.dumps(result_json, ensure_ascii=False))
    )
    conn.commit()
    conn.close()

def get_review(review_id):
    conn = get_conn()
    row = conn.execute("SELECT * FROM reviews WHERE id = ?", (review_id,)).fetchone()
    conn.close()
    if row:
        return {
            "id": row['id'], "username": row['username'], "filename": row['filename'],
            "contract_type": row['contract_type'], "overall_level": row['overall_level'],
            "total_risks": row['total_risks'], "high_risks": row['high_risks'],
            "result_json": json.loads(row['result_json']) if row['result_json'] else None,
            "created_at": row['created_at']
        }
    return None

def get_reviews(username=None, limit=50):
    conn = get_conn()
    if username:
        rows = conn.execute("SELECT id, filename, contract_type, overall_level, total_risks, high_risks, created_at FROM reviews WHERE username = ? ORDER BY created_at DESC LIMIT ?", (username, limit)).fetchall()
    else:
        rows = conn.execute("SELECT id, filename, contract_type, overall_level, total_risks, high_risks, created_at FROM reviews ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ===== Audit operations =====
def add_audit_log(review_id, layer, action, input_summary, output_summary="", duration_ms=0, status="success"):
    conn = get_conn()
    conn.execute(
        "INSERT INTO audit_logs (review_id, layer, action, input_summary, output_summary, duration_ms, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (review_id, layer, action, input_summary, output_summary, duration_ms, status)
    )
    conn.commit()
    conn.close()

def get_audit_logs(review_id):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM audit_logs WHERE review_id = ? ORDER BY id", (review_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ===== Feedback =====
def save_feedback(username, rating, feedback):
    conn = get_conn()
    conn.execute("INSERT INTO feedback (username, rating, feedback) VALUES (?, ?, ?)", (username, rating, feedback))
    conn.commit()
    conn.close()

# Initialize on import
init_db()
