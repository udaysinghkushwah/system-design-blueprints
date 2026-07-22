#!/usr/bin/env python3
"""
Global Hotel Booking System Mock API Server
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

PORT = 8089

class HotelMockAPIHandler(BaseHTTPRequestHandler):
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
        # 1. Search Hotels (GET /v1/hotels/search)
        if self.path.startswith("/v1/hotels/search"):
            mock_search_results = {
                "total_results": 2,
                "page": 1,
                "hotels": [
                    {
                        "hotel_id": str(uuid.uuid4()),
                        "name": "Hilton Times Square",
                        "star_rating": 4.5,
                        "city": "New York",
                        "available_room_types": [
                            {
                                "room_type_id": "rt_deluxe_king",
                                "name": "Deluxe King Room",
                                "available_rooms": 3,
                                "price_per_night": 289.00,
                                "total_price": 867.00
                            },
                            {
                                "room_type_id": "rt_executive_suite",
                                "name": "Executive Suite",
                                "available_rooms": 1,
                                "price_per_night": 450.00,
                                "total_price": 1350.00
                            }
                        ]
                    },
                    {
                        "hotel_id": str(uuid.uuid4()),
                        "name": "Marriott Marquis",
                        "star_rating": 4.7,
                        "city": "New York",
                        "available_room_types": [
                            {
                                "room_type_id": "rt_standard_queen",
                                "name": "Standard Queen Room",
                                "available_rooms": 5,
                                "price_per_night": 220.00,
                                "total_price": 660.00
                            }
                        ]
                    }
                ]
            }
            self._send_json(mock_search_results)
            return

        # 2. Get Booking Details (GET /v1/reservations/{bookingId})
        booking_match = re.match(r"^/v1/reservations/([0-9a-fA-F-]+)$", self.path)
        if booking_match:
            booking_id = booking_match.group(1)
            mock_booking = {
                "booking_id": booking_id,
                "hotel_name": "Hilton Times Square",
                "room_name": "Deluxe King Room",
                "check_in_date": "2026-10-15",
                "check_out_date": "2026-10-18",
                "status": "CONFIRMED",
                "confirmation_code": "HILTON-NY-90812",
                "total_paid": 867.00,
                "created_at": datetime.utcnow().isoformat() + "Z"
            }
            self._send_json(mock_booking)
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

        # 1. Request 10-Minute Hold Lock
        if self.path == "/v1/reservations/hold":
            required_fields = ["user_id", "hotel_id", "room_type_id", "check_in_date", "check_out_date", "idempotency_key"]
            missing = [f for f in required_fields if f not in body]
            if missing:
                self._send_json({"error": f"Missing required fields: {', '.join(missing)}"}, 400)
                return

            expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat() + "Z"
            response_payload = {
                "status": "HELD",
                "reservation_id": str(uuid.uuid4()),
                "hold_expires_at": expires_at,
                "hold_seconds_remaining": 600,
                "total_price": 867.00
            }
            self._send_json(response_payload, 200)
            return

        # 2. Confirm Booking & Execute Payment
        if self.path == "/v1/reservations/confirm":
            required_fields = ["reservation_id", "payment_token"]
            missing = [f for f in required_fields if f not in body]
            if missing:
                self._send_json({"error": f"Missing required fields: {', '.join(missing)}"}, 400)
                return

            response_payload = {
                "status": "CONFIRMED",
                "booking_id": str(uuid.uuid4()),
                "confirmation_code": "HILTON-NY-90812",
                "confirmed_at": datetime.utcnow().isoformat() + "Z"
            }
            self._send_json(response_payload, 200)
            return

        # Not Found
        self._send_json({"error": "Endpoint not found"}, 404)

def run():
    print(f"Starting Hotel Booking Mock API server on port {PORT}...")
    print(f"Base URL: http://localhost:{PORT}/v1")
    print("Endpoints:")
    print("  GET  /v1/hotels/search?city=NewYork&check_in=2026-10-15&check_out=2026-10-18")
    print("  POST /v1/reservations/hold")
    print("  POST /v1/reservations/confirm")
    print("  GET  /v1/reservations/<booking_id>")
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, HotelMockAPIHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")

if __name__ == '__main__':
    run()
