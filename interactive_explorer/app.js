// System Blueprint Node Configurations & Interactive Inspector State Data
const systemData = {
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
                payload: `HTTP/2 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive`,
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
                payload: `SUBSCRIBE channel:stream:sess_1122
PUBLISH channel:stream:sess_1122 '{"token": " learning", "idx": 15}'`,
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
    vector_database: {
        title: "Distributed Vector Database",
        description: "Low-latency LSM-like segment space vector database. Optimizes HNSW index graphs using scalar quantization.",
        nodes: {
            "ingress": {
                name: "Application Load Balancer",
                category: "Networking",
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

    if (currentSystem === "llm_gateway") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" />
                    <stop offset="100%" stop-color="#1d4ed8" />
                </linearGradient>
                <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#a855f7" />
                    <stop offset="100%" stop-color="#6b21a8" />
                </linearGradient>
            </defs>

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
    } else if (currentSystem === "vector_database") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Vector Database Subnet)</text>

            <!-- Connections -->
            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 200" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Lines -->
            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 200" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#009688" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: ALB -->
            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">ALB</text>
            </g>

            <!-- Coordinator ECS (Proxy) -->
            <g class="interactive-node" id="ecs" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS proxy</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Coordinator Node</text>
            </g>

            <!-- Compute Shards EC2 -->
            <g class="interactive-node" id="ec2" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="130" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">EC2 Shard Pod</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Memory HNSW Graphs</text>
            </g>

            <!-- EBS WAL Storage -->
            <g class="interactive-node" id="ebs" transform="translate(420, 300)">
                <rect x="0" y="0" width="200" height="60" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="100" y="35" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">EBS gp3 Volume</text>
            </g>

            <!-- Snapshot S3 Backup -->
            <g class="interactive-node" id="s3" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#009688" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#009688" font-weight="700" text-anchor="middle">Amazon S3</text>
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
        
        // Reset default nodes for selection
        if (currentSystem === "llm_gateway") {
            activeNode = "ingress";
            systemTitle.innerText = "LLM Gateway Pipeline";
            systemDescription.innerText = "High-throughput proxy layer routing, auditing, and rate-limiting upstream LLM model transactions.";
        } else if (currentSystem === "semantic_search") {
            activeNode = "ingress";
            systemTitle.innerText = "Hybrid Semantic Search Engine";
            systemDescription.innerText = "Multi-stage vector retrieval, BM25 text keyword lookup, Reciprocal Rank Fusion, and Cross-Encoder reranking.";
        } else if (currentSystem === "token_streaming") {
            activeNode = "ingress";
            systemTitle.innerText = "Real-Time Token Streaming Engine";
            systemDescription.innerText = "Low-latency HTTP/2 Server-Sent Events broker. Bypasses load balancer connection timeouts to pipeline tokens dynamically.";
        } else if (currentSystem === "vector_database") {
            activeNode = "ingress";
            systemTitle.innerText = "Distributed Vector Database";
            systemDescription.innerText = "Low-latency LSM-like segment space vector database. Optimizes HNSW index graphs using scalar quantization.";
        }

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
