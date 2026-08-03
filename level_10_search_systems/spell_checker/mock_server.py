#!/usr/bin/env python3
"""
Spell Checker — Local Mock API Server
Matches the OpenAPI 3.0 spec: spell_checker_api_spec.yaml
Run: python3 level_10_search_systems/spell_checker/mock_server.py
Port: 8093
"""

import json
import time
import re
import hashlib
import math
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

PORT = 8093

# ─────────────────────────────────────────────
# Mock Data & In-Memory State
# ─────────────────────────────────────────────

# Simulated correction suggestions database
MOCK_CORRECTIONS = {
    "recieve":    [{"word": "receive",  "score": 0.97, "edit_distance": 1},
                   {"word": "relieve",  "score": 0.41, "edit_distance": 2},
                   {"word": "reprieve", "score": 0.22, "edit_distance": 3}],
    "packege":    [{"word": "package",  "score": 0.98, "edit_distance": 1},
                   {"word": "passage",  "score": 0.31, "edit_distance": 2}],
    "tommorow":   [{"word": "tomorrow", "score": 0.99, "edit_distance": 1}],
    "tomorro":    [{"word": "tomorrow", "score": 0.99, "edit_distance": 1}],
    "sned":       [{"word": "send",     "score": 0.96, "edit_distance": 1},
                   {"word": "shed",     "score": 0.31, "edit_distance": 2}],
    "occurance":  [{"word": "occurrence", "score": 0.97, "edit_distance": 2}],
    "definately": [{"word": "definitely", "score": 0.98, "edit_distance": 2}],
    "seperate":   [{"word": "separate",  "score": 0.97, "edit_distance": 1}],
    "goverment":  [{"word": "government","score": 0.96, "edit_distance": 1}],
    "accomodation": [{"word": "accommodation", "score": 0.97, "edit_distance": 1}],
    "collegue":   [{"word": "colleague", "score": 0.98, "edit_distance": 1}],
    "nieghbour":  [{"word": "neighbour", "score": 0.97, "edit_distance": 1},
                   {"word": "neighbor",  "score": 0.96, "edit_distance": 2}],
    "beutiful":   [{"word": "beautiful", "score": 0.99, "edit_distance": 1}],
    "begining":   [{"word": "beginning", "score": 0.99, "edit_distance": 1}],
    "calender":   [{"word": "calendar",  "score": 0.98, "edit_distance": 1}],
    "nesesary":   [{"word": "necessary", "score": 0.95, "edit_distance": 2}],
}

KNOWN_WORDS = {
    "receive", "package", "tomorrow", "send", "the", "i", "will", "and",
    "occurrence", "definitely", "separate", "government", "accommodation",
    "colleague", "neighbour", "neighbor", "beautiful", "beginning", "calendar",
    "necessary", "python", "system", "design", "hello", "world", "test",
    "correct", "spelling", "checker", "word", "language"
}

# In-memory user dictionaries: user_id → set of words
user_dictionaries = {}

# Feedback log
feedback_log = []


# ─────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────

def check_word_logic(word: str, language: str = "en-US", context: str = "",
                     user_id: str = None, max_suggestions: int = 5, mode: str = "standard"):
    w = word.lower().strip()
    start_time = time.time()

    # 1. User custom dictionary check
    if user_id and user_id in user_dictionaries:
        if w in user_dictionaries[user_id]:
            return {"word": word, "is_correct": True, "autocorrect": None,
                    "suggestions": [], "language": language,
                    "latency_ms": 1, "algorithm": "user_dict"}

    # 2. Known correct words
    if w in KNOWN_WORDS:
        return {"word": word, "is_correct": True, "autocorrect": None,
                "suggestions": [], "language": language,
                "latency_ms": int((time.time() - start_time) * 1000) or 2,
                "algorithm": "bloom_filter"}

    # 3. Lookup in corrections database
    suggestions = MOCK_CORRECTIONS.get(w, [])
    suggestions = suggestions[:max_suggestions]

    # Simulate algorithm based on mode
    algorithm = "ngram"
    latency_sim = 18
    if mode == "premium":
        algorithm = "bert"
        latency_sim = 42
    elif mode == "fast":
        algorithm = "fast"
        latency_sim = 5

    if not suggestions:
        # Unknown word — no good suggestions
        return {"word": word, "is_correct": False, "autocorrect": None,
                "suggestions": [], "language": language,
                "latency_ms": latency_sim, "algorithm": algorithm}

    return {
        "word": word,
        "is_correct": False,
        "autocorrect": suggestions[0]["word"] if suggestions else None,
        "suggestions": suggestions,
        "language": language,
        "latency_ms": latency_sim,
        "algorithm": algorithm
    }


