#!/usr/bin/env python3
"""
Circuit Breaker Control Plane — Local Mock API Server
Matches the OpenAPI 3.0 spec: circuit_breaker_api_spec.yaml
Embeds a real in-process CircuitBreaker FSM to demonstrate live state transitions.
Run: python3 level_8_distributed_systems/circuit_breaker/mock_server.py
Port: 8094
"""

import json
import time
import threading
import collections
import statistics
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Any

PORT = 8094


# ─────────────────────────────────────────────
# 1. Circuit Breaker Core Types
# ─────────────────────────────────────────────

class CircuitState(Enum):
    CLOSED    = "CLOSED"
    OPEN      = "OPEN"
    HALF_OPEN = "HALF_OPEN"


@dataclass
class CircuitConfig:
    failure_rate_threshold: float = 50.0
    slow_call_rate_threshold: float = 100.0
    slow_call_duration_ms: int = 2000
    window_type: str = "COUNT"
    window_size: int = 100
    minimum_number_of_calls: int = 10
    wait_duration_open_ms: int = 60000
    permitted_calls_half_open: int = 5
    max_concurrent_calls: int = 25
    fallback_strategy: str = "CACHE"
    is_enabled: bool = True


@dataclass
class CallRecord:
    success: bool
    duration_ms: float
    timestamp: float = field(default_factory=time.time)


@dataclass
class StateTransition:
    from_state: str
    to_state: str
    reason: str
    triggered_by: str = "automatic"
    operator: Optional[str] = None
    at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─────────────────────────────────────────────
# 2. Sliding Window Counter
# ─────────────────────────────────────────────

class SlidingWindowCounter:
    def __init__(self, size: int = 100, slow_ms: float = 2000):
        self._buf: collections.deque[CallRecord] = collections.deque(maxlen=size)
        self._slow_ms = slow_ms
        self._lock = threading.Lock()

    def record(self, rec: CallRecord):
        with self._lock:
            self._buf.append(rec)

    def failure_rate(self) -> float:
        with self._lock:
            if not self._buf:
                return 0.0
            fails = sum(1 for r in self._buf
                        if not r.success or r.duration_ms > self._slow_ms)
            return (fails / len(self._buf)) * 100.0

    def slow_call_rate(self) -> float:
        with self._lock:
            if not self._buf:
                return 0.0
            slow = sum(1 for r in self._buf if r.duration_ms > self._slow_ms)
            return (slow / len(self._buf)) * 100.0

    def call_count(self) -> int:
        return len(self._buf)

    def stats(self) -> dict:
        with self._lock:
            if not self._buf:
                return {"total": 0, "failed": 0, "slow": 0, "avg_ms": 0.0}
            total = len(self._buf)
            failed = sum(1 for r in self._buf if not r.success)
            slow = sum(1 for r in self._buf if r.duration_ms > self._slow_ms)
            avg_ms = statistics.mean(r.duration_ms for r in self._buf)
            return {"total": total, "failed": failed, "slow": slow, "avg_ms": round(avg_ms, 1)}

    def reset(self):
        with self._lock:
            self._buf.clear()


# ─────────────────────────────────────────────
# 3. Circuit Breaker FSM (Live)
# ─────────────────────────────────────────────

