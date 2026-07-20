#!/usr/bin/env python3
"""
Food Delivery Mock API Server
Mimics the endpoints defined in the OpenAPI spec.
Runs locally using Python's built-in http.server.
Usage:
    python3 mock_server.py
"""

import json
import uuid
import re
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8080

class MockAPIHandler(BaseHTTPRequestHandler):
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
        # 1. Search Restaurants
        if self.path.startswith("/v1/search"):
            mock_restaurants = {
                "results": [
                  {
                    "restaurant_id": str(uuid.uuid4()),
                    "name": "Pizza Roma",
                    "rating": 4.5,
                    "distance_meters": 1200,
                    "h3_index": "88618c268dfffff",
                    "avg_preparation_time_mins": 25,
                    "promotions": ["Free Delivery"]
                  },
                  {
                    "restaurant_id": str(uuid.uuid4()),
                    "name": "Burger Castle",
                    "rating": 4.2,
                    "distance_meters": 2400,
                    "h3_index": "88618c268d0ffff",
                    "avg_preparation_time_mins": 18,
                    "promotions": ["10% OFF"]
                  }
                ]
            }
            self._send_json(mock_restaurants)
            return

        # 2. Track Order (GET /v1/orders/{orderId})
        order_match = re.match(r"^/v1/orders/([0-9a-fA-F-]+)$", self.path)
        if order_match:
            order_id = order_match.group(1)
            eta = (datetime.utcnow() + timedelta(minutes=30)).isoformat() + "Z"
            mock_tracking = {
                "order_id": order_id,
                "order_status": "PREPARING",
                "rider_assigned": True,
                "rider_id": str(uuid.uuid4()),
                "estimated_delivery_time": eta
            }
            self._send_json(mock_tracking)
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

        # 1. Place Order
        if self.path == "/v1/orders":
            required_fields = ["user_id", "restaurant_id", "items", "delivery_address_coords", "payment_method", "total_amount"]
            missing = [f for f in required_fields if f not in body]
            if missing:
                self._send_json({"error": f"Missing required fields: {', '.join(missing)}"}, 400)
                return

            eta = (datetime.utcnow() + timedelta(minutes=35)).isoformat() + "Z"
            response_payload = {
                "order_id": str(uuid.uuid4()),
                "order_status": "CREATED",
                "estimated_delivery_time": eta
            }
            self._send_json(response_payload, 21)
            return

        # 2. Ingest Rider Location
        if self.path == "/v1/riders/location":
            required_fields = ["rider_id", "latitude", "longitude", "bearing", "timestamp"]
            missing = [f for f in required_fields if f not in body]
            if missing:
                self._send_json({"error": f"Missing required fields: {', '.join(missing)}"}, 400)
                return

            self._send_json({"status": "OK"})
            return

        # Not Found
        self._send_json({"error": "Endpoint not found"}, 404)

def run():
    print(f"Starting Food Delivery Mock API server on port {PORT}...")
    print(f"Base URL: http://localhost:{PORT}/v1")
    print("Endpoints:")
    print("  GET  /v1/search?lat=12.9&lon=77.5&query=pizza")
    print("  POST /v1/orders")
    print("  GET  /v1/orders/<order_id>")
    print("  POST /v1/riders/location")
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, MockAPIHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")

if __name__ == '__main__':
    run()
