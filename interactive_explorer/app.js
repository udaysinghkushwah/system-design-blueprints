// System Blueprint Node Configurations & Interactive Inspector State Data
const systemData = {
    url_shortener: {
        title: "URL Shortener System",
        description: "High-scale unique link creation and fast redirection routing engine with multi-tier edge caching.",
        nodes: {
            "ingress": {
                name: "Route 53 & CloudFront CDN",
                category: "Networking & Edge CDN",
                description: "Resolves DNS queries and edge-caches hot redirect lookups (301/302 HTTP redirects) at edge locations, absorbing 60%+ of read requests.",
                payload: `HTTP/1.1 301 Moved Permanently\nLocation: https://example.com/target-long-url\nCache-Control: public, max-age=86400`,
                config: `resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_lb.app_alb.dns_name
    origin_id   = "ALBOrigin"
  }
  default_cache_behavior {
    target_origin_id = "ALBOrigin"
    viewer_protocol_policy = "redirect-to-https"
  }
}`
            },
            "proxy": {
                name: "ECS Fargate (Redirection Shards)",
                category: "Compute Engine",
                description: "Stateless container microservice nodes resolving short codes. Checks cache tier first, falls back to Database, writes redirect logs asynchronously.",
                payload: `{
  "request_code": "xY89zK",
  "client_ip": "203.0.113.195",
  "cache_hit": true
}`,
                config: `resource "aws_ecs_service" "shortener_compute" {
  name            = "url-shortener-service"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.task.arn
  desired_count   = 6
}`
            },
            "redis": {
                name: "ElastiCache Redis Cache",
                category: "Database & Cache",
                description: "High-performance in-memory cache mapping short codes to destination long URLs with sub-millisecond latencies.",
                payload: `GET url:xY89zK\n"https://example.com/target-long-url"`,
                config: `resource "aws_elasticache_cluster" "url_cache" {
  cluster_id           = "url-shortener-cache"
  node_type            = "cache.r6g.large"
  num_cache_nodes      = 3
  parameter_group_name = "default.redis7"
}`
            },
            "db": {
                name: "Amazon Aurora PostgreSQL",
                category: "Database Storage",
                description: "Durable primary datastore. Houses the core short-code index mappings with a unique constraint on short codes.",
                payload: `SELECT long_url FROM urls WHERE short_code = 'xY89zK';`,
                config: `resource "aws_rds_cluster" "db" {
  cluster_identifier      = "url-shortener-db"
  engine                  = "aurora-postgresql"
  database_name           = "shortener"
  master_username         = "postgres"
}`
            },
            "kinesis": {
                name: "Amazon Kinesis Firehose",
                category: "Analytics Pipeline",
                description: "Collects redirect access logs asynchronously from proxy nodes, batching them into S3 analytics data lakes.",
                payload: `{
  "short_code": "xY89zK",
  "referrer": "linkedin.com",
  "country": "US",
  "timestamp": 1784643600
}`,
                config: `resource "aws_kinesis_firehose_delivery_stream" "analytics" {
  name        = "shortener-analytics-stream"
  destination = "extended_s3"
}`
            }
        }
    },
    pastebin: {
        title: "Pastebin Sharing Platform",
        description: "Metadata and file-separated storage engine supporting compressed content blobs and full-text discovery.",
        nodes: {
            "ingress": {
                name: "CloudFront CDN Edge",
                category: "Networking & Edge",
                description: "Caches public paste content and checks syntax-highlighted HTML pages, keeping read latency under 5ms.",
                payload: `GET /raw/paste_99ab88\nHTTP/2 200 OK\nContent-Type: text/plain`,
                config: `# CloudFront distribution caching paste content`
            },
            "proxy": {
                name: "ECS Fargate (Paste Ingest/Read)",
                category: "Compute Tier",
                description: "Stateless task nodes. Handles paste creation, decompresses read requests, and routes metadata updates to Postgres and raw files to S3.",
                payload: `{
  "action": "CREATE",
  "compression": "zstd",
  "metadata_size_bytes": 192
}`,
                config: `resource "aws_ecs_task_definition" "paste_task" {
  family                   = "pastebin-processor"
  requires_compatibilities = ["FARGATE"]
}`
            },
            "redis": {
                name: "ElastiCache Redis Cache",
                category: "Database & Cache",
                description: "Multi-tier cache stores raw pastes, pre-compiled syntax highlighting sheets, and metadata index keys.",
                payload: `GET paste:meta:99ab88\n"{\\"title\\":\\"Log Output\\",\\"user_id\\":42}"`,
                config: `# Redis replication groups mapping cache`
            },
            "db": {
                name: "Aurora PostgreSQL DB",
                category: "Durable Metadata",
                description: "Houses paste records metadata (author, expiry, folder paths) with custom index parameters for scheduled expirations.",
                payload: `SELECT * FROM pastes WHERE expiry_time < NOW();`,
                config: `# RDS PostgreSQL cluster instance configurations`
            },
            "s3": {
                name: "Amazon S3 Content Storage",
                category: "Object Vault",
                description: "Stores raw compressed (zstd) paste body blobs. Designed for infinite horizontal storage scale.",
                payload: `PUT /pastes/99ab88.zst (Size: 4.2 KB)`,
                config: `resource "aws_s3_bucket" "pastes_bucket" {
  bucket = "pastebin-raw-content"
}`
            }
        }
    },
    file_storage: {
        title: "Distributed File Storage",
        description: "Scale-out block/file storage system separating control path (metadata) from high-throughput data path (blocks).",
        nodes: {
            "ingress": {
                name: "Network Load Balancer (NLB)",
                category: "Networking Layer",
                description: "Distributes TCP client connections to control plane or high-throughput storage instances.",
                payload: `TCP Connection Ingress\nLayer 4 TCP forward\nPort 9000 (Data Plane) / Port 8080 (Control Plane)`,
                config: `# NLB Layer 4 TCP listeners mappings`
            },
            "proxy": {
                name: "ECS Namespace Controllers",
                category: "Control Plane Master",
                description: "Stateless master node registry tasks coordinating folder trees, chunk replication leases, and block report updates.",
                payload: `{
  "action": "GET_BLOCK_LOCATIONS",
  "file_path": "/user/data/report.csv",
  "blocks": ["b12", "b13"]
}`,
                config: `# ECS Master Controller deployments mapping`
            },
            "ec2": {
                name: "EC2 NVMe Chunk Servers",
                category: "Data Plane Compute",
                description: "High-performance EC2 instance clusters hosting NVMe SSDs. Receives, replicates, and serves raw 64 MB block chunks.",
                payload: `WRITE_BLOCK block_12 (size: 64MB)\nPipeline Replication -> ChunkServer_B -> ChunkServer_C`,
                config: `# EC2 storage-optimized instances (i3en/d3)`
            },
            "db": {
                name: "Amazon DynamoDB Metadata",
                category: "Durable Metadata Registry",
                description: "Stores directories, folder permissions, and file-to-block mappings with transactional consistency guarantees.",
                payload: `{
  "path_uuid": "d821a",
  "block_list": ["b_12", "b_13", "b_14"]
}`,
                config: `resource "aws_dynamodb_table" "fs_metadata" {
  name     = "distributed_filesystem_metadata"
  hash_key = "path_uuid"
}`
            }
        }
    },
    food_delivery: {
        title: "Food Delivery Architecture",
        description: "Scalable geospatial ingestion and order matchmaking engines connecting users, kitchens, and riders.",
        nodes: {
            "ingress": {
                name: "Application Load Balancer",
                category: "Networking Ingress",
                description: "Routes client REST requests, restaurant webhooks, and rider telemetry streams.",
                payload: `POST /api/v1/orders/checkout\nAuthorization: Bearer jwt_rider_token`,
                config: `# HTTP/HTTPS ALB listener rules`
            },
            "proxy": {
                name: "ECS Fargate (Core Microservices)",
                category: "Compute Clusters",
                description: "Hosts the Order, Restaurant, Delivery, and Dispatch engines coordinating matchmaking queries.",
                payload: `{
  "order_id": "ord_884",
  "matching_status": "searching_rider"
}`,
                config: `# ECS Fargate task mappings`
            },
            "redis": {
                name: "ElastiCache Redis Geospatial",
                category: "Geospatial In-Memory Engine",
                description: "Stores live rider coordinate records. Triggers rapid queries to locate closest riders inside a 5km radius.",
                payload: `GEORADIUS active_riders 72.87 19.07 5 km`,
                config: `# Redis Geo-spatial cache cluster settings`
            },
            "db": {
                name: "Aurora PostgreSQL Transactional",
                category: "Durable Orders database",
                description: "Transactional DB mapping orders, checkout records, payment authorizations, and ledger updates.",
                payload: `INSERT INTO order_ledgers (order_id, amount, status) VALUES ('ord_884', 24.50, 'authorized');`,
                config: `# Aurora PostgreSQL cluster settings`
            },
            "keyspaces": {
                name: "Keyspaces (Cassandra Cluster)",
                category: "Rider Telemetry logger",
                description: "Managed Cassandra storage. Ingests heavy raw rider location coordinates updates (25k writes/sec).",
                payload: `INSERT INTO rider_tracks (rider_id, lat, lng, time) VALUES ('r_42', 19.07, 72.87, 1784643600);`,
                config: `# Cassandra keyspaces schemas and tables`
            }
        }
    },
    dropbox: {
        title: "Dropbox Cloud Synchronization",
        description: "Delta synchronization storage system resolving conflicts at block-level via global hashes indexing.",
        nodes: {
            "ingress": {
                name: "Network Load Balancer (NLB)",
                category: "Networking Ingress",
                description: "Routes client file uploads and persistent WebSocket notification streams.",
                payload: `WebSocket Connection Ingress\nStream check-ins`,
                config: `# NLB listeners mapped to metadata and block servers`
            },
            "proxy": {
                name: "ECS Fargate (Block/Meta Sync)",
                category: "Compute Clusters",
                description: "Ingests blocks, triggers global dedupe checks, updates file version tables, and schedules notifications.",
                payload: `{
  "action": "UPLOAD_BLOCKS",
  "client_hashes": ["H1", "H2", "H3"],
  "unique_blocks": ["H2"]
}`,
                config: `# ECS Fargate task deployments`
            },
            "redis": {
                name: "ElastiCache Redis Hash Registry",
                category: "Database & Cache",
                description: "Maintains a memory index registry of all unique block hashes for low-latency dedupe checks.",
                payload: `HEXISTS block_hashes SHA256_HASH_BLOCK_H2\n(integer) 0`,
                config: `# Redis block hash index cache`
            },
            "db": {
                name: "Amazon Aurora PostgreSQL",
                category: "Metadata Namespaces Store",
                description: "Tracks directory namespaces, file-to-block maps, and file version revisions.",
                payload: `SELECT * FROM file_chunks WHERE file_id = 'file_123' AND version_number = 3;`,
                config: `# Aurora DB registries`
            },
            "s3": {
                name: "Amazon S3 Object Vault",
                category: "Durable Block Store",
                description: "Holds all unique data block objects, configured with Glacier lifecycle policies for version archive cleanup.",
                payload: `PUT /dropbox-blocks/SHA256_HASH_BLOCK_H2`,
                config: `# S3 storage lifecycle policies`
            }
        }
    },
    parking_lot: {
        title: "Smart Parking Lot Engine",
        description: "IoT-enabled parking slot allocation, sensor telemetry processor, and billing ledger tracker.",
        nodes: {
            "ingress": {
                name: "API Gateway & AWS IoT Core",
                category: "IoT Ingress & API Gateway",
                description: "API Gateway ingests entry/exit ALPR camera scans. AWS IoT Core establishes lightweight MQTT loops with bay sensors.",
                payload: `MQTT TOPIC: /sensors/bay_12/status\n{"occupied": true, "timestamp": 1784643600}`,
                config: `# AWS IoT Core MQTT broker settings`
            },
            "proxy": {
                name: "ECS Fargate (Allocation Engine)",
                category: "Compute Engine",
                description: "Evaluates gate REST API requests. Runs closest-available-slot calculations using geohash indexes.",
                payload: `{
  "license_plate": "ABC1234",
  "vehicle_type": "EV",
  "allocated_slot_id": "spot_104"
}`,
                config: `# ECS allocation nodes task definitions`
            },
            "redis": {
                name: "ElastiCache Redis Vacancies Map",
                category: "Database & Cache",
                description: "Fast in-memory cache tracking available spots by type and geohash coordinates.",
                payload: `GEORADIUS vacant_ev_spots -73.93 40.73 200 m`,
                config: `# Redis spatial cache registries`
            },
            "db": {
                name: "Amazon Aurora PostgreSQL",
                category: "Durable Billing Ledger",
                description: "Records parking ticket sessions, pricing scales, payments, and invoice ledger logs.",
                payload: `UPDATE parking_spots SET status = 'RESERVED', version = version + 1 WHERE spot_id = 'spot_104' AND version = 3;`,
                config: `# Aurora SQL DB schemas`
            }
        }
    },
    rag_pipeline: {
        title: "RAG Pipeline Engine",
        description: "Unified ingestion and dense/sparse retrieval pipeline with cross-encoder reranking.",
        nodes: {
            "ingress": {
                name: "Application Load Balancer",
                category: "Networking Ingress",
                description: "Distributes incoming client text query streams to the query orchestrator pods.",
                payload: `POST /v1/search\n{"query": "distributed consensus systems"}`,
                config: `# ALB listener rules`
            },
            "proxy": {
                name: "ECS Fargate (Query Orchestrator)",
                category: "Compute Tier",
                description: "Coordinates query lookup, calls OpenSearch dense/sparse search, executes RRF fusion, and calls Bedrock for generation.",
                payload: `{
  "query": "distributed consensus",
  "top_opensearch_candidates": 50
}`,
                config: `# ECS query orchestrator definitions`
            },
            "opensearch": {
                name: "Amazon OpenSearch Cluster",
                category: "Search Database",
                description: "Unified vector space storage. Houses HNSW index graph shards for dense checks and traditional BM25 inverted indices.",
                payload: `{
  "dense_scores": [0.912, 0.844],
  "sparse_scores": [15.22, 11.08]
}`,
                config: `# OpenSearch cluster size settings`
            },
            "sagemaker": {
                name: "SageMaker Rerank Endpoint",
                category: "Machine Learning Compute",
                description: "Serverless machine learning model hosting. Runs Cross-Encoder model to compute high-precision scores on query-candidate pairs.",
                payload: `{
  "reranked_results": [
    { "doc_id": "doc_12", "score": 0.982 },
    { "doc_id": "doc_99", "score": 0.540 }
  ]
}`,
                config: `# SageMaker cross-encoder endpoints configuration`
            },
            "bedrock": {
                name: "Amazon Bedrock API",
                category: "AI Generation Core",
                description: "Forwards completed prompts to model providers and streams back completions.",
                payload: `{
  "response": {
    "text": "Raft is a distributed consensus algorithm designed to be readable...",
    "citations": ["doc_12"]
  }
}`,
                config: `# Bedrock Anthropic/Claude integration configurations`
            }
        }
    },
    vector_database: {
        title: "Distributed Vector Database",
        description: "Low-latency LSM-like segment space vector database. Optimizes HNSW index graphs using scalar quantization.",
        nodes: {
            "ingress": {
                name: "Application Load Balancer",
                category: "Networking Ingress",
                description: "Accepts client query vectors. Distributes lookups across the stateless ECS Coordinator Proxy layer.",
                payload: `{
  "vector": [0.015, -0.442, 0.985, -0.112],
  "top_k": 3
}`,
                config: `resource "aws_lb" "vector_db_alb" {
  name               = "vector-database-alb"
  load_balancer_type = "application"
}`
            },
            "ecs": {
                name: "ECS Coordinator Proxy Tasks",
                category: "Compute",
                description: "Stateless routing coordinators. Translates Vector collection UUIDs into target database shard nodes via consistent hashing.",
                payload: `{
  "target_shard": "shard_4",
  "murmur_hash": "0xDEADBEEF"
}`,
                config: `resource "aws_ecs_service" "coordinator_service" {
  name            = "vector-db-coordinators"
  cluster         = aws_ecs_cluster.db_cluster.id
  task_definition = aws_ecs_task_definition.coordinator_task.arn
}`
            },
            "ec2": {
                name: "EC2 RAM Shards (r6g instances)",
                category: "Memory Shards Cluster",
                description: "Houses index segments in physical memory. Directs vector lookups through local quantized HNSW graphs.",
                payload: `{
  "segment_id": "seg_0012",
  "graph_nodes_scanned": 142,
  "distance_type": "cosine"
}`,
                config: `# EC2 r6g memory-optimized instances`
            },
            "ebs": {
                name: "Amazon EBS gp3 Volume",
                category: "Database Storage",
                description: "Durable Write-Ahead Log SSD. Persists newly inserted vectors immediately before compiling index memory segments.",
                payload: `Append record log:
[TX_142] Collection: my_vectors | UUID: p_99 | Data: float32[768]`,
                config: `resource "aws_ebs_volume" "wal_volume" {
  availability_zone = "us-east-1a"
  size              = 100
  type              = "gp3"
  iops              = 3000
}`
            },
            "s3": {
                name: "Amazon S3",
                category: "Backup & Archiving",
                description: "Cold snapshot bucket. Archives immutable HNSW segment partitions built by background compaction workers.",
                payload: `PUT /vector-snapshots/seg_0012.hnsw (size: 42.1 MB)`,
                config: `resource "aws_s3_bucket" "snapshot_bucket" {
  bucket = "vector-database-snapshots"
}`
            }
        }
    },
    chat_gpt: {
        title: "ChatGPT Conversational Engine",
        description: "Low-latency streaming conversation orchestrator with active memory pools and GPU inference scaling.",
        nodes: {
            "ingress": {
                name: "Application Load Balancer",
                category: "Networking Ingress",
                description: "Maintains persistent HTTP/2 connection tunnels to client devices, streaming text completions text-by-text.",
                payload: `HTTP/2 200 OK\nContent-Type: text/event-stream\nTransfer-Encoding: chunked`,
                config: `# ALB HTTP/2 Listener Settings`
            },
            "proxy": {
                name: "ECS Session Orchestrators",
                category: "Compute Gateway",
                description: "Compiles prompt payloads. Reads conversational history from DynamoDB, checks Redis session cache, and feeds GPU clusters.",
                payload: `{
  "session_id": "sess_421",
  "prompt_assembled": "[History: 4 messages] [User: Hello!]"
}`,
                config: `# ECS task definition parameters`
            },
            "redis": {
                name: "ElastiCache Redis Session Store",
                category: "Database & Cache",
                description: "Sub-millisecond context window cache. Stores active dialogue tokens to accelerate context assembly loops.",
                payload: `GET session:context:sess_421\n"[Message history array]"`,
                config: `# ElastiCache cluster configuration mappings`
            },
            "db": {
                name: "Amazon DynamoDB (Chat History)",
                category: "Durable History Database",
                description: "Durable database mapping all chronological conversation messages, partitioned by session UUID.",
                payload: `SELECT * FROM chat_history WHERE session_id = 'sess_421' ORDER BY timestamp ASC;`,
                config: `# DynamoDB wide tables setup`
            },
            "gpu": {
                name: "Amazon EKS GPU Inference Pods",
                category: "Inference Compute Tier",
                description: "Hosts Triton or vLLM engines on p4d instances. Executes model forward passes using PagedAttention to optimize GPU memory.",
                payload: `{
  "inference_tokens_per_sec": 42.8,
  "vllm_engine_status": "generating"
}`,
                config: `# EKS node group config mounting NVIDIA A100 GPU instances`
            }
        }
    },
    ai_agent_framework: {
        title: "AI Agent Framework Loop",
        description: "Stateful agent execution engine executing loops, checking checkpoints, and providing tool sandboxes.",
        nodes: {
            "ingress": {
                name: "AWS API Gateway",
                category: "Networking Ingress",
                description: "API Gateway proxies incoming execution triggers and agent interaction requests.",
                payload: `POST /v1/agent/run\n{"agent_id": "researcher", "task": "Summarize AI news"}`,
                config: `# API Gateway API settings`
            },
            "proxy": {
                name: "ECS Fargate (State Loop Engine)",
                category: "Compute Shards Engine",
                description: "Executes agent graph loops. Holds active locks, evaluates next node target transitions, and launches tool executors.",
                payload: `{
  "agent_id": "researcher",
  "current_state_node": "extract_topics",
  "action": "call_lambda_tool"
}`,
                config: `# ECS task definitions`
            },
            "redis": {
                name: "ElastiCache Redis Mutex Cache",
                category: "Database & Cache",
                description: "Manages state locks and execution tokens, ensuring an agent thread has exactly one active worker loop execution.",
                payload: `SETNX lock:agent:run:researcher true\n(integer) 1`,
                config: `# Redis replication groups mapping locks`
            },
            "db": {
                name: "Aurora PostgreSQL State Ledger",
                category: "Durable History DB",
                description: "Relational database mapping chronological execution graphs states, variable updates, and history checkpoints.",
                payload: `SELECT checkpoint_data FROM agent_checkpoints WHERE agent_id = 'researcher' ORDER BY step_idx DESC LIMIT 1;`,
                config: `# Aurora DB registries`
            },
            "lambda": {
                name: "AWS Lambda Sandboxes",
                category: "Secure Execution Sandbox",
                description: "Executes untrusted agent tool scripts (python, node) inside isolated, ephemeral container sandboxes.",
                payload: `{
  "script": "import urllib; print(urllib.request.urlopen('http://url').read())",
  "execution_duration_ms": 1420
}`,
                config: `# AWS Lambda execution role limits`
            }
        }
    },
    llm_gateway: {
        title: "LLM Gateway Pipeline",
        description: "High-throughput proxy layer routing, auditing, and rate-limiting upstream LLM model transactions.",
        nodes: {
            "ingress": {
                name: "Application Load Balancer (ALB)",
                category: "Networking",
                description: "VPC Ingress gateway proxy. Distributes incoming client HTTP/2 Completion streams to ECS Fargate targets. Handles HTTP/2 connection pooling.",
                payload: `{
  "request": {
    "method": "POST",
    "path": "/v1/chat/completions",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer sk-tenant-123"
    }
  }
}`,
                config: `resource "aws_lb" "gateway_alb" {
  name               = "llm-gateway-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public.*.id
}`
            },
            "proxy": {
                name: "ECS Fargate (Go Proxy Pods)",
                category: "Compute",
                description: "State-less proxy worker shards. Validates tenant API keys, checks sliding-window limits, runs PII redact filters, and pipelines downstream completions.",
                payload: `{
  "tenant_id": "tenant-123",
  "limits_checked": true,
  "pii_redacted": true,
  "selected_provider": "bedrock:anthropic-claude"
}`,
                config: `resource "aws_ecs_task_definition" "proxy_task" {
  family                   = "llm-proxy-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"
}`
            },
            "redis": {
                name: "ElastiCache Redis",
                category: "Database & Cache",
                description: "Sub-millisecond token rate counter and semantic cache memory cluster. Uses sliding window hashes to limit tenant requests.",
                payload: `HGETALL tenant:rate:tenant-123
1) "tokens_in_window"
2) "4210"
3) "window_start"
4) "1784616000"`,
                config: `resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "llm-gateway-cache"
  description          = "Redis rate-limits & semantic-cache store"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 3
  port                 = 6379
}`
            },
            "db": {
                name: "Amazon DynamoDB",
                category: "Database & Registry",
                description: "Durable key storage. Holds active tenant configuration states, daily spend budgets, and allowed provider routing mappings.",
                payload: `{
  "tenant_id": "tenant-123",
  "daily_budget": 50.0000,
  "spend_accumulated": 14.2854,
  "status": "active"
}`,
                config: `resource "aws_dynamodb_table" "tenant_registry" {
  name           = "llm_tenant_registry"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "tenant_id"

  attribute {
    name = "tenant_id"
    type = "S"
  }
}`
            },
            "kinesis": {
                name: "Kinesis Data Firehose",
                category: "Analytics & Logging",
                description: "Asynchronous serverless logging pipeline. Pulls audit ledgers from proxy nodes without adding query blocking latency.",
                payload: `{
  "transaction_id": "tx_998811",
  "duration_ms": 142,
  "tokens_in": 105,
  "tokens_out": 240,
  "cost_usd": 0.00142
}`,
                config: `resource "aws_kinesis_firehose_delivery_stream" "ledger_stream" {
  name        = "llm-ledger-delivery-stream"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose_role.arn
    bucket_arn = aws_s3_bucket.ledger_bucket.arn
  }
}`
            },
            "bedrock": {
                name: "Amazon Bedrock API",
                category: "Upstream AI Services",
                description: "External target LLM gateway. Securely forwards completed prompts to Anthropic, Cohere, or Meta models and streams back completions.",
                payload: `{
  "response": {
    "text": "The distributed ledger completes transactions asynchronously...",
    "completion_tokens": 240
  }
}`,
                config: `# Managed Bedrock Execution Endpoint Connection`
            }
        }
    },
    semantic_search: {
        title: "Hybrid Semantic Search Engine",
        description: "Multi-stage vector retrieval, BM25 text keyword lookup, Reciprocal Rank Fusion, and Cross-Encoder reranking.",
        nodes: {
            "ingress": {
                name: "Application Load Balancer",
                category: "Networking",
                description: "VPC public endpoint router. Directs client queries to ECS Search Service container clusters.",
                payload: `{
  "query": "machine learning tutorials",
  "limit": 10
}`,
                config: `resource "aws_lb" "search_alb" {
  name               = "search-service-alb"
  internal           = false
  load_balancer_type = "application"
}`
            },
            "ecs_search": {
                name: "ECS Search Service Pods",
                category: "Compute",
                description: "Coordinates query lookup. Triggers dense vector and BM25 sparse queries in parallel, merges output lists via Reciprocal Rank Fusion, and calls Rerank endpoints.",
                payload: `{
  "opensearch_candidates_count": 50,
  "rerank_top_k": 10,
  "fusion_algorithm": "RRF"
}`,
                config: `resource "aws_ecs_service" "search_service" {
  name            = "search-service"
  cluster         = aws_ecs_cluster.app_cluster.id
  task_definition = aws_ecs_task_definition.search_task.arn
  desired_count   = 4
}`
            },
            "opensearch": {
                name: "Amazon OpenSearch Cluster",
                category: "Database & Index",
                description: "Unified vector space database. Houses HNSW index graph shards for dense cosine checks and traditional BM25 inverted indices.",
                payload: `{
  "dense_results_scores": [0.942, 0.881, 0.810],
  "sparse_results_scores": [14.28, 12.01, 10.15]
}`,
                config: `resource "aws_opensearch_domain" "search_domain" {
  domain_name    = "search-catalog-domain"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type = "r6g.xlarge.search"
    instance_count = 3
  }
}`
            },
            "sagemaker": {
                name: "SageMaker Reranker Endpoint",
                category: "Machine Learning",
                description: "Serverless machine learning model hosting. Runs Cross-Encoder model to compute high-precision scores on query-candidate pairs.",
                payload: `{
  "reranked_results": [
    { "doc_id": "doc_99", "score": 0.985 },
    { "doc_id": "doc_12", "score": 0.762 }
  ]
}`,
                config: `resource "aws_sagemaker_endpoint" "reranker_endpoint" {
  name                 = "cross-encoder-reranker"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.reranker_config.name
}`
            },
            "msk": {
                name: "Amazon MSK Kafka Cluster",
                category: "Ingestion Pipeline",
                description: "Managed Apache Kafka streaming bus. Buffers incoming document ingestion updates, shielding catalog indexing nodes.",
                payload: `{
  "topic": "catalog-updates",
  "partition": 2,
  "document_id": "doc_99",
  "operation": "UPSERT"
}`,
                config: `resource "aws_msk_cluster" "kafka" {
  cluster_name           = "catalog-ingest-kafka"
  kafka_version          = "3.4.0"
  number_of_broker_nodes = 3
}`
            }
        }
    },
    token_streaming: {
        title: "Real-Time Token Streaming Engine",
        description: "Low-latency HTTP/2 Server-Sent Events broker. Bypasses load balancer connection timeouts to pipeline tokens dynamically.",
        nodes: {
            "ingress": {
                name: "Network Load Balancer (NLB)",
                category: "Networking",
                description: "Operates at OSI layer 4. Preserves persistent client TCP sockets to prevent long-lived SSE streaming timeouts.",
                payload: `HTTP/2 200 OK\nContent-Type: text/event-stream\nCache-Control: no-cache\nConnection: keep-alive`,
                config: `resource "aws_lb" "stream_nlb" {
  name               = "streaming-engine-nlb"
  load_balancer_type = "network"
  subnets            = aws_subnet.public.*.id
}`
            },
            "eks_gw": {
                name: "EKS Connection Pod (Go/Epoll)",
                category: "Compute Gateway",
                description: "Low-overhead streaming connections. Keeps idle sockets in Go epoll wait loops, utilizing only 4KB RAM per connection.",
                payload: `{
  "session_id": "sess_1122",
  "tokens_delivered": 482,
  "ring_buffer_utilization": "12%"
}`,
                config: `# EKS Connection Gateway Deployment Config`
            },
            "redis": {
                name: "ElastiCache Redis Pub/Sub",
                category: "Event Broker",
                description: "High-performance internal message router. Relays generated tokens from isolated EC2 GPU servers to Go gateway sockets.",
                payload: `SUBSCRIBE channel:stream:sess_1122\nPUBLISH channel:stream:sess_1122 '{"token": " learning", "idx": 15}'`,
                config: `resource "aws_elasticache_replication_group" "redis_pubsub" {
  replication_group_id = "stream-router-pubsub"
  node_type            = "cache.m6g.xlarge"
  num_cache_clusters   = 3
}`
            },
            "sqs": {
                name: "Amazon SQS Queue",
                category: "Task Scheduling",
                description: "Inference queue orchestrator. Distributes incoming prompt tasks across the GPU worker pool dynamically.",
                payload: `{
  "prompt_id": "p_5544",
  "text": "Explain quantum computing in three sentences.",
  "max_new_tokens": 100
}`,
                config: `resource "aws_sqs_queue" "inference_queue" {
  name                      = "llm-inference-tasks"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 86400
}`
            },
            "gpu": {
                name: "EC2 GPU Worker Instances",
                category: "GPU Compute Cluster",
                description: "Runs vLLM engines on GPU nodes. Pulls tasks from SQS, generates tokens in batch pools, and publishes stream events to Redis.",
                payload: `{
  "engine": "vllm",
  "active_workers": 8,
  "paged_attention_blocks_allocated": 1420
}`,
                config: `# Autoscaling Group mounting g5.xlarge instances with NVIDIA A10G GPUs`
            }
        }
    },
    api_gateway: {
        title: "API Gateway Engine",
        description: "High-performance edge reverse proxy routing, auditing, and rate-limiting general client HTTP requests.",
        nodes: {
            "ingress": {
                name: "Network Load Balancer (NLB)",
                category: "Networking",
                description: "VPC Ingress router. Maps ingress TCP connections directly to Envoy proxy tasks.",
                payload: `{
  "client_ip": "198.51.100.12",
  "protocol": "HTTP/2",
  "tls_version": "TLSv1.3"
}`,
                config: `resource "aws_lb" "api_nlb" {
  name               = "api-gateway-nlb"
  load_balancer_type = "network"
}`
            },
            "proxy": {
                name: "ECS Fargate (Envoy Proxy Worker)",
                category: "Compute Proxy",
                description: "Envoy-based reverse proxy container nodes executing the filter validation chain.",
                payload: `{
  "route_matched": "orders_route",
  "filter_chain_status": "processing",
  "request_id": "req-99ab88"
}`,
                config: `resource "aws_ecs_service" "proxy_envoy" {
  name            = "envoy-gateway-proxy"
  desired_count   = 5
}`
            },
            "redis": {
                name: "ElastiCache Redis Cache",
                category: "Database & Cache",
                description: "Stores rate-limiting keys using Sorted Sets (ZSET) to validate sliding window counts.",
                payload: `ZRANGE rate:limit:user_123:orders 0 -1 WITHSCORES\n1) "req_uuid_1"\n2) "1784616010"`,
                config: `resource "aws_elasticache_cluster" "limit_store" {
  cluster_id           = "rate-limit-cache"
  node_type            = "cache.t4g.medium"
  num_cache_nodes      = 2
}`
            },
            "db": {
                name: "Amazon DynamoDB Config",
                category: "Database & Config",
                description: "Durable route mappings database. Rules are synchronized to Fargate proxy memory cache segments.",
                payload: `{
  "route_id": "orders_route",
  "path_pattern": "/api/v1/orders/**",
  "target_service": "orders_service"
}`,
                config: `resource "aws_dynamodb_table" "route_definitions" {
  name     = "api_gateway_routes"
  hash_key = "route_id"
}`
            },
            "s3": {
                name: "Cognito User Pool Auth",
                category: "Authentication Security",
                description: "Validates JWT access tokens at the network boundary edge before routing to internal microservice clusters.",
                payload: `{
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxx",
  "sub": "user_123",
  "token_use": "access"
}`,
                config: `# Cognito Authentication Validator integration config`
            }
        }
    }
};