class CircuitBreaker:
    def __init__(self, service_id: str, dep_id: str, config: CircuitConfig = None):
        self.service_id = service_id
        self.dep_id = dep_id
        self.config = config or CircuitConfig()
        self._state = CircuitState.CLOSED
        self._lock = threading.RLock()
        self._window = SlidingWindowCounter(
            size=self.config.window_size,
            slow_ms=self.config.slow_call_duration_ms
        )
        self._opened_at: Optional[float] = None
        self._probe_count = 0
        self._probe_failures = 0
        self._rejected_calls = 0
        self._transitions: List[StateTransition] = []
        self._created_at = datetime.now(timezone.utc).isoformat()

    @property
    def state(self) -> CircuitState:
        with self._lock:
            self._check_timeout()
            return self._state

    def _check_timeout(self):
        if (self._state == CircuitState.OPEN and self._opened_at and
                (time.time() - self._opened_at) * 1000 >= self.config.wait_duration_open_ms):
            self._do_transition(CircuitState.HALF_OPEN, "wait_duration_elapsed")

    def _do_transition(self, new: CircuitState, reason: str,
                       triggered_by: str = "automatic", operator: str = None):
        old = self._state
        if old == new:
            return
        self._state = new
        if new == CircuitState.OPEN:
            self._opened_at = time.time()
            self._probe_count = 0
            self._probe_failures = 0
        elif new == CircuitState.CLOSED:
            self._opened_at = None
            self._window.reset()
        elif new == CircuitState.HALF_OPEN:
            self._probe_count = 0
            self._probe_failures = 0

        t = StateTransition(old.value, new.value, reason, triggered_by, operator)
        self._transitions.append(t)
        print(f"[CB] {self.service_id}→{self.dep_id}: "
              f"{old.value} → {new.value} | {reason}")

    def record_call(self, success: bool, duration_ms: float):
        """Record a call outcome and evaluate state transitions."""
        with self._lock:
            self._check_timeout()
            rec = CallRecord(success=success, duration_ms=duration_ms)

            if self._state == CircuitState.CLOSED:
                self._window.record(rec)
                cnt = self._window.call_count()
                if cnt >= self.config.minimum_number_of_calls:
                    rate = self._window.failure_rate()
                    slow_rate = self._window.slow_call_rate()
                    if rate >= self.config.failure_rate_threshold:
                        self._do_transition(
                            CircuitState.OPEN,
                            f"failure_rate={rate:.1f}% >= threshold={self.config.failure_rate_threshold}%"
                        )
                    elif slow_rate >= self.config.slow_call_rate_threshold:
                        self._do_transition(
                            CircuitState.OPEN,
                            f"slow_call_rate={slow_rate:.1f}% >= threshold"
                        )

            elif self._state == CircuitState.HALF_OPEN:
                self._probe_count += 1
                if not success or duration_ms > self.config.slow_call_duration_ms:
                    self._probe_failures += 1
                if self._probe_count >= self.config.permitted_calls_half_open:
                    pfr = (self._probe_failures / self._probe_count) * 100.0
                    if pfr < self.config.failure_rate_threshold:
                        self._do_transition(
                            CircuitState.CLOSED,
                            f"probe_failure_rate={pfr:.1f}% (service recovered)"
                        )
                    else:
                        self._do_transition(
                            CircuitState.OPEN,
                            f"probe_failure_rate={pfr:.1f}% (still broken)"
                        )

    def reject(self):
        with self._lock:
            self._rejected_calls += 1

    def manual_trip(self, operator: str = None, reason: str = None):
        with self._lock:
            self._do_transition(
                CircuitState.OPEN,
                reason or "manual_trip",
                triggered_by="manual",
                operator=operator
            )

    def manual_reset(self, operator: str = None, reason: str = None):
        with self._lock:
            self._do_transition(
                CircuitState.CLOSED,
                reason or "manual_reset",
                triggered_by="manual",
                operator=operator
            )

    def to_detail(self) -> dict:
        with self._lock:
            self._check_timeout()
            stats = self._window.stats()
            remaining_ms = None
            if self._state == CircuitState.OPEN and self._opened_at:
                elapsed = (time.time() - self._opened_at) * 1000
                remaining_ms = max(0, int(self.config.wait_duration_open_ms - elapsed))

            return {
                "service_id": self.service_id,
                "dependency_id": self.dep_id,
                "state": self._state.value,
                "failure_rate": round(self._window.failure_rate(), 2),
                "slow_call_rate": round(self._window.slow_call_rate(), 2),
                "total_calls": stats["total"],
                "failed_calls": stats["failed"],
                "rejected_calls": self._rejected_calls,
                "last_transition": self._transitions[-1].at if self._transitions else self._created_at,
                "wait_duration_remaining_ms": remaining_ms,
                "config": {
                    "failure_rate_threshold": self.config.failure_rate_threshold,
                    "slow_call_rate_threshold": self.config.slow_call_rate_threshold,
                    "slow_call_duration_ms": self.config.slow_call_duration_ms,
                    "window_type": self.config.window_type,
                    "window_size": self.config.window_size,
                    "minimum_number_of_calls": self.config.minimum_number_of_calls,
                    "wait_duration_open_ms": self.config.wait_duration_open_ms,
                    "permitted_calls_half_open": self.config.permitted_calls_half_open,
                    "max_concurrent_calls": self.config.max_concurrent_calls,
                    "fallback_strategy": self.config.fallback_strategy,
                    "is_enabled": self.config.is_enabled
                }
            }

    def to_summary(self) -> dict:
        d = self.to_detail()
        return {k: d[k] for k in
                ["service_id", "dependency_id", "state",
                 "failure_rate", "rejected_calls", "last_transition"]}

    def recent_transitions(self, limit: int = 10) -> list:
        with self._lock:
            return [
                {"from": t.from_state, "to": t.to_state,
                 "at": t.at, "reason": t.reason}
                for t in self._transitions[-limit:]
            ]


