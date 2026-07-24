#!/usr/bin/env python3
"""
Distributed Lock System - Runnable Local Mock Server
Listens on http://localhost:8088
"""

import json
import time
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Simulated lock database and monotonic fencing token generator
LOCK_REGISTRY = {}
FENCING_COUNTER = 100000


class DistributedLockMockHandler(BaseHTTPRequestHandler):

    def _set_headers(self, status_code=200, content_type="application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path == "/health":
            self._set_headers(200)
            res = {
                "status": "UP",
                "quorum_nodes_online": 5,
                "active_locks": len(LOCK_REGISTRY)
            }
            self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        if path.startswith("/v1/locks/"):
            resource_id = path[len("/v1/locks/"):]
            if resource_id in LOCK_REGISTRY:
                lock = LOCK_REGISTRY[resource_id]
                elapsed = time.time() - lock["acquired_at"]
                ttl_rem = max(0, int((lock["ttl_ms"]/1000.0 - elapsed) * 1000))
                
                if ttl_rem == 0:
                    del LOCK_REGISTRY[resource_id]
                    self._set_headers(404)
                    res = {"is_locked": False, "resource_id": resource_id, "message": "Lock expired"}
                    self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
                    return

                self._set_headers(200)
                res = {
                    "is_locked": True,
                    "resource_id": resource_id,
                    "owner_client_id": lock["client_id"],
                    "fencing_token": lock["fencing_token"],
                    "ttl_remaining_ms": ttl_rem
                }
                self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            else:
                self._set_headers(404)
                res = {"is_locked": False, "resource_id": resource_id}
                self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))

    def do_POST(self):
        global FENCING_COUNTER
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
        
        try:
            payload = json.loads(post_data.decode('utf-8'))
        except Exception:
            payload = {}

        if path == "/v1/locks/acquire":
            resource_id = payload.get("resource_id")
            client_id = payload.get("client_id")
            ttl_ms = payload.get("ttl_ms", 10000)

            if not resource_id or not client_id:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Missing resource_id or client_id"}).encode('utf-8'))
                return

            # Check existing lock
            now = time.time()
            if resource_id in LOCK_REGISTRY:
                lock = LOCK_REGISTRY[resource_id]
                if now < lock["expires_at"]:
                    self._set_headers(409)
                    res = {
                        "acquired": False,
                        "resource_id": resource_id,
                        "message": f"Resource locked by client {lock['client_id']}",
                        "retry_after_ms": 250
                    }
                    self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
                    return

            # Grant lock
            FENCING_COUNTER += 1
            token = FENCING_COUNTER
            val_uuid = f"{client_id}:{uuid.uuid4()}"

            LOCK_REGISTRY[resource_id] = {
                "client_id": client_id,
                "uuid": val_uuid,
                "fencing_token": token,
                "acquired_at": now,
                "ttl_ms": ttl_ms,
                "expires_at": now + (ttl_ms / 1000.0)
            }

            self._set_headers(200)
            res = {
                "acquired": True,
                "resource_id": resource_id,
                "client_id": client_id,
                "fencing_token": token,
                "validity_time_ms": ttl_ms - 20,
                "quorum_nodes_ack": 4
            }
            self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        if path == "/v1/locks/release":
            resource_id = payload.get("resource_id")
            client_id = payload.get("client_id")

            if resource_id in LOCK_REGISTRY:
                lock = LOCK_REGISTRY[resource_id]
                if lock["client_id"] == client_id:
                    del LOCK_REGISTRY[resource_id]
                    self._set_headers(200)
                    res = {
                        "released": True,
                        "resource_id": resource_id,
                        "message": "Lock atomic release executed across quorum"
                    }
                    self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
                    return

            self._set_headers(400)
            self.wfile.write(json.dumps({"released": False, "message": "Lock not owned or expired"}).encode('utf-8'))
            return

        if path == "/v1/locks/renew":
            resource_id = payload.get("resource_id")
            client_id = payload.get("client_id")
            extend_ms = payload.get("extend_ms", 10000)

            if resource_id in LOCK_REGISTRY:
                lock = LOCK_REGISTRY[resource_id]
                if lock["client_id"] == client_id:
                    lock["expires_at"] = time.time() + (extend_ms / 1000.0)
                    lock["ttl_ms"] = extend_ms
                    self._set_headers(200)
                    res = {"renewed": True, "resource_id": resource_id, "new_ttl_ms": extend_ms}
                    self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
                    return

            self._set_headers(400)
            self.wfile.write(json.dumps({"renewed": False, "message": "Lock not active"}).encode('utf-8'))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))


def run(server_class=HTTPServer, handler_class=DistributedLockMockHandler, port=8088):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"🚀 Distributed Lock Mock Server running on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == '__main__':
    run()