// State Variables
let currentSystem = "llm_gateway";
let activeNode = "ingress";
let simulationActive = true;

// DOM Elements
const canvasContainer = document.getElementById("canvas-container");
const systemTitle = document.getElementById("system-title");
const systemDescription = document.getElementById("system-description");
const insCategory = document.getElementById("ins-category");
const insTitle = document.getElementById("ins-title");
const insDescription = document.getElementById("ins-description");
const insPayload = document.getElementById("ins-payload");
const insConfig = document.getElementById("ins-config");
const simulateBtn = document.getElementById("simulate-btn");
const indicator = document.querySelector(".status-indicator");
const indicatorText = document.querySelector(".status-text");

// Render Selected AWS Architecture SVGs
function renderSVG() {
    let svgContent = "";

    if (currentSystem === "url_shortener") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="440" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Scope</text>

            <path d="M120 250 L 220 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M380 220 L 460 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M380 280 L 460 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M300 320 L 300 380" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 220 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M380 220 L 460 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M380 280 L 460 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M300 320 L 300 380" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">Route53/CDN</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(220, 200)">
                <rect x="0" y="0" width="160" height="120" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="80" y="55" font-family="Outfit" font-size="14" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Redirect</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(460, 130)">
                <rect x="0" y="0" width="140" height="80" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="12" fill="#ef5350" font-weight="700" text-anchor="middle">Redis Cache</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(460, 290)">
                <rect x="0" y="0" width="140" height="80" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Aurora DB</text>
            </g>
            <g class="interactive-node" id="kinesis" transform="translate(230, 380)">
                <rect x="0" y="0" width="140" height="40" rx="8" fill="#111827" stroke="#10b981" stroke-width="1.5" />
                <text x="70" y="25" font-family="Outfit" font-size="10" fill="#10b981" font-weight="700" text-anchor="middle">Kinesis Logs</text>
            </g>
        </svg>`;
    } else if (currentSystem === "pastebin") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Scope</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#009688" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">CDN/WAF</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="55" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Ingest</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 130)">
                <rect x="0" y="0" width="200" height="70" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="100" y="40" font-family="Outfit" font-size="12" fill="#ef5350" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 310)">
                <rect x="0" y="0" width="200" height="70" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="40" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Aurora DB (Meta)</text>
            </g>
            <g class="interactive-node" id="s3" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#009688" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#009688" font-weight="700" text-anchor="middle">S3 Storage</text>
            </g>
        </svg>`;
    } else if (currentSystem === "file_storage") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Cloud</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 180" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 270 L 420 340" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 180" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 270 L 420 340" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">NLB</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="55" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Masters</text>
            </g>
            <g class="interactive-node" id="ec2" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="110" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">EC2 NVMe SSD</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Block storage</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 290)">
                <rect x="0" y="0" width="200" height="110" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">DynamoDB Metadata</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Namespace maps</text>
            </g>
        </svg>`;
    } else if (currentSystem === "food_delivery") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Core</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 360" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 240 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 360" stroke="#009688" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">ALB Ingress</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="55" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Engine</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="120" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="12" fill="#ef5350" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Geo-spatial Rider Locations</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 300)">
                <rect x="0" y="0" width="200" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="40" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
                <text x="100" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Orders & Ledgers</text>
            </g>
            <g class="interactive-node" id="keyspaces" transform="translate(200, 360)">
                <rect x="0" y="0" width="140" height="45" rx="8" fill="#111827" stroke="#009688" stroke-width="1.5" />
                <text x="70" y="27" font-family="Outfit" font-size="10" fill="#009688" font-weight="700" text-anchor="middle">Cassandra Logs</text>
            </g>
        </svg>`;
    } else if (currentSystem === "dropbox") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Subnets</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 200" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 200" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#009688" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">NLB Ingress</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Sync</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Block/Meta Coordinator</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="130" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Global Dedupe Index</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 300)">
                <rect x="0" y="0" width="200" height="60" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="100" y="35" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
            </g>
            <g class="interactive-node" id="s3" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#009688" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#009688" font-weight="700" text-anchor="middle">S3 Buckets</text>
            </g>
        </svg>`;
    } else if (currentSystem === "parking_lot") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC range</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 200" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 200" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#009688" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">API GW / IoT</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Allocation</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Gate Coordinator</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="130" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Occupancy Map Grid</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 300)">
                <rect x="0" y="0" width="200" height="60" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="100" y="35" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
            </g>
        </svg>`;
    } else if (currentSystem === "rag_pipeline") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Search Network Group)</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 240 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#c084fc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ec407a" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 240 L 520 300" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">ALB Ingress</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Query</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Orchestrator</text>
            </g>
            <g class="interactive-node" id="opensearch" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">OpenSearch</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Dense & Sparse Indexes</text>
            </g>
            <g class="interactive-node" id="sagemaker" transform="translate(420, 280)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ec407a" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ec407a" font-weight="700" text-anchor="middle">SageMaker Rerank</text>
            </g>
            <g class="interactive-node" id="bedrock" transform="translate(640, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Bedrock LLM</text>
            </g>
        </svg>`;
    } else if (currentSystem === "vector_database") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Vector Database Subnet)</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 200" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 200" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#009688" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">ALB Ingress</text>
            </g>
            <g class="interactive-node" id="ecs" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS proxy</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Coordinator Node</text>
            </g>
            <g class="interactive-node" id="ec2" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="130" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">EC2 Shard Pod</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Memory HNSW Graphs</text>
            </g>
            <g class="interactive-node" id="ebs" transform="translate(420, 300)">
                <rect x="0" y="0" width="200" height="60" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="100" y="35" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">EBS gp3 Volume</text>
            </g>
            <g class="interactive-node" id="s3" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#009688" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#009688" font-weight="700" text-anchor="middle">Amazon S3</text>
            </g>
        </svg>`;
    } else if (currentSystem === "chat_gpt") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Scope</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 680 250" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 680 250" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">ALB Ingress</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="55" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Orchestrator</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="90" y="45" font-family="Outfit" font-size="12" fill="#ef5350" font-weight="700" text-anchor="middle">Redis Session</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 290)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">DynamoDB History</text>
            </g>
            <g class="interactive-node" id="gpu" transform="translate(680, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#10b981" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#10b981" font-weight="700" text-anchor="middle">EKS GPU</text>
            </g>
        </svg>`;
    } else if (currentSystem === "ai_agent_framework") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Area</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 680 250" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 680 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">API GW</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="55" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Agent</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="90" y="45" font-family="Outfit" font-size="12" fill="#ef5350" font-weight="700" text-anchor="middle">Redis Mutex</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 290)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Aurora State</text>
            </g>
            <g class="interactive-node" id="lambda" transform="translate(680, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">Lambda Tool</text>
            </g>
        </svg>`;
    } else if (currentSystem === "llm_gateway") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="180" y="80" width="440" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Private App Subnets)</text>

            <!-- Connections -->
            <path id="path1" d="M120 250 L 220 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path2" d="M380 220 L 460 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path3" d="M380 280 L 460 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path4" d="M300 320 L 300 365" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path5" d="M380 250 L 680 250" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Animation Paths (Conditional) -->
            <path class="data-flow-line" d="M120 250 L 220 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M380 220 L 460 170" stroke="#f87171" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M380 280 L 460 330" stroke="#c084fc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M300 320 L 300 365" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M380 250 L 680 250" stroke="#a855f7" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: ALB -->
            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <circle cx="40" cy="35" r="16" fill="#ff9800" opacity="0.2" />
                <text x="40" y="39" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">ALB</text>
                <text x="40" y="68" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Ingress</text>
            </g>

            <!-- Compute: ECS Proxy -->
            <g class="interactive-node" id="proxy" transform="translate(220, 200)">
                <rect x="0" y="0" width="160" height="120" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <circle cx="80" cy="45" r="22" fill="#3b82f6" opacity="0.2" />
                <text x="80" y="50" font-family="Outfit" font-size="14" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS</text>
                <text x="80" y="90" font-family="Outfit" font-size="11" fill="#f3f4f6" text-anchor="middle">Proxy Engines</text>
            </g>

            <!-- Cache: Redis -->
            <g class="interactive-node" id="redis" transform="translate(460, 120)">
                <rect x="0" y="0" width="140" height="80" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="70" y="35" font-family="Outfit" font-size="13" fill="#ef5350" font-weight="700" text-anchor="middle">Redis Cache</text>
                <text x="70" y="60" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Rate Counter</text>
            </g>

            <!-- Key DB: DynamoDB -->
            <g class="interactive-node" id="db" transform="translate(460, 290)">
                <rect x="0" y="0" width="140" height="80" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="70" y="35" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">DynamoDB</text>
                <text x="70" y="60" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Tenant Registry</text>
            </g>

            <!-- Logging: Kinesis -->
            <g class="interactive-node" id="kinesis" transform="translate(230, 365)">
                <rect x="0" y="0" width="140" height="45" rx="8" fill="#111827" stroke="#10b981" stroke-width="1.5" />
                <text x="70" y="27" font-family="Outfit" font-size="11" fill="#10b981" font-weight="700" text-anchor="middle">Kinesis Firehose</text>
            </g>

            <!-- Outbound: Bedrock API -->
            <g class="interactive-node" id="bedrock" transform="translate(680, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <circle cx="40" cy="35" r="16" fill="#ab47bc" opacity="0.2" />
                <text x="40" y="39" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Bedrock</text>
                <text x="40" y="68" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Model API</text>
            </g>
        </svg>`;
    } else if (currentSystem === "semantic_search") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Search Network Group)</text>

            <!-- Connections -->
            <path id="path1" d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path2" d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path3" d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path4" d="M300 375 L 420 375" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path5" d="M560 375 L 610 375 L 610 210" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Lines -->
            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#c084fc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ec407a" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M300 375 L 420 375" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M560 375 L 610 375 L 610 210" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: ALB -->
            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">ALB</text>
            </g>

            <!-- ECS Search Pods -->
            <g class="interactive-node" id="ecs_search" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Search</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">RRF Fusion Pod</text>
            </g>

            <!-- OpenSearch Service -->
            <g class="interactive-node" id="opensearch" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">OpenSearch</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">HNSW Vector + BM25</text>
            </g>

            <!-- SageMaker Rerank -->
            <g class="interactive-node" id="sagemaker" transform="translate(420, 280)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ec407a" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ec407a" font-weight="700" text-anchor="middle">SageMaker</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Cross-Encoder</text>
            </g>

            <!-- MSK Kafka -->
            <g class="interactive-node" id="msk" transform="translate(200, 350)">
                <rect x="0" y="0" width="100" height="50" rx="8" fill="#111827" stroke="#ff5722" stroke-width="1.5" />
                <text x="50" y="30" font-family="Outfit" font-size="11" fill="#ff5722" font-weight="700" text-anchor="middle">MSK Kafka</text>
            </g>
        </svg>`;
    } else if (currentSystem === "token_streaming") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Private Subnet Groups</text>

            <!-- Connections -->
            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 375 L 420 375" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 330 L 520 240" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Lines -->
            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#f87171" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 375 L 420 375" stroke="#26a69a" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 330 L 520 240" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: NLB -->
            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">NLB</text>
            </g>

            <!-- EKS Go/Epoll Gateway -->
            <g class="interactive-node" id="eks_gw" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">EKS Gateway</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Go-Epoll Loops</text>
            </g>

            <!-- Redis Pub/Sub -->
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="120" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="13" fill="#ef5350" font-weight="700" text-anchor="middle">Redis Pub/Sub</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Decouple stream channels</text>
            </g>

            <!-- SQS queue -->
            <g class="interactive-node" id="sqs" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">SQS Task Queue</text>
            </g>

            <!-- GPU compute worker -->
            <g class="interactive-node" id="gpu" transform="translate(420, 330)">
                <rect x="0" y="0" width="200" height="80" rx="10" fill="#111827" stroke="#26a69a" stroke-width="2" />
                <text x="100" y="35" font-family="Outfit" font-size="13" fill="#26a69a" font-weight="700" text-anchor="middle">EC2 GPU Pool</text>
                <text x="100" y="60" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">vLLM Inference Pods</text>
            </g>
        </svg>`;
    } else if (currentSystem === "api_gateway") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Core Range</text>

            <!-- Connections -->
            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 680 250" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Lines -->
            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#a855f7" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 680 250" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: NLB -->
            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">NLB</text>
            </g>

            <!-- ECS Envoy Proxy -->
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Envoy</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Proxy Worker</text>
            </g>

            <!-- Redis Cache -->
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ef5350" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Sliding Limit Logs</text>
            </g>

            <!-- DynamoDB config registry -->
            <g class="interactive-node" id="db" transform="translate(420, 280)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">DynamoDB Rules</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Route Registries</text>
            </g>

            <!-- Cognito Auth -->
            <g class="interactive-node" id="s3" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#ab47bc" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#ab47bc" font-weight="700" text-anchor="middle">Cognito JWT</text>
            </g>

            <!-- Downstream Target -->
            <g class="interactive-node" id="target" transform="translate(680, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#10b981" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#10b981" font-weight="700" text-anchor="middle">Target Pods</text>
            </g>
        </svg>`;
    }

    canvasContainer.innerHTML = svgContent;
    setupInteractionListeners();
    updateNodeInspector();
}