# ─────────────────────────────────────────────
# 4. Circuit Breaker Registry (with seed data)
# ─────────────────────────────────────────────

class Registry:
    def __init__(self):
        self._circuits: Dict[str, CircuitBreaker] = {}
        self._lock = threading.Lock()
        self._seed()

    def _seed(self):
        """Pre-populate with realistic demo circuits."""
        pairs = [
            ("order-service",   "payment-service",   CircuitConfig(failure_rate_threshold=50.0)),
            ("order-service",   "inventory-service", CircuitConfig(failure_rate_threshold=60.0)),
            ("user-service",    "auth-service",      CircuitConfig(failure_rate_threshold=40.0)),
            ("user-service",    "notification-svc",  CircuitConfig(failure_rate_threshold=70.0)),
            ("gateway-service", "order-service",     CircuitConfig(failure_rate_threshold=50.0)),
        ]
        for svc, dep, cfg in pairs:
            key = f"{svc}:{dep}"
            cb = CircuitBreaker(svc, dep, cfg)
            self._circuits[key] = cb

        # Simulate some call history for order-service → payment-service
        pay_cb = self._circuits["order-service:payment-service"]
        for _ in range(6):
            pay_cb.record_call(success=True, duration_ms=120)
        for _ in range(7):
            pay_cb.record_call(success=False, duration_ms=3000)
        # Should now be OPEN (7/13 = 53.8% failures)

        # Simulate auth-service recovering (closed with history)
        auth_cb = self._circuits["user-service:auth-service"]
        for _ in range(15):
            auth_cb.record_call(success=True, duration_ms=80)

    def get(self, svc: str, dep: str) -> Optional[CircuitBreaker]:
        return self._circuits.get(f"{svc}:{dep}")

    def get_or_create(self, svc: str, dep: str) -> CircuitBreaker:
        key = f"{svc}:{dep}"
        with self._lock:
            if key not in self._circuits:
                self._circuits[key] = CircuitBreaker(svc, dep)
            return self._circuits[key]

    def all(self) -> List[CircuitBreaker]:
        return list(self._circuits.values())


registry = Registry()


# ─────────────────────────────────────────────
# 5. HTTP Handler
# ─────────────────────────────────────────────

class CBHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        ts = datetime.now().strftime("%H:%M:%S")
        print(f"[{ts}] {fmt % args}")

    def _json(self, status: int, data):
        body = json.dumps(data, indent=2).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", 0))
        if n == 0:
            return {}
        try:
            return json.loads(self.rfile.read(n))
        except Exception:
            return None

    def _parse(self):
        p = urlparse(self.path)
        return p.path.rstrip("/"), parse_qs(p.query)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization")
        self.end_headers()

    def do_GET(self):
        path, params = self._parse()
        parts = [p for p in path.split("/") if p]

        # GET /v1/health/live
        if path in ("/v1/health/live", "/health/live"):
            self._json(200, {"status": "ok"})

        # GET /v1/health/ready
        elif path in ("/v1/health/ready", "/health/ready"):
            self._json(200, {
                "status": "ready",
                "redis_connected": True,
                "aurora_connected": True,
                "circuits_loaded": len(registry.all())
            })

        # GET /v1/circuits/summary
        elif path in ("/v1/circuits/summary", "/circuits/summary"):
            all_cb = registry.all()
            open_n = sum(1 for c in all_cb if c.state == CircuitState.OPEN)
            ho_n = sum(1 for c in all_cb if c.state == CircuitState.HALF_OPEN)
            closed_n = len(all_cb) - open_n - ho_n
            rejected = sum(c._rejected_calls for c in all_cb)
            self._json(200, {
                "total_circuits": len(all_cb),
                "open_circuits": open_n,
                "half_open_circuits": ho_n,
                "closed_circuits": closed_n,
                "total_rejected_calls_last_minute": rejected,
                "health_score_pct": round((closed_n / max(len(all_cb), 1)) * 100, 2)
            })

        # GET /v1/circuits
        elif path in ("/v1/circuits", "/circuits"):
            svc_filter = params.get("service_id", [None])[0]
            dep_filter = params.get("dependency_id", [None])[0]
            state_filter = params.get("state", [None])[0]
            page = int(params.get("page", ["1"])[0])
            page_size = int(params.get("page_size", ["50"])[0])

            circuits = registry.all()
            if svc_filter:
                circuits = [c for c in circuits if c.service_id == svc_filter]
            if dep_filter:
                circuits = [c for c in circuits if c.dep_id == dep_filter]
            if state_filter:
                circuits = [c for c in circuits if c.state.value == state_filter.upper()]

            total = len(circuits)
            start = (page - 1) * page_size
            sliced = circuits[start:start + page_size]

            self._json(200, {
                "circuits": [c.to_summary() for c in sliced],
                "total": total,
                "page": page,
                "page_size": page_size
            })

        # GET /v1/circuits/{svc}/{dep}
        elif len(parts) == 4 and parts[0] == "v1" and parts[1] == "circuits":
            svc, dep = parts[2], parts[3]
            cb = registry.get(svc, dep)
            if not cb:
                self._json(404, {"error": "NOT_FOUND",
                                  "message": f"No circuit for {svc} → {dep}"})
                return
            self._json(200, cb.to_detail())

        # GET /v1/circuits/{svc}/{dep}/config
        elif len(parts) == 5 and parts[4] == "config":
            svc, dep = parts[2], parts[3]
            cb = registry.get(svc, dep)
            if not cb:
                self._json(404, {"error": "NOT_FOUND", "message": "Circuit not found"})
                return
            self._json(200, cb.to_detail()["config"])

        # GET /v1/circuits/{svc}/{dep}/metrics
        elif len(parts) == 5 and parts[4] == "metrics":
            svc, dep = parts[2], parts[3]
            window = params.get("window", ["5m"])[0]
            cb = registry.get(svc, dep)
            if not cb:
                self._json(404, {"error": "NOT_FOUND", "message": "Circuit not found"})
                return
            detail = cb.to_detail()
            stats = cb._window.stats()
            self._json(200, {
                "service_id": svc,
                "dependency_id": dep,
                "window": window,
                "metrics": {
                    "total_calls": stats["total"],
                    "successful_calls": stats["total"] - stats["failed"],
                    "failed_calls": stats["failed"],
                    "rejected_calls": cb._rejected_calls,
                    "slow_calls": stats["slow"],
                    "failure_rate_pct": detail["failure_rate"],
                    "slow_call_rate_pct": detail["slow_call_rate"],
                    "avg_duration_ms": stats["avg_ms"],
                    "p99_duration_ms": stats["avg_ms"] * 2.1,  # mock p99
                    "state_transitions": cb.recent_transitions(10)
                }
            })

        else:
            self._json(404, {"error": "NOT_FOUND", "message": f"Path {path} not found"})

    def do_POST(self):
        path, _ = self._parse()
        parts = [p for p in path.split("/") if p]
        body = self._body()
        if body is None:
            self._json(400, {"error": "INVALID_JSON"})
            return

        # POST /v1/circuits/{svc}/{dep}/trip
        if len(parts) == 5 and parts[4] == "trip":
            svc, dep = parts[2], parts[3]
            cb = registry.get_or_create(svc, dep)
            prev = cb.state.value
            cb.manual_trip(
                operator=body.get("operator"),
                reason=body.get("reason", "manual_trip")
            )
            self._json(200, {
                "circuit_id": f"{svc}:{dep}",
                "previous_state": prev,
                "new_state": cb.state.value,
                "triggered_by": "manual",
                "operator": body.get("operator"),
                "reason": body.get("reason"),
                "transitioned_at": datetime.now(timezone.utc).isoformat()
            })

        # POST /v1/circuits/{svc}/{dep}/reset
        elif len(parts) == 5 and parts[4] == "reset":
            svc, dep = parts[2], parts[3]
            cb = registry.get_or_create(svc, dep)
            prev = cb.state.value
            cb.manual_reset(
                operator=body.get("operator"),
                reason=body.get("reason", "manual_reset")
            )
            self._json(200, {
                "circuit_id": f"{svc}:{dep}",
                "previous_state": prev,
                "new_state": cb.state.value,
                "triggered_by": "manual",
                "operator": body.get("operator"),
                "transitioned_at": datetime.now(timezone.utc).isoformat()
            })

        # POST /v1/circuits/{svc}/{dep}/simulate
        # (bonus endpoint: inject call outcomes for demo)
        elif len(parts) == 5 and parts[4] == "simulate":
            svc, dep = parts[2], parts[3]
            cb = registry.get_or_create(svc, dep)
            success = body.get("success", True)
            duration_ms = body.get("duration_ms", 150)
            count = body.get("count", 1)
            for _ in range(count):
                cb.record_call(success=success, duration_ms=duration_ms)
            self._json(200, cb.to_detail())

        else:
            self._json(404, {"error": "NOT_FOUND", "message": f"Path {path} not found"})

    def do_PUT(self):
        path, _ = self._parse()
        parts = [p for p in path.split("/") if p]
        body = self._body()
        if body is None:
            self._json(400, {"error": "INVALID_JSON"})
            return

        # PUT /v1/circuits/{svc}/{dep}/config
        if len(parts) == 5 and parts[4] == "config":
            svc, dep = parts[2], parts[3]
            cb = registry.get_or_create(svc, dep)
            cfg = cb.config
            # Apply partial updates
            for k, v in body.items():
                if hasattr(cfg, k):
                    setattr(cfg, k, v)
            self._json(200, {
                "circuit_id": f"{svc}:{dep}",
                "config": cb.to_detail()["config"],
                "propagation_ms": 145
            })

        else:
            self._json(404, {"error": "NOT_FOUND", "message": f"Path {path} not found"})


