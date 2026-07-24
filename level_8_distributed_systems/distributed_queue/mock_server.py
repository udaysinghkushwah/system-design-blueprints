#!/usr/bin/env python3
"""
Distributed Message Queue - Runnable Local Mock Server
Listens on http://localhost:8089
"""

import json
import time
import hashlib
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Simulated partition memory logs and consumer offsets
PARTITION_LOGS = {
    0: [
        {"offset": 0, "key": "user_101", "payload": {"order_id": "ORD-001", "amount": 99.50}, "timestamp": time.time()},
        {"offset": 1, "key": "user_104", "payload": {"order_id": "ORD-004", "amount": 50.00}, "timestamp": time.time()}
    ],
    1: [
        {"offset": 0, "key": "user_102", "payload": {"order_id": "ORD-002", "amount": 149.00}, "timestamp": time.time()}
    ],
    2: [
        {"offset": 0, "key": "user_103", "payload": {"order_id": "ORD-003", "amount": 25.00}, "timestamp": time.time()}
    ]
}

CONSUMER_OFFSETS = {
    "order-processors": {0: 0, 1: 0, 2: 0}
}


class DistributedQueueMockHandler(BaseHTTPRequestHandler):

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
                "broker_role": "LEADER",
                "active_partitions": len(PARTITION_LOGS),
                "total_messages": sum(len(logs) for logs in PARTITION_LOGS.values())
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

        if path.endswith("/publish"):
            topic = path.split("/")[3]
            key = payload.get("key", "default_key")
            body = payload.get("payload", {})

            # MurmurHash partition routing
            h = int(hashlib.md5(key.encode('utf-8')).hexdigest()[:8], 16)
            partition_id = h % len(PARTITION_LOGS)

            logs = PARTITION_LOGS[partition_id]
            offset = len(logs)
            record = {"offset": offset, "key": key, "payload": body, "timestamp": time.time()}
            logs.append(record)

            self._set_headers(201)
            res = {
                "status": "PUBLISHED",
                "topic": topic,
                "partition": partition_id,
                "offset": offset,
                "timestamp_ms": int(time.time() * 1000)
            }
            self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        if path.endswith("/consume"):
            topic = path.split("/")[3]
            group_id = payload.get("consumer_group", "default-group")
            max_msgs = payload.get("max_messages", 10)

            if group_id not in CONSUMER_OFFSETS:
                CONSUMER_OFFSETS[group_id] = {p: 0 for p in PARTITION_LOGS}

            result_msgs = []
            for p_id, logs in PARTITION_LOGS.items():
                start_offset = CONSUMER_OFFSETS[group_id].get(p_id, 0)
                for item in logs:
                    if item["offset"] >= start_offset and len(result_msgs) < max_msgs:
                        result_msgs.append({
                            "partition": p_id,
                            "offset": item["offset"],
                            "key": item["key"],
                            "payload": item["payload"],
                            "receipt_handle": f"handle_p{p_id}_off{item['offset']}"
                        })

            self._set_headers(200)
            res = {
                "topic": topic,
                "messages_count": len(result_msgs),
                "messages": result_msgs
            }
            self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        if path.endswith("/offsets/commit"):
            group_id = payload.get("consumer_group", "default-group")
            offsets = payload.get("offsets", [])

            if group_id not in CONSUMER_OFFSETS:
                CONSUMER_OFFSETS[group_id] = {}

            for item in offsets:
                p_id = item.get("partition")
                off = item.get("committed_offset")
                if p_id is not None and off is not None:
                    CONSUMER_OFFSETS[group_id][p_id] = off + 1

            self._set_headers(200)
            res = {"success": True, "committed": len(offsets)}
            self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))


def run(server_class=HTTPServer, handler_class=DistributedQueueMockHandler, port=8089):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"🚀 Distributed Queue Mock Server running on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == '__main__':
    run()
