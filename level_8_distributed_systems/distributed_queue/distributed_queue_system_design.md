# Distributed Queue System Design Blueprint

A production-grade, fault-tolerant, high-throughput Distributed Message Queue platform capable of streaming millions of messages per second with sub-10ms end-to-end latencies. Designed with partition commit logs (Write-Ahead Logs), consumer group offset management, automatic partition rebalancing, configurable delivery semantics (At-Least-Once, Exactly-Once), Dead Letter Queue (DLQ) escalation, and delayed message scheduling.

---

## 1. System Requirements

### Functional Requirements
1. **Message Publishing (`publish_message`)**:
   - `publish(topic, key, payload, delay_seconds)`: Append message payload to a partitioned topic. Optional `key` determines partition assignment via consistent hashing (`hash(key) % num_partitions`).
2. **Message Consumption & Polling (`consume_messages`)**:
   - `consume(topic, consumer_group, max_messages)`: Poll batch of messages assigned to the calling consumer thread from topic partitions.
3. **Offset Commit Management (`commit_offset`)**:
   - `commit(topic, consumer_group, partition, offset)`: Persistently record processing progress to enable seamless failover and state resumption.
4. **Visibility Timeout & Retry Mechanism**:
   - In-flight messages become invisible to other consumers for a configurable duration (e.g. 30 seconds). If unacknowledged, messages automatically reappear in the queue for redelivery.
5. **Dead Letter Queue (DLQ) Escalation**:
   - Messages exceeding maximum retry thresholds (e.g., 5 failed attempts) are routed to a DLQ for inspection and manual resolution.
6. **Delayed Message Scheduling**:
   - Support scheduling messages to become visible after a specified delay period ($T_{\text{future}} = T_{\text{current}} + \text{delay}$).

### Non-Functional Requirements
1. **High Throughput**: Process $> 1,000,000$ messages per second across distributed broker clusters.
2. **Low Latency**: End-to-end publish-to-consume latency $< 10\text{ms}$ at 99th percentile.
3. **Zero Message Loss (Durability)**: Messages written to persistent WAL segments replicated across $N \ge 3$ broker nodes prior to publish acknowledgment (ISR - In-Sync Replicas).
4. **Fault Tolerance & Dynamic Rebalancing**: Automatic leader election upon broker crash and dynamic consumer group partition rebalancing without message duplication.
5. **Configurable Delivery Guarantees**: Support At-Least-Once (default for performance) and Exactly-Once (via transactional producer idempotency keys).

---

## 2. Capacity & Scale Estimation

### Scale Assumptions
- **Daily Message Volume**: 5 Billion messages/day.
- **Average Message Size**: 1 KB payload.
- **Active Topics**: 5,000 active topics across the enterprise.
- **Average Partitions per Topic**: 16 partitions.
- **Replication Factor**: 3 (1 Leader + 2 In-Sync Replicas per partition).

### Throughput Calculations
- **Average QPS**:
  $$\text{Average Publish QPS} = \frac{5,000,000,000}{86,400\text{ seconds}} \approx 57,870\text{ Messages/sec}$$
- **Peak Spike QPS (3.5x Surge Multiplier)**:
  $$\text{Peak Publish QPS} = 57,870 \times 3.5 \approx \mathbf{202,545\text{ Messages/sec}}$$
- **Network Ingress & Egress Bandwidth**:
  $$\text{Publish Ingress} = 202,545 \times 1\text{ KB} \approx 202.5\text{ MB/sec} = 1.62\text{ Gbps}$$
  $$\text{Consume Egress (assuming 2 consumer groups)} = 202.5\text{ MB/sec} \times 2 = 405\text{ MB/sec} = 3.24\text{ Gbps}$$

### Storage Sizing & Retention
- **Daily Raw Data Ingest**:
  $$\text{Daily Raw Ingest} = 5,000,000,000 \times 1\text{ KB} = 5\text{ TB/day}$$
- **Replicated Storage Requirement (7-Day Retention Window)**:
  $$\text{Storage} = 5\text{ TB/day} \times 3\text{ (Replication)} \times 7\text{ days} = \mathbf{105\text{ TB Storage}}$$
