#!/usr/bin/env python3
"""
Search Ranking — Local Mock API Server
Matches the OpenAPI 3.0 spec: search_ranking_api_spec.yaml
Run: python3 level_10_search_systems/search_ranking/mock_server.py
Port: 8095
"""

import json
import time
import math
import random
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 8095

# ─────────────────────────────────────────────
# Mock Data & Catalog
# ─────────────────────────────────────────────

MOCK_CATALOG = [
    {
        "item_id": "itm_headphone_901",
        "title": "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
        "category_id": "cat_audio_102",
        "price": 398.00,
        "base_p_ctr": 0.185,
        "base_p_cvr": 0.042,
        "base_p_long_click": 0.720,
        "is_sponsored": False
    },
    {
        "item_id": "itm_headphone_402",
        "title": "Bose QuietComfort 45 Bluetooth Headphones",
        "category_id": "cat_audio_102",
        "price": 329.00,
        "base_p_ctr": 0.162,
        "base_p_cvr": 0.038,
        "base_p_long_click": 0.695,
        "is_sponsored": True
    },
    {
        "item_id": "itm_audio_771",
        "title": "Sennheiser Momentum 4 Wireless Over-Ear Headphones",
        "category_id": "cat_audio_102",
        "price": 349.95,
        "base_p_ctr": 0.145,
        "base_p_cvr": 0.035,
        "base_p_long_click": 0.680,
        "is_sponsored": False
    },
    {
        "item_id": "itm_earbud_105",
        "title": "Apple AirPods Max Wireless Headset",
        "category_id": "cat_audio_102",
        "price": 549.00,
        "base_p_ctr": 0.192,
        "base_p_cvr": 0.048,
        "base_p_long_click": 0.750,
        "is_sponsored": False
    },
    {
        "item_id": "itm_speaker_309",
        "title": "JBL Charge 5 Portable Bluetooth Speaker",
        "category_id": "cat_speakers_105",
        "price": 179.95,
        "base_p_ctr": 0.120,
        "base_p_cvr": 0.029,
        "base_p_long_click": 0.580,
        "is_sponsored": False
    },
    {
        "item_id": "itm_accessory_202",
        "title": "Universal Headphone Stand Mount Hanger",
        "category_id": "cat_accessories_108",
        "price": 19.99,
        "base_p_ctr": 0.095,
        "base_p_cvr": 0.055,
        "base_p_long_click": 0.410,
        "is_sponsored": False
    }
]

MOCK_USER_PROFILES = {
    "usr_9918234a": {
        "user_id": "usr_9918234a",
        "avg_purchase_price": 250.00,
        "preferred_category": "cat_audio_102",
        "recent_search_terms": ["wireless headphones", "bluetooth speaker"],
        "account_tier": "PRIME_GOLD"
    }
}

FEEDBACK_LOGS = []


class MockSearchRankingHandler(BaseHTTPRequestHandler):

    def _set_headers(self, status_code=200, content_type="application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path == "/v1/health" or path == "/health":
            self._handle_health()
        elif path.startswith("/v1/features/user/"):
            user_id = path.replace("/v1/features/user/", "")
            self._handle_get_user_features(user_id)
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        content_length = int(self.headers.get('Content-Length', 0))
        body_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
        
        try:
            payload = json.loads(body_data.decode('utf-8'))
        except Exception:
            payload = {}

        if path == "/v1/search/rank" or path == "/search/rank":
            self._handle_search_rank(payload)
        elif path == "/v1/ranking/feedback" or path == "/ranking/feedback":
            self._handle_ranking_feedback(payload)
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))

    def _handle_health(self):
        res = {
            "status": "UP",
            "active_models": {
                "l2_pre_rank": "lightgbm_v1.8",
                "l3_deep_rank": "transformer_v2.4"
            },
            "feature_store_latency_ms": 1.2
        }
        self._set_headers(200)
        self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))

    def _handle_get_user_features(self, user_id: str):
        user = MOCK_USER_PROFILES.get(user_id)
        if not user:
            user = {
                "user_id": user_id,
                "avg_purchase_price": 100.00,
                "preferred_category": "cat_general",
                "recent_search_terms": [],
                "account_tier": "STANDARD"
            }
        self._set_headers(200)
        self.wfile.write(json.dumps(user, indent=2).encode('utf-8'))

    def _handle_search_rank(self, payload: dict):
        query = payload.get("query", "wireless headphones")
        user_id = payload.get("user_id", "usr_default")
        top_k = payload.get("top_k", 20)
        req_id = payload.get("request_id", f"req_{int(time.time()*1000)}")

        # Simulate multi-stage candidate scoring
        ranked_items = []
        for idx, item in enumerate(MOCK_CATALOG):
            # Dynamic utility score formula
            p_ctr = round(min(item["base_p_ctr"] * (1.1 if "headphone" in query.lower() else 0.9), 0.95), 4)
            p_cvr = round(min(item["base_p_cvr"] * 1.05, 0.5), 4)
            p_long = item["base_p_long_click"]
            
            utility_score = round(0.5 * p_ctr + 0.4 * p_cvr * math.pow(item["price"], 0.2) + 0.1 * p_long, 4)
            
            ranked_items.append({
                "rank": idx + 1,
                "item_id": item["item_id"],
                "title": item["title"],
                "category_id": item["category_id"],
                "price": item["price"],
                "relevance_score": utility_score,
                "predictions": {
                    "p_ctr": p_ctr,
                    "p_cvr": p_cvr,
                    "p_long_click": p_long
                },
                "is_sponsored": item["is_sponsored"]
            })

        # Sort by relevance score
        ranked_items = sorted(ranked_items, key=lambda x: x["relevance_score"], reverse=True)
        for i, item in enumerate(ranked_items):
            item["rank"] = i + 1

        response_payload = {
            "request_id": req_id,
            "query": query,
            "total_retrieved": 1000,
            "total_returned": len(ranked_items[:top_k]),
            "latency_breakdown_ms": {
                "l1_retrieval": 5.8,
                "feature_hydration": 2.9,
                "l2_pre_rank": 6.4,
                "l3_deep_rank": 14.2,
                "l4_diversity": 1.8,
                "total_end_to_end": 31.1
            },
            "served_model_version": "l3_transformer_v2.4",
            "ranked_items": ranked_items[:top_k]
        }

        self._set_headers(200)
        self.wfile.write(json.dumps(response_payload, indent=2).encode('utf-8'))

    def _handle_ranking_feedback(self, payload: dict):
        evt_id = f"evt_{int(time.time()*1000)}"
        FEEDBACK_LOGS.append({
            "event_id": evt_id,
            "payload": payload,
            "timestamp": time.time()
        })
        self._set_headers(202)
        self.wfile.write(json.dumps({
            "status": "ACCEPTED",
            "event_id": evt_id
        }).encode('utf-8'))


def run_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, MockSearchRankingHandler)
    print(f"🚀 Mock Search Ranking API Server running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Mock Server.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
