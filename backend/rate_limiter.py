"""
LinkSentry In-Memory Application Rate Limiter

Provides lightweight, thread-safe sliding-window rate limiting per client IP.
Suitable for single-instance / development / small production deployments.
For horizontally scaled multi-worker production, a distributed Redis-backed limiter is recommended.
"""

import os
import time
import threading
from collections import defaultdict
from fastapi import Request, HTTPException, status


class InMemoryRateLimiter:
    """
    Thread-safe sliding-window rate limiter.
    Tracks request timestamps per client IP.
    """

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.window_seconds = 60.0
        self.requests: dict[str, list[float]] = defaultdict(list)
        self.lock = threading.Lock()

    def get_client_ip(self, request: Request) -> str:
        """Extracts the client IP from X-Forwarded-For or client.host."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # First IP in the comma-separated chain
            return forwarded.split(",")[0].strip()
        if request.client and request.client.host:
            return request.client.host
        return "127.0.0.1"

    def check_rate_limit(self, request: Request) -> None:
        """
        Checks if the client IP has exceeded the allowed requests per minute.
        Raises HTTPException(429) if exceeded.
        """
        # Allow disabling rate limiting via environment variable (e.g. for load testing)
        env_limit = os.getenv("LINKSENTRY_RATE_LIMIT_PER_MINUTE")
        if env_limit == "0" or env_limit == "disabled":
            return

        limit = int(env_limit) if env_limit and env_limit.isdigit() else self.requests_per_minute
        now = time.time()
        client_ip = self.get_client_ip(request)

        with self.lock:
            # Prune timestamps older than window_seconds
            timestamps = self.requests[client_ip]
            cutoff = now - self.window_seconds
            self.requests[client_ip] = [ts for ts in timestamps if ts > cutoff]

            if len(self.requests[client_ip]) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {limit} requests per minute allowed.",
                    headers={"Retry-After": "60"}
                )

            self.requests[client_ip].append(now)


# Default shared instance (60 requests/min per IP)
limiter = InMemoryRateLimiter(requests_per_minute=60)