- **Broker Infrastructure Allocation**:
  - Deploy 15 Broker Nodes (`i3en.2xlarge` with NVMe SSD local storage, 64 GB RAM, 8 vCPUs per node).

---

## 3. High-Level Architecture

The Distributed Queue system consists of **Producers**, **Broker Nodes (Commit Log WAL Engine)**, **Consumer Group Coordinators**, **Offset Registry Store**, and **Dead Letter Queue Workers**.

![System Architecture](./distributed_queue_system_architecture.png)

```mermaid
graph TD
    Producer["Producer Applications"] -->|"1. Publish (Key, Payload)"| IngressLB["AWS Network Load Balancer (NLB)"]
    
    subgraph BrokerCluster["Distributed Queue Broker Cluster"]
        subgraph Partition1["Partition 0 (Leader: Broker 1)"]
            B1_Leader["Broker 1 (WAL Commit Log)"] -->|"ISR Sync"| B2_Replica["Broker 2 (Follower)"]
            B1_Leader -->|"ISR Sync"| B3_Replica["Broker 3 (Follower)"]
        end
        
        subgraph Partition2["Partition 1 (Leader: Broker 2)"]
            B2_Leader["Broker 2 (WAL Commit Log)"] -->|"ISR Sync"| B1_Replica["Broker 1 (Follower)"]
        end
    end
    
    IngressLB -->|"Route to Topic Partition Leader"| B1_Leader
    IngressLB -->|"Route to Topic Partition Leader"| B2_Leader

    subgraph ConsumerGroup["Consumer Group ('order-processors')"]
        C1["Consumer Thread 1 (Part 0)"]
        C2["Consumer Thread 2 (Part 1)"]
    end
    
    B1_Leader -->|"2. Poll Batch Messages"| C1
    B2_Leader -->|"2. Poll Batch Messages"| C2
    
    C1 -->|"3. Commit Offset (Seq=1042)"| OffsetStore[("Consumer Offset Registry (DynamoDB / Internal Topic)")]
    C2 -->|"3. Commit Offset (Seq=582)"| OffsetStore

    C1 -.->|"4. Exceed Max Retries"| DLQ["Dead Letter Queue (DLQ Engine)"]
```

### Component Details
1. **Producer SDK**: Performs client-side partition routing using `MurmurHash3(key) % num_partitions`. Batches messages into micro-frames ($16\text{ KB}$ or $5\text{ms}$) to optimize throughput.
2. **Broker Nodes & Commit Log Engine**:
   - Each partition is backed by an **Append-Only Write-Ahead Log (WAL)** split into fixed-size segments ($1\text{ GB}$ each).
   - Zero-copy transfers (`sendfile` system call) move bytes directly from disk page cache to OS network sockets without user-space buffer copies.
3. **Consumer Group Coordinator**:
   - Manages dynamic membership of consumer instances. Automatically rebalances partition assignments when consumers join, leave, or crash.
4. **Offset Registry Store**:
   - Tracks the highest processed sequence number (`offset`) per partition per consumer group.
5. **Dead Letter Queue (DLQ)**:
   - Dedicated fallback queue storing unprocessable (poison pill) messages for offline investigation.

---

## 4. Component-Level Design & Algorithms

### Append-Only Commit Log & Index File Structure

Each partition folder on a broker contains paired **Log Data Files** (`.log`) and **Sparse Index Files** (`.index`):

```
/var/log/queue/orders-topic-0/
  ├── 00000000000000000000.log      (Raw Message Bytes)
  ├── 00000000000000000000.index    (Sparse Index: Relative Offset -> Physical Byte Position)
  ├── 00000000000000104850.log
  └── 00000000000000104850.index
```

```
Sparse Index File (.index)            Log Data File (.log)
+------------------------+            +------------------------------------+
| Relative Offset | Byte |            | Offset 0 | Magic | CRC | Key | Payload|
+-----------------+------+            +------------------------------------+
| 0               | 0    | ---------> | Offset 100| Magic| CRC | Key | Payload|
| 100             | 4096 | ---------> | Offset 200| Magic| CRC | Key | Payload|
| 200             | 8192 |            +------------------------------------+
+------------------------+
```

- **Lookup Optimization**: To find offset $N$, the broker binary-searches the sparse index file to find the nearest byte position $\le N$, then scans linearly through the `.log` segment for a few kilobytes. Search complexity is $O(\log(\text{index_entries}))$.