// Bind Event Handlers to SVG Nodes
function setupInteractionListeners() {
    const nodes = document.querySelectorAll(".interactive-node");
    nodes.forEach(node => {
        // Highlight active state
        if (node.id === activeNode) {
            node.classList.add("selected");
            const rect = node.querySelector("rect");
            if (rect) rect.style.strokeWidth = "3px";
        }

        node.addEventListener("click", () => {
            // Remove previous selections
            nodes.forEach(n => {
                n.classList.remove("selected");
                const r = n.querySelector("rect");
                if (r) r.style.strokeWidth = "2px";
            });

            activeNode = node.id;
            node.classList.add("selected");
            const rect = node.querySelector("rect");
            if (rect) rect.style.strokeWidth = "3px";

            updateNodeInspector();
        });
    });
}

// Update Detail Tabs on Inspector Panel
function updateNodeInspector() {
    const system = systemData[currentSystem];
    const node = system.nodes[activeNode];

    if (!node) return;

    insCategory.innerText = node.category;
    insTitle.innerText = node.name;
    insDescription.innerText = node.description;
    insPayload.innerText = node.payload;
    insConfig.innerText = node.config;
}

// System Selector Toggles
document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
        btn.classList.add("active");
        
        currentSystem = btn.getAttribute("data-system");
        activeNode = "ingress";
        
        // Reset titles and descriptions
        systemTitle.innerText = systemData[currentSystem].title;
        systemDescription.innerText = systemData[currentSystem].description;

        renderSVG();
    });
});

// Simulation Toggle Controls
simulateBtn.addEventListener("click", () => {
    simulationActive = !simulationActive;
    if (simulationActive) {
        simulateBtn.innerText = "Pause Simulation";
        simulateBtn.classList.remove("stopped");
        indicator.classList.remove("stopped");
        indicatorText.innerText = "Simulating Active Traffic";
    } else {
        simulateBtn.innerText = "Start Simulation";
        simulateBtn.classList.add("stopped");
        indicator.classList.add("stopped");
        indicatorText.innerText = "Simulation Suspended";
    }
    renderSVG();
});

// Tab Navigation inside Inspector
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
        btn.classList.add("active");

        const targetTab = btn.getAttribute("data-tab");
        document.querySelectorAll(".tab-content").forEach(content => {
            content.classList.add("hidden");
        });

        if (targetTab === "payload") {
            document.getElementById("tab-payload").classList.remove("hidden");
        } else {
            document.getElementById("tab-config").classList.remove("hidden");
        }
    });
});

// Initial Invocations
simulateBtn.innerText = "Pause Simulation";
renderSVG();
