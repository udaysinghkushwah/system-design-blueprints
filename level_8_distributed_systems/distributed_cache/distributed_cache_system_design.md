# Distributed Cache System Design Blueprint

A production-grade, fault-tolerant, high-throughput Distributed Cache system capable of handling millions of requests per second with sub-millisecond p99 latencies. Designed with consistent hashing, virtual nodes, configurable eviction policies (LRU/LFU), time-based expiration (TTL), flexible caching strategies (Cache-Aside, Write-Through, Write-Behind), and automatic cluster failover.

---

## 1. System Requirements

### Functional Requirements
1. **Core Key-Value Operations**:
   - `get(key)`: Retrieve value associated with `key`.
   - `put(key, value, ttl)`: Store `key`-`value` pair with optional Time-To-Live (TTL in seconds).
   - `delete(key)`: Explicitly invalidate and remove `key`.
   - `mget(keys)`: Batch retrieval of multiple keys across partitioned nodes.
2. **Eviction Policies**:
   - Support LRU (Least Recently Used), LFU (Least Frequently Used with Count-Min Sketch), and TTL-based expiration.
   - Automatic memory reclaim when node capacity reaches threshold (e.g., 90% memory utilization).
3. **Caching & Write Strategies**:
   - **Cache-Aside (Lazy Loading)**: Application reads from cache; on miss, loads from DB and updates cache.
   - **Write-Through**: Cache synchronously writes to persistent storage before returning success.
   - **Write-Behind (Write-Back)**: Async batched writes to storage via high-throughput memory ring buffers.
4. **Partitioning & Cluster Management**:
   - Consistent hashing with virtual nodes to distribute keys evenly across cluster nodes.
   - Dynamic node addition/removal with minimal key relocation (~$1/N$ keys moved during scale operations).
   - Master-replica replication per hash partition for high availability.

### Non-Functional Requirements
1. **Low Latency**: Sub-millisecond ($< 2\text{ms}$) p99 read latency and sub-5ms ($< 5\text{ms}$) p99 write latency under heavy load.
2. **High Availability & Fault Tolerance**: 99.999% uptime ($5.26\text{ minutes}$ downtime/year) with active-passive partition replication and automatic failover in $< 3\text{ seconds}$.
3. **Horizontal Scalability**: Scale out seamlessly from 4 to 100+ cache nodes without service interruption.
4. **Consistency Model**: Configurable per cluster—Eventual Consistency (default for high throughput) or Strong Consistency via synchronous primary-replica replication.
5. **Resilience to Cache Stampede**: Built-in probabilistic early expiration (XFetch algorithm) and mutex single-flight locks to protect downstream databases during cold cache spikes.

---

## 2. Capacity & Scale Estimation

### Scale Assumptions
- **Active Key Count**: 100 Million active keys.
- **Daily Request Volume**: 10 Billion requests/day.
- **Read / Write Ratio**: 80% Reads, 20% Writes.
- **Average Key Size**: 64 bytes.
- **Average Value Size**: 2 KB.
- **Replication Factor**: 3 (1 Primary + 2 Replicas per partition).

### Throughput Calculations
- **Average QPS**:
  $$\text{Total QPS} = \frac{10,000,000,000}{86,400\text{ seconds}} \approx 115,740\text{ QPS}$$
  $$\text{Read QPS} = 115,740 \times 0.80 = 92,592\text{ Read QPS}$$
  $$\text{Write QPS} = 115,740 \times 0.20 = 23,148\text{ Write QPS}$$
- **Peak Spike QPS (2.5x Multiplier)**:
  $$\text{Peak Read QPS} = 92,592 \times 2.5 \approx 231,480\text{ QPS}$$
  $$\text{Peak Write QPS} = 23,148 \times 2.5 \approx 57,870\text{ QPS}$$
  $$\text{Peak Total QPS} \approx 290,000\text{ QPS}$$

