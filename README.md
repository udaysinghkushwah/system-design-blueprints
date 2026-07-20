# System Design Repository

This repository contains professional system design blueprints and documentation.

## 🗺️ Table of Contents

* [🍔 Food Delivery System Design](#1-food-delivery-system-design)
  * [🛠️ Tech Stack Details](#food-delivery-tech-stack-details)
  * [📐 Architecture Diagrams](#food-delivery-architecture-diagrams)
* [🤖 ChatGPT System Design](#2-chatgpt-system-design)
  * [🛠️ Tech Stack Details](#chatgpt-tech-stack-details)
  * [📐 Architecture Diagrams](#chatgpt-architecture-diagrams)
* [☕ Support](#support)

## Projects

### 1. Food Delivery System Design
A production-grade, end-to-end system design for a high-scale food delivery platform connecting Customers, Restaurants, and Delivery Partners.

* **Documentation:** [Food Delivery System Design (food_delivery_system_design.md)](./food_delivery_sd/food_delivery_system_design.md)
* **OpenAPI 3.0 API Spec:** [OpenAPI Contract (food_delivery_api_spec.yaml)](./food_delivery_sd/food_delivery_api_spec.yaml)
* **Local Mock API Server:** [Mock Python Server (mock_server.py)](./food_delivery_sd/mock_server.py) (run using `python3 food_delivery_sd/mock_server.py`)

#### Food Delivery Tech Stack Details (with AWS Service Mapping)
* **PostgreSQL (Amazon Aurora PostgreSQL):** Handles critical transactional order lifecycle, payment ledger logs, and user metadata. Configured with Aurora Global Database for multi-region active-passive failover under 1 minute.
* **MongoDB (Amazon DocumentDB):** Houses restaurant profiles and dynamic menus. The document-oriented layout stores complex nested categories and add-on lists in a single document, avoiding costly SQL joins on reads.
* **Redis (Amazon ElastiCache for Redis):** Manages real-time driver coordinates using in-memory geospatial indexes (`GEOADD` / `GEORADIUS`) and broadcasts live location updates to WebSocket servers via Redis Pub/Sub.
* **Elasticsearch (Amazon OpenSearch Service):** Drives food search, text keyword autocomplete, and geospatial listing queries (e.g., "nearby restaurants within 5km") with sub-20ms latencies.
* **Apache Cassandra (Amazon Keyspaces):** Serverless wide-column database that digests heavy location coordinate write-streams (25k writes/sec) from active riders, storing location logs partitioned by `(rider_id, date)`.
* **Apache Kafka (Amazon MSK):** Managed streaming cluster that decouples checkout and order placement services from background notification tasks and driver assignment loops.

#### Food Delivery Architecture Diagrams

##### A. High-Level System Architecture (Generic)
Overview of clients, gateway, microservices layer, message brokers, and databases.

![Food Delivery System Architecture](./food_delivery_sd/food_delivery_system_architecture_v2.png)

##### B. Real-Time Ingestion & Live Tracking Pipeline (Generic)
Visual flow of coordinates streamed from riders to Redis Geo (hot cache), Kafka, Cassandra (historical logs), and WebSocket push connections to tracking users.

![Food Delivery Live Tracking](./food_delivery_sd/food_delivery_live_tracking_v2.png)

##### C. Rider Matching & Dispatch Engine (Generic)
Visual explanation of the bipartite graph match loop using candidate discovery, multi-criteria weight functions (ETA, Travel Distance, Rating), and Hungarian Algorithm solvers.

![Food Delivery Rider Matching](./food_delivery_sd/food_delivery_rider_matching_v2.png)

##### D. AWS Cloud-Native System Architecture
Cloud-native deployment mapping microservices to Amazon EKS/ECS, databases to Aurora/DocumentDB, and streaming to Amazon MSK.

![Food Delivery AWS System Architecture](./food_delivery_sd/food_delivery_system_architecture_v3.png)

##### E. AWS-Native Live Ingestion & Tracking Pipeline
Live coordinate ingestion using AWS IoT Core or Network Load Balancer (NLB) to Amazon ElastiCache and Amazon Keyspaces (Cassandra).

![Food Delivery AWS Live Tracking](./food_delivery_sd/food_delivery_live_tracking_v3.png)

##### F. AWS-Native Rider Matching & Dispatch Engine
Matching engine workflow orchestrated on AWS, pulling orders from Amazon MSK and geolocations from Amazon ElastiCache.

![Food Delivery AWS Rider Matching](./food_delivery_sd/food_delivery_rider_matching_v3.png)

---

### 2. ChatGPT System Design
A production-grade system design for a real-time, low-latency conversational AI platform (LLM conversational system). Handles streaming tokens, active session memory, context window compression, and GPU inference routing.

* **Documentation:** [ChatGPT System Design (chatgpt_system_design.md)](./chat_gpt_sd/chatgpt_system_design.md)

#### ChatGPT Tech Stack Details (with AWS Service Mapping)
* **Server-Sent Events (ALB to ECS/EKS Streams):** Uses Application Load Balancers to support long-lived HTTP/2 chunked-transfer connections (SSE), pushing response tokens text-by-text to the client without API Gateway timeouts.
* **Apache Cassandra / DynamoDB (Amazon DynamoDB):** Stores conversational chat histories. DynamoDB handles billions of messages, partitioned by `session_id` and sorted by `created_at` for sub-10ms chronological reads.
* **Redis (Amazon ElastiCache for Redis):** Caches short-term active chat context windows and session state, letting the Query Orchestrator quickly compile conversation histories for LLM payloads.
* **Qdrant / pgvector (Amazon OpenSearch Service Vector Engine):** Indexes chunked vector embeddings using HNSW graphs for Retrieval-Augmented Generation (RAG), returning semantic search results within 10ms.
* **vLLM / Triton (Amazon EKS GPU Instances):** Model servers running on GPU-equipped EC2 instances (e.g., `p4d` or `p5` nodes with Nvidia A100/H100 GPUs) using tensor parallelism and PagedAttention to optimize throughput.

#### ChatGPT Architecture Diagrams

##### A. High-Level ChatGPT Architecture (Generic)
Overview of clients, gateway, Query Orchestrator, context engine, vector storage, and GPU cluster.

![ChatGPT System Architecture](./chat_gpt_sd/chatgpt_system_architecture.png)

##### B. Low-Latency Token Streaming & GPU Inference Flow (Generic)
Visual flow of HTTP/2 SSE streaming connections, Triton/vLLM batch queuing, and PagedAttention block cache partitioning.

![ChatGPT Token Streaming](./chat_gpt_sd/chatgpt_token_streaming.png)

##### C. RAG & Context Window Memory Pipeline (Generic)
Visual flow of document indexing, semantic nearest-neighbor vector search, conversation context windows, and secondary LLM summarization.

![ChatGPT RAG Context](./chat_gpt_sd/chatgpt_rag_context.png)

##### D. AWS Cloud-Native ChatGPT Architecture
Cloud-native deployment on AWS routing SSE streams through Application Load Balancers, RAG via OpenSearch Vector Engine, and inference on Amazon EKS GPU clusters.

![ChatGPT AWS System Architecture](./chat_gpt_sd/chatgpt_system_architecture_v2.png)

---

## Support

If you find these system design blueprints helpful, support my work by buying me a chai!

[![Buy Me A Chai](https://img.shields.io/badge/Buy%20Me%20a%20Chai-orange?style=for-the-badge&logo=coffee&logoColor=white)](https://www.buymeachai.in/toudaysinghkushwah)

---
*Updated on 2026-07-20*