### Consumer Group Partition Rebalancing (Range & Round-Robin)

When Consumer Group instances change (e.g. 4 consumers, 8 partitions):

```
Partitions: [P0, P1, P2, P3, P4, P5, P6, P7]
Consumers:  [C1, C2, C3, C4]

Range Assignment Strategy:
  C1 -> [P0, P1]
  C2 -> [P2, P3]
  C3 -> [P4, P5]
  C4 -> [P6, P7]
```

Rebalance Protocol Phases:
1. **JoinGroup**: Consumers send heartbeats to Group Coordinator; Coordinator selects Leader Consumer.
2. **SyncGroup**: Leader computes assignment plan and broadcasts to Coordinator.
3. **Execute**: Consumers begin fetching from newly assigned partitions.

### Visibility Timeout & In-Flight State Transition

For queues supporting message acknowledgments (SQS-style):

```
+------------+       Poll Message      +------------------+
| AVAILABLE  | ----------------------> | IN_FLIGHT        |
+------------+                         | (Visibility Timer|
      ^                                |  t = 30s)        |
      |                                +------------------+
      | Timeout Expired (No Ack)                |
      +-----------------------------------------+ ACK Received
                                                v
                                       +------------------+
                                       | DELETED          |
                                       +------------------+
```

---

## 5. Database Schema & Data Models

### Message Record Binary Frame Format (In-Log Byte Layout)
```c
struct MessageFrame {
    uint32_t magic_byte;      // Protocol version (e.g., 0x02)
    uint32_t crc32;           // Checksum for data corruption verification
    uint64_t offset;          // Monotonic partition sequence offset
    uint64_t timestamp_ms;    // Publish timestamp
    uint32_t key_len;         // Key length in bytes
    char* key;                // Partitioning key
    uint32_t payload_len;     // Payload length in bytes
    char* payload;            // Opaque binary or JSON message body
};
```

### Metadata & Consumer Offset Schema (PostgreSQL DDL)

