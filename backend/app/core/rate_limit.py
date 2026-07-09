"""Simple in-memory rate limiter for API protection."""

import time
from collections import defaultdict

_rate_window = 60  # seconds
_max_requests_per_window = 30  # per IP


class RateLimiter:
    def __init__(self):
        self._clients: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        window_start = now - _rate_window
        # Clean old entries
        self._clients[client_ip] = [
            t for t in self._clients[client_ip] if t > window_start
        ]
        if len(self._clients[client_ip]) >= _max_requests_per_window:
            return False
        self._clients[client_ip].append(now)
        return True


rate_limiter = RateLimiter()