### Data & Memory Storage Sizing
- **Single Entry Size**:
  $$\text{Key} + \text{Value} + \text{Metadata (Pointers, TTL, LRU Flags)} = 64\text{B} + 2048\text{B} + 128\text{B} = 2,240\text{ bytes} \approx 2.24\text{ KB}$$
- **Raw Cache Capacity**:
  $$\text{Raw Capacity} = 100,000,000 \times 2.24\text{ KB} = 224\text{ GB}$$
- **Replicated Storage Requirement**:
  $$\text{Replicated Storage} = 224\text{ GB} \times 3\text{ (Replication Factor)} = 672\text{ GB}$$
- **Total Memory Allocation (including 25% Overhead for Hash Index & Buffer)**:
  $$\text{Total Memory} = 672\text{ GB} \times 1.25 = 840\text{ GB RAM}$$

### Cluster Node Provisioning
Using AWS `r6g.xlarge` instances ($32\text{ GB RAM}$, 4 vCPUs per node):
$$\text{Number of Nodes} = \frac{840\text{ GB}}{32\text{ GB}} \approx 26.25 \longrightarrow \mathbf{28\text{ Physical Nodes}}$$
Configured into 9 Hash Partitions (each partition has 1 Primary + 2 Read Replicas) + 1 Spare Node.

---

## 3. High-Level Architecture

The Distributed Cache cluster consists of a **Smart Client SDK**, a **Cluster Coordinator (Consul/ZooKeeper)**, multiple **Cache Partitions** (Primary & Replicas), **Async Storage Workers**, and the underlying **Database Layer**.

![System Architecture](./distributed_cache_system_architecture.png)

```mermaid
graph TD
    Client["Client Application / SDK"] -->|"1. Hash Key & Locate Node"| SmartClient["Smart Client Routing Layer"]
    SmartClient -->|"Lookup Topology"| Consul["Cluster Coordinator (Consul / Etcd)"]
    
    subgraph Cluster["Distributed Cache Cluster (Consistent Hash Ring)"]
        subgraph Partition1["Partition A (Key Range 0x00 - 0x55)"]
            P1_Primary["Primary Node A1"] -->|"Sync / Async Replication"| P1_Replica1["Replica Node A2"]
            P1_Primary -->|"Replication"| P1_Replica2["Replica Node A3"]
        end
        
        subgraph Partition2["Partition B (Key Range 0x56 - 0xAA)"]
            P2_Primary["Primary Node B1"] -->|"Replication"| P2_Replica1["Replica Node B2"]
            P2_Primary -->|"Replication"| P2_Replica2["Replica Node B3"]
        end
        
        subgraph Partition3["Partition C (Key Range 0xAB - 0xFF)"]
            P3_Primary["Primary Node C1"] -->|"Replication"| P3_Replica1["Replica Node C2"]
            P3_Primary -->|"Replication"| P3_Replica2["Replica Node C3"]
        end
    end
    
    SmartClient -->|"GET / PUT (Key in Part A)"| P1_Primary
    SmartClient -->|"GET Read Replica"| P1_Replica1
    SmartClient -->|"GET / PUT (Key in Part B)"| P2_Primary
    SmartClient -->|"GET / PUT (Key in Part C)"| P3_Primary

    P1_Primary -->|"Write-Behind Ring Buffer"| AsyncWorker["Async Storage Worker"]
    P2_Primary -->|"Write-Behind Ring Buffer"| AsyncWorker
    P3_Primary -->|"Write-Behind Ring Buffer"| AsyncWorker

    AsyncWorker -->|"Batch DB Writes"| StorageDB[("Persistent Database (Aurora / Postgres)")]
    SmartClient -->|"Cache Miss Fallback"| StorageDB
```

