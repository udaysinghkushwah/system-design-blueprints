#!/usr/bin/env python3
"""
Smart Multi-Elevator System Mock API Server
Mimics the endpoints defined in the OpenAPI spec.
Runs locally using Python's built-in http.server.
Usage:
    python3 mock_server.py
"""

import json
import uuid
import re
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8088

class ElevatorMockAPIHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))

    def do_OPTIONS(self):
        # Handle CORS pre-flight requests
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        # 1. Get Elevator State (GET /v1/elevators/{carId}/state)
        car_match = re.match(r"^/v1/elevators/([0-9a-fA-F-]+)/state$", self.path)
        if car_match:
            car_id = car_match.group(1)
            mock_state = {
                "elevator_id": car_id,
                "car_number": 2,
                "bank_name": "Mid-Rise Bank",
                "current_floor": 14,
                "target_floor": 45,
                "direction": "UP",
                "state": "MOVING",
                "door_state": "CLOSED",
                "weight_kg": 640.0,
                "load_percentage": 40.0,
                "last_updated": datetime.utcnow().isoformat() + "Z"
            }
            self._send_json(mock_state)
            return

        # Not Found
        self._send_json({"error": "Endpoint not found"}, 404)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            body = json.loads(post_data.decode('utf-8')) if post_data else {}
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON body"}, 400)
            return

        # 1. Destination Dispatch Request
        if self.path == "/v1/dispatch/request":
            required_fields = ["kiosk_id", "source_floor", "destination_floor"]
            missing = [f for f in required_fields if f not in body]
            if missing:
                self._send_json({"error": f"Missing required fields: {', '.join(missing)}"}, 400)
                return

            src = body["source_floor"]
            dst = body["destination_floor"]
            wait_time = round(abs(src - 1) * 1.5 + 4.0, 1)

            response_payload = {
                "status": "SUCCESS",
                "request_id": str(uuid.uuid4()),
                "assigned_elevator": {
                    "elevator_id": "e3012345-0000-0000-0000-000000000002",
                    "bank_name": "Mid-Rise Bank" if dst <= 50 else "High-Rise Bank",
                    "car_label": "Elevator B",
                    "current_floor": src,
                    "estimated_wait_seconds": wait_time
                }
            }
            self._send_json(response_payload, 200)
            return

        # 2. Hall Call Request (Button press)
        if self.path == "/v1/elevator/call":
            required_fields = ["floor_number", "direction"]
            missing = [f for f in required_fields if f not in body]
            if missing:
                self._send_json({"error": f"Missing required fields: {', '.join(missing)}"}, 400)
                return

            response_payload = {
                "status": "REGISTERED",
                "floor_number": body["floor_number"],
                "direction": body["direction"],
                "assigned_car_label": "Elevator C"
            }
            self._send_json(response_payload, 200)
            return

        # 3. Ingest Telemetry Stream
        if self.path == "/v1/telemetry/ingest":
            required_fields = ["timestamp", "elevator_id", "current_floor", "direction", "state"]
            missing = [f for f in required_fields if f not in body]
            if missing:
                self._send_json({"error": f"Missing required fields: {', '.join(missing)}"}, 400)
                return

            self._send_json({"status": "OK"})
            return

        # Not Found
        self._send_json({"error": "Endpoint not found"}, 404)

def run():
    print(f"Starting Smart Elevator Mock API server on port {PORT}...")
    print(f"Base URL: http://localhost:{PORT}/v1")
    print("Endpoints:")
    print("  POST /v1/dispatch/request")
    print("  POST /v1/elevator/call")
    print("  GET  /v1/elevators/<car_id>/state")
    print("  POST /v1/telemetry/ingest")
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ElevatorMockAPIHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")

if __name__ == '__main__':
    run()
