#!/usr/bin/env python3
"""
Standalone Mock API Server for Distributed Rate Limiter
Port: 8092
"""

import json
import time
import math
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

PORT = 8092

# In-memory counter store for mock server
COUNTER_STORE = {}
MAX_LIMIT = 5  # Allow 5 requests per 10 second window for demo

class RateLimiterMockHandler(BaseHTTPRequestHandler):

    def _send_response(self, code, body, extra_headers=None):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-RateLimit-Limit')
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, str(v))
        self.end_headers()
        self.wfile.write(json.dumps(body, indent=2).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/' or parsed.path == '/health':
            self._send_response(200, {
                "status": "HEALTHY",
                "service": "Rate Limiter Mock Server",
                "port": PORT,
                "version": "1.0.0"
            })

        elif parsed.path == '/v1/rules':
            self._send_response(200, {
                "rules": [
                    {
                        "rule_id": "rule-payment-101",
                        "tenant_id": "acme_corp",
                        "target_route": "/v1/payments",
                        "client_tier": "PRO",
                        "time_window_seconds": 60,
                        "max_requests": 5000,
                        "algorithm": "SLIDING_WINDOW_COUNTER",
                        "action_type": "REJECT",
                        "is_active": True
                    },
                    {
                        "rule_id": "rule-public-free",
                        "tenant_id": "acme_corp",
                        "target_route": "/*",
                        "client_tier": "FREE",
                        "time_window_seconds": 60,
                        "max_requests": 100,
                        "algorithm": "TOKEN_BUCKET",
                        "action_type": "REJECT",
                        "is_active": True
                    }
                ]
            })

        elif parsed.path == '/v1/metrics':
            self._send_response(200, {
                "total_evaluations": 1048576,
                "allowed_count": 1040000,
                "throttled_count": 8576,
                "p99_latency_ms": 1.15,
                "active_redis_shards": 6,
                "cached_keys_count": 142090
            })

        elif parsed.path == '/v1/rate-limit/check':
            params = parse_qs(parsed.query)
            client_id = params.get('client_id', ['user_default'])[0]
            self._evaluate_and_respond(client_id, "/v1/payments")

        else:
            self._send_response(404, {"error": "Endpoint not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'

        try:
            payload = json.loads(post_body.decode('utf-8'))
        except Exception:
            payload = {}

        if parsed.path == '/v1/rate-limit/check':
            client_id = payload.get('client_identifier', 'usr_default')
            route = payload.get('route', '/v1/payments')
            self._evaluate_and_respond(client_id, route)

        elif parsed.path == '/v1/rules':
            self._send_response(201, {
                "rule_id": "rule-" + str(int(time.time())),
                "tenant_id": payload.get("tenant_id", "acme"),
                "target_route": payload.get("target_route", "/v1/api"),
                "max_requests": payload.get("max_requests", 1000),
                "time_window_seconds": payload.get("time_window_seconds", 60),
                "status": "CREATED"
            })

        else:
            self._send_response(404, {"error": "Endpoint not found"})

    def _evaluate_and_respond(self, client_id, route):
        now = time.time()
        window = 10
        curr_window = int(now // window)
        key = f"{client_id}:{route}:{curr_window}"

        count = COUNTER_STORE.get(key, 0) + 1
        COUNTER_STORE[key] = count

        reset_ts = (curr_window + 1) * window
        remaining = max(0, MAX_LIMIT - count)

        headers = {
            "X-RateLimit-Limit": MAX_LIMIT,
            "X-RateLimit-Remaining": remaining,
            "X-RateLimit-Reset": reset_ts
        }

        if count <= MAX_LIMIT:
            self._send_response(200, {
                "status": "ALLOWED",
                "rule_id": "rule-payment-demo",
                "algorithm": "SLIDING_WINDOW_COUNTER",
                "limit": MAX_LIMIT,
                "remaining": remaining,
                "reset_timestamp": reset_ts,
                "shadow_mode": False
            }, extra_headers=headers)
        else:
            retry_after = int(reset_ts - now)
            headers["Retry-After"] = retry_after
            self._send_response(429, {
                "status": "THROTTLED",
                "error_code": "TOO_MANY_REQUESTS",
                "message": f"Rate limit exceeded. Max {MAX_LIMIT} requests per {window}s allowed.",
                "rule_id": "rule-payment-demo",
                "limit": MAX_LIMIT,
                "remaining": 0,
                "reset_timestamp": reset_ts,
                "retry_after_seconds": retry_after
            }, extra_headers=headers)


def run_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, RateLimiterMockHandler)
    print(f"🚦 Rate Limiter Mock API Server running on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()


if __name__ == '__main__':
    run_server()