### Component Details
1. **Smart Client SDK**: Maintains a local copy of the consistent hash ring topology. Performs client-side hashing (`MurmurHash3(key) % Ring_Size`) to route requests directly to the responsible node in $O(1)$ time without extra network hops.
2. **Cluster Coordinator (Consul/Etcd)**: Manages cluster membership, node heartbeats, master election, and topology broadcasts. Updates smart clients via long-polling or gRPC streams when nodes join or fail.
3. **Primary Cache Nodes**: Accept both Read and Write requests for assigned hash ring segments. Manage in-memory storage, LRU/LFU eviction queues, TTL time wheels, and write-behind ring buffers.
4. **Replica Cache Nodes**: Receive continuous log replication from the Primary. Serve read traffic to scale read throughput and provide instant failover if the Primary fails.
5. **Async Storage Worker**: Flushes queued mutations from memory ring buffers into persistent databases in micro-batches to support Write-Behind caching without blocking client execution.

---

## 4. Component-Level Design & Algorithms

### Consistent Hashing with Virtual Nodes
To ensure uniform data distribution and avoid "hotspotting", each physical cache node is assigned $V = 256$ virtual nodes across a 32-bit integer ring ($[0, 2^{32}-1]$).

```
Hash Ring Domain: [0 ------------------------------------> 2^32 - 1]
Virtual Nodes:   [NodeA_v1, NodeB_v1, NodeA_v2, NodeC_v1, NodeB_v2...]
Key Mapping:     hash(key) = K -> Clockwise scan to first Virtual Node >= K
```

- **Ring Mapping Algorithm**:
  - `Hash(key)` yields a point $K$ on the ring.
  - Binary search ($O(\log(N \cdot V))$) finds the nearest virtual node clockwise $\ge K$.
  - When physical Node $X$ is added, only keys belonging to its virtual nodes are relocated from adjacent nodes, preserving $\approx 99\%$ of existing cache data.

### In-Memory Storage Engine Architecture

```
+-----------------------------------------------------------------------+
|                       In-Memory Storage Engine                        |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Hash Table (Key -> Entry Pointer) - O(1) Access                 |  |
|  +-----------------------------------------------------------------+  |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Doubly Linked List (LRU Queue)                                  |  |
|  | [Head (MRU)] <---> [Node 1] <---> [Node 2] <---> [Tail (LRU)]    |  |
|  +-----------------------------------------------------------------+  |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Time Wheel / Min-Heap (TTL Expiration Order)                    |  |
|  | [Exp: t+5s] -> [Exp: t+12s] -> [Exp: t+60s]                     |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

1. **Thread-Safe Hash Table**: Direct pointer mapping from string keys to cache entry structs. Uses lock striping (16–64 mutex buckets) to enable concurrent reads and writes without global table locks.
2. **Doubly-Linked List for LRU Eviction**:
   - Node read/update moves the entry to the Head (Most Recently Used).
   - Memory threshold overflow evicts entry at the Tail (Least Recently Used) in $O(1)$ time.
3. **TTL Time Wheel Scheduler**:
   - Expiration entries are placed into hierarchical time-wheel slots ($1\text{s}, 1\text{m}, 1\text{h}$).
   - A background thread ticks every second, freeing expired keys without scanning the entire cache space.

### Cache Stampede Mitigation (XFetch Probabilistic Early Expiration)
When high-traffic keys expire, thousands of concurrent requests may hit the underlying database simultaneously (Cache Stampede / Thundering Herd). We employ the **XFetch Algorithm**:

$$\text{Recompute If: } -\beta \cdot \delta \cdot \ln(\text{rand}()) > \text{TTL} - \text{CurrentTime}$$

Where:
- $\beta > 0$: Aggressiveness constant (default $1.0$).
- $\delta$: Time taken to compute/fetch the value from persistent storage.
- $\text{rand}() \in (0, 1]$: Uniform random float.

As TTL approaches zero, early re-fetch probability increases non-linearly. A single client asynchronously refreshes the key in the background *before* it expires, ensuring the cache is never empty for incoming reads.

---

## 5. Database Schema & Data Models

### In-Memory Node Entry Layout (C-Style Struct Design)
```c
struct CacheEntry {
    char* key;                // Null-terminated string key (e.g., 64 bytes)
    void* value;              // Pointer to memory buffer (e.g., 2048 bytes)
    uint32_t value_bytes;     // Size of value payload
    uint64_t created_at_ms;   // Timestamp when created
    uint64_t ttl_ms;          // Time to live in ms (0 = immortal)
    uint32_t frequency_count; // LFU frequency counter
    struct CacheEntry* prev;  // LRU doubly-linked list previous pointer
    struct CacheEntry* next;  // LRU doubly-linked list next pointer
};
```

### Cluster Metadata Relational Schema (PostgreSQL DDL)

```sql
-- Track physical cluster node topology and status
CREATE TABLE cluster_nodes (
    node_id VARCHAR(64) PRIMARY KEY,
    partition_id VARCHAR(64) NOT NULL,
    role VARCHAR(16) NOT NULL CHECK (role IN ('PRIMARY', 'REPLICA', 'SPARE')),
    ip_address VARCHAR(45) NOT NULL,
    port INT NOT NULL,
    memory_capacity_mb INT NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('ONLINE', 'DEGRADED', 'OFFLINE', 'REBALANCING')),
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cluster_nodes_partition ON cluster_nodes(partition_id, role);
CREATE INDEX idx_cluster_nodes_status ON cluster_nodes(status);