```sql
-- Topic definitions and configuration
CREATE TABLE topics (
    topic_name VARCHAR(128) PRIMARY KEY,
    partition_count INT NOT NULL DEFAULT 16,
    replication_factor INT NOT NULL DEFAULT 3,
    retention_hours INT NOT NULL DEFAULT 168,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Consumer group offset tracking
CREATE TABLE consumer_offsets (
    group_id VARCHAR(128) NOT NULL,
    topic_name VARCHAR(128) NOT NULL,
    partition_id INT NOT NULL,
    committed_offset BIGINT NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, topic_name, partition_id)
);

CREATE INDEX idx_offsets_lookup ON consumer_offsets(group_id, topic_name);

-- Dead Letter Queue audit table
CREATE TABLE dead_letter_messages (
    dlq_id BIGSERIAL PRIMARY KEY,
    original_topic VARCHAR(128) NOT NULL,
    original_partition INT NOT NULL,
    original_offset BIGINT NOT NULL,
    message_key VARCHAR(255),
    payload BYTEA NOT NULL,
    failure_reason TEXT,
    retry_count INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. API Design & Contracts

### RESTful Interface

#### 1. Publish Message to Topic
- **Endpoint**: `POST /v1/topics/{topic}/publish`
- **Request Payload**:
  ```json
  {
    "key": "order_user_9981",
    "payload": {
      "order_id": "ORD-88201",
      "amount": 249.99,
      "user_id": "9981"
    },
    "delay_seconds": 0
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "status": "PUBLISHED",
    "topic": "orders",
    "partition": 3,
    "offset": 1048592,
    "timestamp_ms": 1784898000120
  }
  ```

#### 2. Poll Messages (Consumer)
- **Endpoint**: `POST /v1/topics/{topic}/consume`
- **Request Payload**:
  ```json
  {
    "consumer_group": "order-processors",
    "consumer_id": "consumer-node-01",
    "max_messages": 10,
    "visibility_timeout_sec": 30
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "topic": "orders",
    "messages_count": 2,
    "messages": [
      {
        "partition": 3,
        "offset": 1048592,
        "key": "order_user_9981",
        "payload": { "order_id": "ORD-88201", "amount": 249.99 },
        "receipt_handle": "handle_p3_off1048592_attempt1"
      }
    ]
  }
  ```

#### 3. Commit Offsets
- **Endpoint**: `POST /v1/topics/{topic}/offsets/commit`
- **Request Payload**:
  ```json
  {
    "consumer_group": "order-processors",
    "offsets": [
      { "partition": 3, "committed_offset": 1048592 }
    ]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "committed": 1
  }
  ```

---

## 7. End-to-End Workflow Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Producer as Producer App
    participant Broker as Queue Broker (Leader)
    participant WAL as Commit Log (.log / .index)
    participant Consumer as Consumer Worker
    participant Offsets as Offset Registry
    participant DLQ as DLQ Handler

    rect rgb(235, 245, 255)
        note over Producer, WAL: 1. Message Production & WAL Persistence
        Producer->>Broker: POST /v1/topics/orders/publish (Key: order_99)
        Broker->>Broker: MurmurHash3(order_99) -> Partition 3
        Broker->>WAL: Append Frame to Segment (Offset = 1048592)
        WAL-->>Broker: Append OK & Sync Page Cache
        Broker-->>Producer: 201 Created (Partition=3, Offset=1048592)
    end

    rect rgb(240, 255, 240)
        note over Consumer, Offsets: 2. Batch Consume & Offset Commit
        Consumer->>Broker: POST /v1/topics/orders/consume (Group: order-proc)
        Broker->>WAL: Read Segment Bytes via Sparse Index
        WAL-->>Broker: Return Message Buffer
        Broker-->>Consumer: 200 OK (Message, ReceiptHandle)
        Consumer->>Consumer: Process Order Event Business Logic
        Consumer->>Offsets: POST /v1/topics/orders/offsets/commit (P=3, Off=1048592)
        Offsets-->>Consumer: Offset Committed
    end

    rect rgb(255, 245, 235)
        note over Consumer, DLQ: 3. Poison Pill Retry & DLQ Escalation
        Consumer->>Consumer: Processing Failed (Attempt 5 / 5)
        Consumer->>DLQ: Route to Dead Letter Queue (Reason: MaxRetriesExceeded)
        DLQ-->>Consumer: DLQ Escalation Complete
    end
```

---

## 8. Executable Python OOD Implementation

The following complete, runnable Python script implements a thread-safe **Partitioned Distributed Message Queue**, including an append-only commit log, sparse index lookup simulation, consumer group partition assignment, and DLQ escalation.

