#!/usr/bin/env python3
"""
Standalone Mock API Server for Live Streaming Platform Blueprint
Runs on HTTP Port 8096.
Provides mock REST responses and HLS playlists matching live_streaming_api_spec.yaml.
"""

import json
import time
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 8096

# In-memory mock database
MOCK_CHAT_MESSAGES = [
    {
        "message_id": "msg_001",
        "stream_id": "str_8819201",
        "sender_username": "EsportsFan99",
        "text": "Hyped for this match! 🔥",
        "timestamp_ms": int(time.time() * 1000) - 15000
    },
    {
        "message_id": "msg_002",
        "stream_id": "str_8819201",
        "sender_username": "GamerGirl_x",
        "text": "Let's gooooo! POG",
        "timestamp_ms": int(time.time() * 1000) - 8000
    }
]


class LiveStreamingMockHandler(BaseHTTPRequestHandler):

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

        if path == "/api/v1/health":
            self._set_headers(200)
            response = {"status": "HEALTHY", "uptime_seconds": 14200, "active_streams": 128}
            self.wfile.write(json.dumps(response).encode("utf-8"))

        elif path.endswith("/manifest.m3u8"):
            stream_id = path.split("/")[4] if len(path.split("/")) > 4 else "str_8819201"
            self._set_headers(200, content_type="application/x-mpegURL")
            manifest_content = f"""#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS
# Stream: {stream_id}

#EXT-X-STREAM-INF:BANDWIDTH=6160000,RESOLUTION=1920x1080,FRAME-RATE=60.000,CODECS="avc1.64002a,mp4a.40.2"
1080p60/index.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=3660000,RESOLUTION=1280x720,FRAME-RATE=60.000,CODECS="avc1.4d401f,mp4a.40.2"
720p60/index.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1660000,RESOLUTION=854x480,FRAME-RATE=30.000,CODECS="avc1.4d401f,mp4a.40.2"
480p30/index.m3u8
"""
            self.wfile.write(manifest_content.encode("utf-8"))

        elif "/chat" in path:
            parts = path.split("/")
            stream_id = parts[4] if len(parts) > 4 else "str_8819201"
            self._set_headers(200)
            response = {
                "stream_id": stream_id,
                "messages": MOCK_CHAT_MESSAGES
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))

        elif "/health" in path and len(path.split("/")) > 4:
            stream_id = path.split("/")[4]
            self._set_headers(200)
            response = {
                "stream_id": stream_id,
                "status": "LIVE",
                "ingest_fps": 59.94,
                "ingest_bitrate_kbps": 8192,
                "dropped_frames": 0,
                "concurrent_viewers": 18420,
                "cpu_usage_percent": 28.5
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint Not Found"}).encode("utf-8"))

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            body = {}

        if path == "/api/v1/streams/start":
            stream_key = body.get("stream_key", "")
            if not stream_key:
                self._set_headers(401)
                self.wfile.write(json.dumps({"code": "UNAUTHORIZED", "message": "Missing stream_key"}).encode("utf-8"))
                return

            new_stream_id = f"str_{uuid.uuid4().hex[:8]}"
            self._set_headers(200)
            response = {
                "status": "SUCCESS",
                "stream_id": new_stream_id,
                "assigned_ingest_endpoint": "rtmp://ingest-us-east.livestream.com/live",
                "session_token": f"sess_tok_{uuid.uuid4().hex[:12]}",
                "gop_size_seconds": 2.0,
                "supported_renditions": ["1080p60", "720p60", "480p30", "360p30"]
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))

        elif "/chat" in path:
            parts = path.split("/")
            stream_id = parts[4] if len(parts) > 4 else "str_8819201"
            sender = body.get("sender_username", "Anonymous")
            text = body.get("text", "")

            msg = {
                "message_id": f"msg_{uuid.uuid4().hex[:6]}",
                "stream_id": stream_id,
                "sender_username": sender,
                "text": text,
                "timestamp_ms": int(time.time() * 1000)
            }
            MOCK_CHAT_MESSAGES.append(msg)

            self._set_headers(201)
            self.wfile.write(json.dumps(msg).encode("utf-8"))

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint Not Found"}).encode("utf-8"))


def run_server():
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, LiveStreamingMockHandler)
    print(f"🚀 Live Streaming Mock API Server running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