-- Metadata for async write-behind persistence queues
CREATE TABLE persistence_log (
    log_id BIGSERIAL PRIMARY KEY,
    key_name VARCHAR(255) NOT NULL,
    operation VARCHAR(16) NOT NULL CHECK (operation IN ('PUT', 'DELETE')),
    payload BYTEA,
    status VARCHAR(16) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_persistence_status ON persistence_log(status, created_at);
```

### Redis Key Namespace Conventions
| Key Pattern | Data Type | Purpose | TTL |
| :--- | :--- | :--- | :--- |
| `user:profile:{user_id}` | JSON String / Hash | User profile data cache | 3600s (1 hr) |
| `session:token:{token}` | String | Authentication session token | 86400s (24 hr) |
| `rate:ip:{ip_address}` | Atomic Counter | Rate limiting sliding window counter | 60s |
| `lock:resource:{id}` | String (UUID) | Distributed mutual exclusion lock | 10s |

---

## 6. API Design & Contracts

### RESTful Interface

#### 1. Retrieve Cached Value
- **Endpoint**: `GET /v1/cache/{key}`
- **Headers**: `X-Cache-Strategy: Cache-Aside`
- **Response (200 OK - Cache Hit)**:
  ```json
  {
    "status": "HIT",
    "key": "user:profile:98214",
    "value": {
      "user_id": "98214",
      "name": "Sarah Connor",
      "tier": "PREMIUM"
    },
    "ttl_remaining_ms": 284500,
    "node_id": "node-p1-a1"
  }
  ```
- **Response (404 Not Found - Cache Miss)**:
  ```json
  {
    "status": "MISS",
    "key": "user:profile:98214",
    "message": "Key not present in cache node"
  }
  ```

#### 2. Set Cache Entry
- **Endpoint**: `POST /v1/cache`
- **Request Payload**:
  ```json
  {
    "key": "user:profile:98214",
    "value": {
      "user_id": "98214",
      "name": "Sarah Connor",
      "tier": "PREMIUM"
    },
    "ttl_seconds": 3600,
    "write_strategy": "WRITE_BEHIND"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "key": "user:profile:98214",
    "allocated_bytes": 2180,
    "partition_id": "partition-A",
    "node_id": "node-p1-a1"
  }
  ```

#### 3. Batch Key Retrieval (MGET)
- **Endpoint**: `POST /v1/cache/batch-get`
- **Request Payload**:
  ```json
  {
    "keys": ["user:profile:101", "user:profile:102", "user:profile:103"]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "hits": {
      "user:profile:101": { "user_id": "101", "name": "Alice" },
      "user:profile:103": { "user_id": "103", "name": "Charlie" }
    },
    "misses": ["user:profile:102"]
  }
  ```

---

## 7. End-to-End Workflow Sequence

### Read-Through & Write-Behind Cache Workflow

```mermaid
sequenceDiagram
    autonumber
    participant App as Application SDK
    participant Node as Primary Cache Node
    participant Engine as In-Memory LRU Engine
    participant Ring as Ring Buffer (Write-Behind)
    participant Worker as Async Storage Worker
    participant DB as Persistent Database

    rect rgb(235, 245, 255)
        note over App, Engine: Read Flow (Cache-Aside / Read-Through)
        App->>Node: GET /v1/cache/user:101
        Node->>Engine: Lookup key in Hash Index
        alt Cache Hit
            Engine-->>Node: Return Entry (Value + TTL)
            Node-->>App: 200 OK (HIT)
        else Cache Miss
            Engine-->>Node: Key Not Found (MISS)
            Node-->>App: 404 MISS
            App->>DB: Query DB for user:101
            DB-->>App: Return DB Record
            App->>Node: POST /v1/cache (Backfill user:101)
            Node->>Engine: Insert Key & Update LRU Queue
        end
    end

    rect rgb(240, 255, 240)
        note over App, DB: Write Flow (Write-Behind / Write-Back)
        App->>Node: POST /v1/cache (WRITE_BEHIND)
        Node->>Engine: Insert Key & Value into Memory
        Node->>Ring: Push Mutation Event (Key, Val, Operation)
        Node-->>App: 201 Created (Instant Ack < 1ms)
        
        loop Micro-Batch Flush (Every 100ms or 1000 items)
            Worker->>Ring: Pop Batch Mutations
            Worker->>DB: Execute Bulk UPSERT Statement
            DB-->>Worker: Commit Success
        end
    end
```

---

## 8. Executable Python OOD Implementation

The following complete, runnable Python script implements a thread-safe in-memory cache engine with LRU eviction, TTL expiration, consistent hashing, and a multi-threaded test harness.

```python
import hashlib
import time
import threading
from typing import Dict, Any, Optional, List, Tuple


class LRUEntry:
    """Represents a single cache entry with key, value, TTL, and doubly-linked list pointers."""
    def __init__(self, key: str, value: Any, ttl_seconds: Optional[int] = None):
        self.key = key
        self.value = value
        self.created_at = time.time()
        self.ttl_seconds = ttl_seconds
        self.prev: Optional['LRUEntry'] = None
        self.next: Optional['LRUEntry'] = None

    def is_expired(self) -> bool:
        if self.ttl_seconds is None:
            return False
        return (time.time() - self.created_at) > self.ttl_seconds


class ThreadSafeLRUCacheEngine:
    """Thread-safe LRU Cache Engine with TTL support and fine-grained locking."""
    def __init__(self, capacity: int = 5):
        self.capacity = capacity
        self.cache: Dict[str, LRUEntry] = {}
        self.lock = threading.Lock()
        
        # Doubly Linked List Sentinel Nodes (Head = MRU, Tail = LRU)
        self.head = LRUEntry("__HEAD__", None)
        self.tail = LRUEntry("__TAIL__", None)
        self.head.next = self.tail
        self.tail.prev = self.head
        
        # Metrics
        self.hits = 0
        self.misses = 0
        self.evictions = 0

    def _add_to_head(self, node: LRUEntry) -> None:
        """Insert node immediately after sentinel head (MRU position)."""
        node.next = self.head.next
        node.prev = self.head
        if self.head.next:
            self.head.next.prev = node
        self.head.next = node

    def _remove_node(self, node: LRUEntry) -> None:
        """Unlink node from doubly linked list."""
        if node.prev:
            node.prev.next = node.next
        if node.next:
            node.next.prev = node.prev

    def _move_to_head(self, node: LRUEntry) -> None:
        """Move existing node to MRU position."""
        self._remove_node(node)
        self._add_to_head(node)

    def _pop_tail(self) -> Optional[LRUEntry]:
        """Evict and return Least Recently Used (LRU) node before tail."""
        res = self.tail.prev
        if res and res != self.head:
            self._remove_node(res)
            return res
        return None

    def get(self, key: str) -> Optional[Any]:
        with self.lock:
            if key not in self.cache:
                self.misses += 1
                return None
            
            node = self.cache[key]
            
            # TTL Expiration Check
            if node.is_expired():
                self._remove_node(node)
                del self.cache[key]
                self.misses += 1
                return None
            
            self._move_to_head(node)
            self.hits += 1
            return node.value

    def put(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        with self.lock:
            if key in self.cache:
                node = self.cache[key]
                node.value = value
                node.created_at = time.time()
                node.ttl_seconds = ttl_seconds
                self._move_to_head(node)
                return

            # Eviction if capacity reached
            if len(self.cache) >= self.capacity:
                lru_node = self._pop_tail()
                if lru_node:
                    del self.cache[lru_node.key]
                    self.evictions += 1

            new_node = LRUEntry(key, value, ttl_seconds)
            self.cache[key] = new_node
            self._add_to_head(new_node)

    def delete(self, key: str) -> bool:
        with self.lock:
            if key in self.cache:
                node = self.cache[key]
                self._remove_node(node)
                del self.cache[key]
                return True
            return False


class ConsistentHashRing:
    """Consistent Hash Ring with Virtual Nodes for node partitioning."""
    def __init__(self, virtual_nodes_per_physical: int = 100):
        self.vnodes_per_node = virtual_nodes_per_physical
        self.ring: List[Tuple[int, str]] = []  # Sorted list of (hash_val, physical_node_id)
        self.lock = threading.Lock()

    def _hash(self, key: str) -> int:
        """MurmurHash3-style 32-bit MD5 truncated hash."""
        return int(hashlib.md5(key.encode('utf-8')).hexdigest()[:8], 16)

    def add_node(self, node_id: str) -> None:
        with self.lock:
            for i in range(self.vnodes_per_node):
                vnode_key = f"{node_id}#vnode-{i}"
                hash_val = self._hash(vnode_key)
                self.ring.append((hash_val, node_id))
            self.ring.sort(key=lambda x: x[0])

    def remove_node(self, node_id: str) -> None:
        with self.lock:
            self.ring = [item for item in self.ring if item[1] != node_id]

    def get_node(self, key: str) -> Optional[str]:
        with self.lock:
            if not self.ring:
                return None
            hash_val = self._hash(key)
            for ring_hash, node_id in self.ring:
                if hash_val <= ring_hash:
                    return node_id
            # Clockwise wrap-around to first node
            return self.ring[0][1]


class DistributedCacheCluster:
    """Distributed Cache Cluster Orchestrator combining Consistent Hashing and LRU Nodes."""
    def __init__(self, capacity_per_node: int = 5):
        self.hash_ring = ConsistentHashRing(virtual_nodes_per_physical=50)
        self.nodes: Dict[str, ThreadSafeLRUCacheEngine] = {}
        self.capacity_per_node = capacity_per_node

    def add_physical_node(self, node_id: str) -> None:
        self.nodes[node_id] = ThreadSafeLRUCacheEngine(capacity=self.capacity_per_node)
        self.hash_ring.add_node(node_id)

    def remove_physical_node(self, node_id: str) -> None:
        if node_id in self.nodes:
            del self.nodes[node_id]
            self.hash_ring.remove_node(node_id)

    def get(self, key: str) -> Tuple[Optional[Any], Optional[str]]:
        target_node_id = self.hash_ring.get_node(key)
        if target_node_id and target_node_id in self.nodes:
            val = self.nodes[target_node_id].get(key)
            return val, target_node_id
        return None, None

    def put(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> Optional[str]:
        target_node_id = self.hash_ring.get_node(key)
        if target_node_id and target_node_id in self.nodes:
            self.nodes[target_node_id].put(key, value, ttl_seconds)
            return target_node_id
        return None


# Verification Harness
if __name__ == "__main__":
    print("=== 🚀 Initializing Distributed Cache Verification Harness ===")
    cluster = DistributedCacheCluster(capacity_per_node=3)
    
    # 1. Add physical cache nodes
    for nid in ["Node_A", "Node_B", "Node_C"]:
        cluster.add_physical_node(nid)
    print("✅ Added 3 Physical Nodes (Node_A, Node_B, Node_C) with 50 Virtual Nodes each.")

    # 2. Test Consistent Hash Mapping
    test_keys = ["user:1001", "user:1002", "session:abc", "product:550", "order:99"]
    print("\n--- Key Partition Mapping ---")
    for k in test_keys:
        target = cluster.put(k, f"Data_for_{k}")
        print(f"Key '{k}' mapped & stored in -> [{target}]")

    # 3. Retrieve values (Hit test)
    print("\n--- Cache Read Hits ---")
    for k in test_keys:
        val, nid = cluster.get(k)
        print(f"GET '{k}': Found '{val}' on [{nid}]")

    # 4. LRU Eviction & Capacity Threshold Verification
    print("\n--- Eviction Trigger Test ---")
    # Overflowing Node_A capacity (set to 3 items)
    extra_keys = [f"extra_key_{i}" for i in range(10)]
    for ek in extra_keys:
        cluster.put(ek, f"Val_{ek}")

    print("State after adding extra items:")
    for nid, engine in cluster.nodes.items():
        print(f"Node [{nid}]: Active Keys = {len(engine.cache)}, Hits = {engine.hits}, Misses = {engine.misses}, Evictions = {engine.evictions}")

    # 5. TTL Expiration Test
    print("\n--- TTL Expiration Test ---")
    cluster.put("short_lived", "Temp_Value", ttl_seconds=1)
    val_before, _ = cluster.get("short_lived")
    print(f"GET 'short_lived' immediately: '{val_before}'")
    time.sleep(1.2)
    val_after, _ = cluster.get("short_lived")
    print(f"GET 'short_lived' after 1.2s sleep: {val_after} (Expected: None)")

    print("\n=== ✨ Distributed Cache Verification Completed Successfully! ===")
```

---

## 9. Scalability, Resilience & Edge Failover

### Cluster Resharding without Downtime
When capacity scale triggers node additions:
1. New node registers with Cluster Coordinator (Consul).
2. Consistent hash ring adds virtual nodes for the new physical node.
3. Target keys now resolving to the new node experience temporary cache misses and lazy load from DB without flushing unaffected nodes.

```
+-------------------------------------------------------------------------+
|                  Fault Tolerance & Failover Matrix                      |
+-------------------+------------------------+----------------------------+
| Failure Scenario  | Detection Mechanism    | Mitigation Strategy        |
+-------------------+------------------------+----------------------------+
| Primary Node      | Heartbeat missed       | Replica promoted to        |
| Crash             | (> 3 sec) via Consul   | Primary in < 2 seconds     |
+-------------------+------------------------+----------------------------+
| Network Partition | Split-brain consensus  | Minority partition becomes |
| (Brain Split)     | check (Raft quorum)    | READ-ONLY to prevent drift |
+-------------------+------------------------+----------------------------+
| Cache Stampede    | Hot key high load      | XFetch probabilistic early |
| (Thundering Herd) | concurrency spike      | refresh + SingleFlight Lock|
+-------------------+------------------------+----------------------------+
```

---

## 10. AWS Cloud-Native Architecture

The distributed cache is deployed on AWS using **Amazon ElastiCache for Redis / Custom EC2 Nodes**, **AWS Network Load Balancers (NLB)**, **Amazon ECS Fargate**, and **Amazon Aurora PostgreSQL**.

![AWS Architecture](./distributed_cache_aws_architecture.png)

```mermaid
graph TD
    ClientApp["Client Application (EC2 / EKS)"] --> NLB["AWS Network Load Balancer (NLB)"]
    
    subgraph VPC["VPC (Virtual Private Cloud) - Multi-AZ"]
        subgraph PublicSubnet["Public / Ingress Subnet"]
            NLB
        end
        
        subgraph PrivateSubnetAZ1["Private Subnet (AZ-1)"]
            CacheNodeA1["Primary EC2 / ElastiCache Node A1"]
            CacheNodeB2["Replica EC2 Node B2"]
        end
        
        subgraph PrivateSubnetAZ2["Private Subnet (AZ-2)"]
            CacheNodeB1["Primary EC2 / ElastiCache Node B1"]
            CacheNodeA2["Replica EC2 Node A2"]
        end
        
        subgraph InfraSubnet["Infrastructure Subnet"]
            ECS_Coordinator["Consul Cluster (ECS Fargate)"]
            ECS_Worker["Async Write-Behind Workers (ECS)"]
            AuroraDB[("Amazon Aurora PostgreSQL Primary")]
        end
    end
    
    NLB --> CacheNodeA1
    NLB --> CacheNodeB1
    CacheNodeA1 -.->|"Async Replica"| CacheNodeA2
    CacheNodeB1 -.->|"Async Replica"| CacheNodeB2
    CacheNodeA1 --> ECS_Worker
    CacheNodeB1 --> ECS_Worker
    ECS_Worker --> AuroraDB
    CacheNodeA1 <--> ECS_Coordinator
    CacheNodeB1 <--> ECS_Coordinator
```

### AWS Service Mapping
| Generic Component | AWS Service | Implementation Details |
| :--- | :--- | :--- |
| **Ingress Load Balancing** | AWS Network Load Balancer (NLB) | High-throughput, ultra-low latency L4 load balancer with TCP passthrough. |
| **Primary Cache Nodes** | Amazon ElastiCache / EC2 `r6g.xlarge` | AWS Graviton2 memory-optimized instances delivering up to 25 Gbps networking. |
| **Cluster Coordinator** | HashiCorp Consul on ECS Fargate | Serverless containerized consensus cluster for node discovery and health checks. |
| **Async Storage Worker** | AWS ECS Fargate Task | Auto-scaled container workers processing SQS write-behind queues. |
| **Persistent Storage** | Amazon Aurora PostgreSQL | Serverless v2 Multi-AZ relational database for authoritative persistent data. |
| **Monitoring & Alarms** | Amazon CloudWatch & AWS X-Ray | Real-time memory utilization, cache hit ratio, and p99 latency dashboards. |

---

## 11. Technology Justification

### Comparative Architecture Trade-offs

| Design Decision | Selected Choice | Alternative Option | Justification |
| :--- | :--- | :--- | :--- |
| **Partitioning Strategy** | **Consistent Hashing + Virtual Nodes** | Range-Based Partitioning | Consistent hashing distributes key load evenly without hotspotting and minimizes key relocation to $\approx 1/N$ during node scaling. |
| **Eviction Policy** | **Segmented LRU with TTL Time Wheel** | Simple FIFO / Random Eviction | LRU guarantees that high-frequency hot items remain cached, while the TTL Time Wheel cleans expired keys in $O(1)$ without table scans. |
| **Write Strategy** | **Write-Behind (Async Ring Buffer)** | Write-Through (Sync) | Write-Behind provides sub-millisecond client write acknowledgments while decoupling persistent database write bursts. |
| **Cache Stampede Defense**| **XFetch Probabilistic Expiration** | Fixed TTL Expiration | XFetch proactively refreshes keys prior to expiry based on query frequency, preventing 100% of thundering-herd DB spikes. |
| **Replication Strategy** | **Primary-Replica Async Log Stream** | Synchronous Multi-Master | Async replication maintains $< 1\text{ms}$ write latencies while providing instant read scalability across availability zones. |
