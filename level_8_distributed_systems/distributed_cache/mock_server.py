#!/usr/bin/env python3
"""
Distributed Cache System - Runnable Local Mock Server
Listens on http://localhost:8087
"""

import json
import time
import hashlib
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Simulated in-memory cluster storage
CACHE_STORE = {
    "user:profile:98214": {
        "value": {"user_id": "98214", "name": "Sarah Connor", "tier": "PREMIUM"},
        "created_at": time.time(),
        "ttl_seconds": 3600,
        "node_id": "node-p1-a1"
    },
    "user:profile:101": {
        "value": {"user_id": "101", "name": "Alice Smith", "role": "ADMIN"},
        "created_at": time.time(),
        "ttl_seconds": 1800,
        "node_id": "node-p2-b1"
    }
}

NODES_STATUS = [
    {"node_id": "node-p1-a1", "role": "PRIMARY", "partition": "Partition-A", "status": "ONLINE", "ip": "10.0.1.15", "memory_used_mb": 14200, "keys_count": 3412000},
    {"node_id": "node-p1-a2", "role": "REPLICA", "partition": "Partition-A", "status": "ONLINE", "ip": "10.0.1.16", "memory_used_mb": 14200, "keys_count": 3412000},
    {"node_id": "node-p2-b1", "role": "PRIMARY", "partition": "Partition-B", "status": "ONLINE", "ip": "10.0.2.20", "memory_used_mb": 15800, "keys_count": 3890000},
    {"node_id": "node-p3-c1", "role": "PRIMARY", "partition": "Partition-C", "status": "ONLINE", "ip": "10.0.3.45", "memory_used_mb": 12900, "keys_count": 2900000}
]

def hash_key_to_node(key: str) -> str:
    """Consistently hash a key string to one of the active primary nodes."""
    h = int(hashlib.md5(key.encode('utf-8')).hexdigest()[:8], 16)
    primaries = [n["node_id"] for n in NODES_STATUS if n["role"] == "PRIMARY"]
    return primaries[h % len(primaries)]


class DistributedCacheMockHandler(BaseHTTPRequestHandler):

    def _set_headers(self, status_code=200, content_type="application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Cache-Strategy")
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
                "cluster_state": "HEALTHY",
                "active_nodes": len(NODES_STATUS),
                "timestamp": time.time()
            }
            self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        if path == "/v1/cluster/nodes":
            self._set_headers(200)
            res = {
                "total_nodes": len(NODES_STATUS),
                "active_partitions": 3,
                "nodes": NODES_STATUS
            }
            self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        if path.startswith("/v1/cache/"):
            key = path[len("/v1/cache/"):]
            if key in CACHE_STORE:
                entry = CACHE_STORE[key]
                elapsed = time.time() - entry["created_at"]
                ttl_rem = max(0, int((entry["ttl_seconds"] - elapsed) * 1000))
                
                if ttl_rem == 0 and entry["ttl_seconds"] > 0:
                    del CACHE_STORE[key]
                    self._set_headers(404)
                    res = {"status": "MISS", "key": key, "message": "Key expired"}
                    self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
                    return

                self._set_headers(200)
                res = {
                    "status": "HIT",
                    "key": key,
                    "value": entry["value"],
                    "ttl_remaining_ms": ttl_rem,
                    "node_id": entry["node_id"]
                }
                self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            else:
                self._set_headers(404)
                res = {
                    "status": "MISS",
                    "key": key,
                    "message": "Key not present in cache node"
                }
                self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))

    def do_POST(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
        
        try:
            payload = json.loads(post_data.decode('utf-8'))
        except Exception:
            payload = {}

        if path == "/v1/cache":
            key = payload.get("key")
            value = payload.get("value")
            ttl_seconds = payload.get("ttl_seconds", 3600)

            if not key or value is None:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Missing key or value"}).encode('utf-8'))
                return

            assigned_node = hash_key_to_node(key)
            CACHE_STORE[key] = {
                "value": value,
                "created_at": time.time(),
                "ttl_seconds": ttl_seconds,
                "node_id": assigned_node
            }

            self._set_headers(201)
            res = {
                "success": True,
                "key": key,
                "allocated_bytes": len(json.dumps(value)) + len(key) + 64,
                "partition_id": "Partition-" + assigned_node.split('-')[1].upper(),
                "node_id": assigned_node
            }
            self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        if path == "/v1/cache/batch-get":
            keys = payload.get("keys", [])
            hits = {}
            misses = []

            for k in keys:
                if k in CACHE_STORE:
                    hits[k] = CACHE_STORE[k]["value"]
                else:
                    misses.append(k)

            self._set_headers(200)
            res = {"hits": hits, "misses": misses}
            self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))

    def do_DELETE(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/v1/cache/"):
            key = path[len("/v1/cache/"):]
            if key in CACHE_STORE:
                del CACHE_STORE[key]
                self._set_headers(200)
                res = {
                    "success": True,
                    "key": key,
                    "message": "Key invalidated across primary and replicas"
                }
                self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            else:
                self._set_headers(404)
                res = {"success": False, "key": key, "message": "Key not found"}
                self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))


def run(server_class=HTTPServer, handler_class=DistributedCacheMockHandler, port=8087):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"🚀 Distributed Cache Mock Server running on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == '__main__':
    run()