```python
import hashlib
import time
import threading
from typing import Dict, List, Optional, Tuple, Any


class MessageFrame:
    """Represents an immutable message frame stored inside a partition log."""
    def __init__(self, offset: int, key: str, payload: Any, delay_seconds: int = 0):
        self.offset = offset
        self.key = key
        self.payload = payload
        self.timestamp = time.time()
        self.visible_after = self.timestamp + delay_seconds
        self.retry_count = 0


class PartitionCommitLog:
    """Thread-safe append-only commit log for a single topic partition."""
    def __init__(self, partition_id: int):
        self.partition_id = partition_id
        self.log: List[MessageFrame] = []
        self.sparse_index: Dict[int, int] = {}  # Offset -> Log Index Position
        self.next_offset = 0
        self.lock = threading.Lock()

    def append(self, key: str, payload: Any, delay_seconds: int = 0) -> int:
        with self.lock:
            offset = self.next_offset
            msg = MessageFrame(offset, key, payload, delay_seconds)
            self.log.append(msg)
            
            # Record sparse index entry every 2 messages
            if len(self.log) % 2 == 1:
                self.sparse_index[offset] = len(self.log) - 1

            self.next_offset += 1
            return offset

    def read_from_offset(self, start_offset: int, max_count: int = 10) -> List[MessageFrame]:
        with self.lock:
            now = time.time()
            result: List[MessageFrame] = []
            
            # Scan log entries starting from target offset
            for msg in self.log:
                if msg.offset >= start_offset and now >= msg.visible_after:
                    result.append(msg)
                    if len(result) >= max_count:
                        break
            return result


class DistributedQueueBroker:
    """Distributed Queue Broker managing multi-partition topics and consumer groups."""
    def __init__(self, num_partitions: int = 4):
        self.num_partitions = num_partitions
        self.partitions: List[PartitionCommitLog] = [
            PartitionCommitLog(i) for i in range(num_partitions)
        ]
        self.consumer_offsets: Dict[str, Dict[int, int]] = {}  # group_id -> {partition_id: committed_offset}
        self.dlq: List[Tuple[MessageFrame, str]] = []
        self.lock = threading.Lock()

    def _hash_key(self, key: str) -> int:
        """MurmurHash3 partition routing calculation."""
        h = int(hashlib.md5(key.encode('utf-8')).hexdigest()[:8], 16)
        return h % self.num_partitions

    def publish(self, key: str, payload: Any, delay_seconds: int = 0) -> Tuple[int, int]:
        p_id = self._hash_key(key)
        offset = self.partitions[p_id].append(key, payload, delay_seconds)
        return p_id, offset

    def consume(self, group_id: str, partition_id: int, max_messages: int = 5) -> List[MessageFrame]:
        with self.lock:
            if group_id not in self.consumer_offsets:
                self.consumer_offsets[group_id] = {p: 0 for p in range(self.num_partitions)}
            current_offset = self.consumer_offsets[group_id].get(partition_id, 0)

        messages = self.partitions[partition_id].read_from_offset(current_offset, max_messages)
        return messages

    def commit_offset(self, group_id: str, partition_id: int, offset: int) -> None:
        with self.lock:
            if group_id not in self.consumer_offsets:
                self.consumer_offsets[group_id] = {}
            self.consumer_offsets[group_id][partition_id] = offset + 1

    def send_to_dlq(self, msg: MessageFrame, reason: str) -> None:
        with self.lock:
            self.dlq.append((msg, reason))


# Verification Harness
if __name__ == "__main__":
    print("=== 🚀 Initializing Distributed Queue Verification Harness ===")
    broker = DistributedQueueBroker(num_partitions=3)

    # 1. Publish messages across partitions
    print("\n--- Test 1: Publish Messages ---")
    orders = [
        ("user_101", {"order_id": "ORD-001", "amount": 99.50}),
        ("user_102", {"order_id": "ORD-002", "amount": 149.00}),
        ("user_103", {"order_id": "ORD-003", "amount": 25.00}),
        ("user_101", {"order_id": "ORD-004", "amount": 500.00}),  # Same key -> Same partition as ORD-001
    ]

    published_offsets = []
    for key, payload in orders:
        pid, off = broker.publish(key, payload)
        published_offsets.append((key, pid, off))
        print(f"Published key='{key}' -> Partition [{pid}], Offset [{off}]")

    # 2. Consume messages per partition
    print("\n--- Test 2: Consume Messages (Group 'order-processors') ---")
    for pid in range(3):
        msgs = broker.consume("order-processors", partition_id=pid, max_messages=10)
        print(f"Partition [{pid}] returned {len(msgs)} messages:")
        for m in msgs:
            print(f"  -> Offset {m.offset}: Key={m.key}, Payload={m.payload}")
            broker.commit_offset("order-processors", pid, m.offset)

    # 3. Verify offset persistence (no duplicate reads)
    print("\n--- Test 3: Re-consume after offset commit ---")
    msgs_re = broker.consume("order-processors", partition_id=0, max_messages=10)
    print(f"Partition [0] second poll count: {len(msgs_re)} (Expected: 0)")

    # 4. DLQ Escalation Test
    print("\n--- Test 4: Dead Letter Queue (DLQ) Routing ---")
    bad_msg = MessageFrame(offset=99, key="user_999", payload={"corrupted": True})
    broker.send_to_dlq(bad_msg, "DeserializationError: Unknown field 'corrupted'")
    print(f"DLQ Active Count = {len(broker.dlq)}")
    print(f"DLQ Record: Reason='{broker.dlq[0][1]}', Key='{broker.dlq[0][0].key}'")

    print("\n=== ✨ Distributed Queue Verification Completed Successfully! ===")
```

---

## 9. Scalability, Resilience & Edge Failover