def check_batch_logic(text: str, language: str = "en-US", user_id: str = None,
                      max_suggestions: int = 3, mode: str = "standard"):
    start_time = time.time()
    tokens = list(re.finditer(r'\b[a-zA-Z]+\b', text))
    errors = []

    for match in tokens:
        word = match.group()
        result = check_word_logic(word, language, text, user_id, max_suggestions, mode)
        if not result["is_correct"]:
            errors.append({
                "word": word,
                "offset": match.start(),
                "length": len(word),
                "autocorrect": result["autocorrect"],
                "suggestions": result["suggestions"]
            })

    elapsed = int((time.time() - start_time) * 1000) + 10
    return {
        "errors": errors,
        "total_words": len(tokens),
        "error_count": len(errors),
        "latency_ms": elapsed
    }


# ─────────────────────────────────────────────
# HTTP Request Handler
# ─────────────────────────────────────────────

class SpellCheckerHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        ts = datetime.now().strftime("%H:%M:%S")
        print(f"[{ts}] {format % args}")

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("X-RateLimit-Limit", "1000")
        self.send_header("X-RateLimit-Remaining", "987")
        self.send_header("X-RateLimit-Reset", str(int(time.time()) + 60))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return None

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        params = parse_qs(parsed.query)

        # ── GET /v1/health/live ──────────────────────
        if path in ("/v1/health/live", "/health/live"):
            self._send_json(200, {"status": "ok"})

        # ── GET /v1/health/ready ─────────────────────
        elif path in ("/v1/health/ready", "/health/ready"):
            self._send_json(200, {
                "status": "ready",
                "bk_tree_loaded": True,
                "bloom_filter_loaded": True,
                "redis_connected": True,
                "languages_loaded": ["en-US", "en-GB", "fr-FR", "es-ES", "de-DE"],
                "dictionary_version": "v1.23",
                "bk_tree_words": 500000,
                "bloom_filter_bits": 4792529
            })

        # ── GET /v1/spell/suggest ────────────────────
        elif path in ("/v1/spell/suggest", "/spell/suggest"):
            word = params.get("word", [""])[0]
            language = params.get("language", ["en-US"])[0]
            max_s = int(params.get("max", ["5"])[0])
            if not word:
                self._send_json(400, {"error": "INVALID_REQUEST",
                                      "message": "word query parameter is required"})
                return
            result = check_word_logic(word, language, max_suggestions=max_s)
            self._send_json(200, result)

        # ── GET /v1/user/dictionary ──────────────────
        elif path in ("/v1/user/dictionary", "/user/dictionary"):
            user_id = params.get("user_id", [""])[0]
            language = params.get("language", ["en-US"])[0]
            if not user_id:
                self._send_json(400, {"error": "MISSING_PARAM",
                                      "message": "user_id query parameter is required"})
                return
            words = list(user_dictionaries.get(user_id, set()))
            self._send_json(200, {
                "user_id": user_id,
                "language": language,
                "words": words,
                "total": len(words)
            })

        else:
            self._send_json(404, {"error": "NOT_FOUND", "message": f"Path {path} not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        body = self._read_json_body()

        if body is None:
            self._send_json(400, {"error": "INVALID_JSON", "message": "Request body is not valid JSON"})
            return

        # ── POST /v1/spell/check ─────────────────────
        if path in ("/v1/spell/check", "/spell/check"):
            word = body.get("word", "")
            if not word:
                self._send_json(400, {"error": "INVALID_REQUEST",
                                      "message": "word field is required"})
                return
            language = body.get("language", "en-US")
            context = body.get("context", "")
            user_id = body.get("user_id")
            opts = body.get("options", {})
            max_s = opts.get("max_suggestions", 5)
            mode = opts.get("mode", "standard")

            result = check_word_logic(word, language, context, user_id, max_s, mode)
            self._send_json(200, result)

        # ── POST /v1/spell/batch ─────────────────────
        elif path in ("/v1/spell/batch", "/spell/batch"):
            text = body.get("text", "")
            if not text:
                self._send_json(400, {"error": "INVALID_REQUEST",
                                      "message": "text field is required"})
                return
            if len(text) > 100_000:
                self._send_json(413, {"error": "PAYLOAD_TOO_LARGE",
                                      "message": "text exceeds 100,000 character limit"})
                return
            language = body.get("language", "en-US")
            user_id = body.get("user_id")
            opts = body.get("options", {})
            max_s = opts.get("max_suggestions", 3)
            mode = opts.get("mode", "standard")

            result = check_batch_logic(text, language, user_id, max_s, mode)
            self._send_json(200, result)

        # ── POST /v1/user/dictionary ─────────────────
        elif path in ("/v1/user/dictionary", "/user/dictionary"):
            user_id = body.get("user_id", "")
            word = body.get("word", "")
            if not user_id or not word:
                self._send_json(400, {"error": "INVALID_REQUEST",
                                      "message": "user_id and word are required"})
                return
            user_dictionaries.setdefault(user_id, set()).add(word.lower())
            self._send_json(201, {"success": True, "word": word, "user_id": user_id})

        # ── POST /v1/spell/feedback ──────────────────
        elif path in ("/v1/spell/feedback", "/spell/feedback"):
            required = ["original_word", "selected_suggestion", "accepted", "session_id"]
            for field in required:
                if field not in body:
                    self._send_json(400, {"error": "MISSING_FIELD",
                                          "message": f"{field} is required"})
                    return
            feedback_log.append({**body, "timestamp": datetime.utcnow().isoformat()})
            print(f"[Feedback] Logged: '{body['original_word']}' → '{body['selected_suggestion']}' "
                  f"accepted={body['accepted']} — total={len(feedback_log)}")
            self._send_json(202, {"accepted": True, "session_id": body["session_id"]})

        else:
            self._send_json(404, {"error": "NOT_FOUND", "message": f"Path {path} not found"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        params = parse_qs(parsed.query)

        # ── DELETE /v1/user/dictionary/{word} ────────
        if path.startswith("/v1/user/dictionary/") or path.startswith("/user/dictionary/"):
            parts = path.split("/")
            word = parts[-1].lower()
            user_id = params.get("user_id", [""])[0]
            if not user_id:
                self._send_json(400, {"error": "MISSING_PARAM",
                                      "message": "user_id query parameter is required"})
                return
            if user_id in user_dictionaries and word in user_dictionaries[user_id]:
                user_dictionaries[user_id].discard(word)
                self._send_json(200, {"success": True, "word": word})
            else:
                self._send_json(404, {"error": "NOT_FOUND",
                                      "message": f"Word '{word}' not in user dictionary"})
        else:
            self._send_json(404, {"error": "NOT_FOUND", "message": f"Path {path} not found"})


# ─────────────────────────────────────────────
# Server Boot
# ─────────────────────────────────────────────

def main():
    server = HTTPServer(("0.0.0.0", PORT), SpellCheckerHandler)
    print("=" * 60)
    print("  🔤 Spell Checker — Mock API Server")
    print("=" * 60)
    print(f"  Port    : http://localhost:{PORT}")
    print(f"  Spec    : spell_checker_api_spec.yaml")
    print()
    print("  Endpoints:")
    print(f"    POST http://localhost:{PORT}/v1/spell/check")
    print(f"    POST http://localhost:{PORT}/v1/spell/batch")
    print(f"    GET  http://localhost:{PORT}/v1/spell/suggest?word=recieve")
    print(f"    POST http://localhost:{PORT}/v1/user/dictionary")
    print(f"    GET  http://localhost:{PORT}/v1/user/dictionary?user_id=usr_001")
    print(f"    DELETE http://localhost:{PORT}/v1/user/dictionary/word?user_id=usr_001")
    print(f"    POST http://localhost:{PORT}/v1/spell/feedback")
    print(f"    GET  http://localhost:{PORT}/v1/health/ready")
    print()
    print("  Quick test:")
    print(f'    curl -s -X POST http://localhost:{PORT}/v1/spell/check \\')
    print(f'         -H "Content-Type: application/json" \\')
    print(f'         -d \'{{"word": "recieve", "context": "I will recieve the package"}}\' | python3 -m json.tool')
    print()
    print("  Press Ctrl+C to stop.")
    print("=" * 60)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server] Shutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