# ─────────────────────────────────────────────
# 6. Server Boot
# ─────────────────────────────────────────────

def main():
    server = HTTPServer(("0.0.0.0", PORT), CBHandler)
    print("=" * 65)
    print("  ⚡ Circuit Breaker — Mock Control Plane Server")
    print("=" * 65)
    print(f"  Port    : http://localhost:{PORT}")
    print(f"  Spec    : circuit_breaker_api_spec.yaml")
    print()
    print("  Pre-loaded circuits:")
    for cb in registry.all():
        print(f"    {cb.service_id:20} → {cb.dep_id:20} | {cb.state.value}")
    print()
    print("  Endpoints:")
    print(f"    GET    http://localhost:{PORT}/v1/circuits")
    print(f"    GET    http://localhost:{PORT}/v1/circuits/summary")
    print(f"    GET    http://localhost:{PORT}/v1/circuits/order-service/payment-service")
    print(f"    GET    http://localhost:{PORT}/v1/circuits/order-service/payment-service/metrics")
    print(f"    POST   http://localhost:{PORT}/v1/circuits/order-service/payment-service/reset")
    print(f"    POST   http://localhost:{PORT}/v1/circuits/order-service/payment-service/trip")
    print(f"    PUT    http://localhost:{PORT}/v1/circuits/order-service/payment-service/config")
    print(f"    POST   http://localhost:{PORT}/v1/circuits/order-service/payment-service/simulate")
    print(f"    GET    http://localhost:{PORT}/v1/health/ready")
    print()
    print("  Quick test:")
    print(f'    curl -s http://localhost:{PORT}/v1/circuits | python3 -m json.tool')
    print(f'    curl -s http://localhost:{PORT}/v1/circuits/summary | python3 -m json.tool')
    print(f'    # Simulate 10 failures to trip a circuit:')
    print(f'    curl -s -X POST http://localhost:{PORT}/v1/circuits/user-service/auth-service/simulate \\')
    print(f'         -H "Content-Type: application/json" \\')
    print(f'         -d \'{{"success": false, "duration_ms": 3000, "count": 10}}\' | python3 -m json.tool')
    print()
    print("  Press Ctrl+C to stop.")
    print("=" * 65)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server] Shutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