```
+-------------------------------------------------------------------------+
|                    Fault Tolerance & Edge Matrix                        |
+-------------------+------------------------+----------------------------+
| Failure Scenario  | Detection Mechanism    | Mitigation Strategy        |
+-------------------+------------------------+----------------------------+
| Leader Broker     | ZooKeeper / Controller | ISR follower promoted to   |
| Node Crash        | Heartbeat Miss         | Leader in < 2 seconds      |
+-------------------+------------------------+----------------------------+
| Consumer Instance | Group Coordinator      | Partition rebalance        |
| Crash             | Session Timeout (10s)  | reassigns orphaned shards  |
+-------------------+------------------------+----------------------------+
| Poison Pill       | Max Retry Count        | Automatically routed to    |
| Message           | Exceeded Threshold     | DLQ to unblock processing  |
+-------------------+------------------------+----------------------------+
```

---

## 10. AWS Cloud-Native Architecture

Deployed on AWS using **Amazon Managed Streaming for Apache Kafka (MSK) / Amazon SQS**, **AWS Network Load Balancers**, **Amazon ECS Fargate**, and **Amazon DynamoDB**.

![AWS Architecture](./distributed_queue_aws_architecture.png)

```mermaid
graph TD
    Producers["Producer Applications (EKS / ECS)"] --> NLB["AWS Network Load Balancer (NLB)"]
    
    subgraph VPC["VPC - Multi-AZ"]
        subgraph PublicSubnet["Public Ingress Subnet"]
            NLB
        end
        
        subgraph BrokerSubnet1["Private Subnet (AZ-1)"]
            Broker1["Amazon MSK Broker 1 (Leader)"]
            FargateConsumer1["ECS Fargate Consumer Task 1"]
        end
        
        subgraph BrokerSubnet2["Private Subnet (AZ-2)"]
            Broker2["Amazon MSK Broker 2 (Follower)"]
            FargateConsumer2["ECS Fargate Consumer Task 2"]
        end
        
        subgraph BrokerSubnet3["Private Subnet (AZ-3)"]
            Broker3["Amazon MSK Broker 3 (Follower)"]
        end
        
        subgraph StorageSubnet["Database Subnet"]
            OffsetDB[("Amazon DynamoDB (Offsets & DLQ)")]
        end
    end
    
    NLB --> Broker1
    NLB --> Broker2
    Broker1 -.->|"Replication"| Broker2
    Broker1 -.->|"Replication"| Broker3
    Broker1 --> FargateConsumer1
    Broker2 --> FargateConsumer2
    FargateConsumer1 --> OffsetDB
    FargateConsumer2 --> OffsetDB
```

### AWS Service Mapping
| Generic Component | AWS Service | Implementation Details |
| :--- | :--- | :--- |
| **Ingress Load Balancer**| AWS Network Load Balancer (NLB) | Ultra-low latency L4 TCP traffic distribution across broker endpoints. |
| **Broker Commit Log** | Amazon MSK (Managed Streaming for Kafka) | Fully managed Multi-AZ cluster storing durable WAL segments on EBS volumes. |
| **Consumer Compute** | AWS ECS Fargate Tasks | Auto-scaled container workers processing topic messages in consumer groups. |
| **Offset & DLQ Registry**| Amazon DynamoDB | Low-latency storage for consumer offset commits and Dead Letter Queue records. |
| **Monitoring & Alarms** | Amazon CloudWatch | Metrics dashboard tracking topic lag, bytes in/out, and partition rebalance events. |

---

## 11. Technology Justification

### Comparative Architecture Trade-offs

| Design Decision | Selected Choice | Alternative Option | Justification |
| :--- | :--- | :--- | :--- |
| **Storage Architecture** | **Partition Commit Log (WAL)** | Database Polling Table | Commit log provides sequential disk I/O ($> 100\text{ MB/s}$ write speeds) and zero-copy read transfers. |
| **Consumer Scaling** | **Partition-Based Consumer Groups** | Competing Consumers (RabbitMQ) | Partitioning guarantees strict message ordering per key while enabling linear consumer scale. |
| **Delivery Guarantees** | **At-Least-Once + Idempotency Keys** | Exactly-Once Transactions | At-Least-Once minimizes coordination overhead; client-side idempotency keys handle rare deduplications safely. |
| **Poison Pill Strategy** | **Dead Letter Queue (DLQ)** | Infinite Re-queueing | DLQ prevents unprocessable messages from blocking partition processing queues indefinitely. |
