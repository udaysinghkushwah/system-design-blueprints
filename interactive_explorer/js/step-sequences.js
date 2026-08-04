/**
 * Step-by-Step Architecture Walkthrough Sequences for Interactive Explorer
 * Defines interactive sequence steps for each system architecture diagram.
 */

export const STEP_SEQUENCES = {
    url_shortener: [
        { nodeId: "ingress", step: 1, title: "Edge Routing & CDN Lookup", desc: "User clicks short URL. Route 53 routes request to CloudFront CDN which checks edge cache (<5ms)." },
        { nodeId: "proxy", step: 2, title: "Fargate Redirection Compute", desc: "Cache miss falls back to ECS Fargate microservices which validate short code token." },
        { nodeId: "redis", step: 3, title: "Redis Cache Lookup", desc: "Checks ElastiCache Redis (<1ms) for pre-warmed short code mapping." },
        { nodeId: "db", step: 4, title: "Aurora PostgreSQL Query", desc: "Cache miss queries Aurora PostgreSQL primary database using indexed short_code key." },
        { nodeId: "s3", step: 5, title: "Async Analytics Streaming", desc: "Redirect log event emitted asynchronously to Amazon MSK Kafka and Redshift OLAP data lake." }
    ],
    pastebin: [
        { nodeId: "ingress", step: 1, title: "Edge SSL Termination", desc: "User submits text paste or retrieves existing paste snippet via CloudFront & ALB." },
        { nodeId: "proxy", step: 2, title: "Fargate Read/Write Service", desc: "ECS Fargate tasks generate unique paste ID via Snowflake KGS or fetch paste content." },
        { nodeId: "redis", step: 3, title: "Redis Hot Paste Cache", desc: "Hot pastes served directly from ElastiCache Redis in <2ms." },
        { nodeId: "s3", step: 4, title: "S3 Object Store Persistence", desc: "Raw paste payload stored as immutable object in Amazon S3." }
    ],
    search_ranking: [
        { nodeId: "ingress", step: 1, title: "Search Request Ingress", desc: "Client sends query ('wireless headphones') + context payload via API Gateway (100k+ QPS)." },
        { nodeId: "proxy", step: 2, title: "Search Orchestrator Init", desc: "ECS Fargate Search Ranker initializes 4-stage funnel and sets sub-50ms P99 deadline." },
        { nodeId: "redis", step: 3, title: "Feature Hydration", desc: "Parallel fetch fetches user profile features from Redis (<2ms) & item metadata from DynamoDB." },
        { nodeId: "db", step: 4, title: "L1 Hybrid Retrieval", desc: "OpenSearch executes parallel BM25 sparse and HNSW vector KNN search merged via RRF (Top 1000)." },
        { nodeId: "sagemaker", step: 5, title: "L2 Pre-Rank & L3 Deep Rank", desc: "LightGBM filters down to 100 items; SageMaker GPU endpoint scores L3 Multi-Task pCTR/pCVR (Top 50)." },
        { nodeId: "proxy", step: 6, title: "L4 MMR Diversity & Response", desc: "MMR algorithm diversifies top 20 results by category/vendor and returns HTTP 200 JSON." }
    ],
    spell_checker: [
        { nodeId: "ingress", step: 1, title: "CDN Response Caching", desc: "CloudFront edge location checks hot correction cache for misspelled query string." },
        { nodeId: "proxy", step: 2, title: "Bloom Filter Fast Reject", desc: "In-pod Bloom Filter checks if word is spelled correctly (0.1ms)." },
        { nodeId: "proxy", step: 3, title: "BK-Tree Candidate Generation", desc: "BK-Tree searches Damerau-Levenshtein edit distance <= 2 candidates (4ms)." },
        { nodeId: "proxy", step: 4, title: "KenLM & BERT Re-ranking", desc: "KenLM 5-gram language model + BERT GPU endpoint calculates contextual probability score." },
        { nodeId: "redis", step: 5, title: "Redis Cache Update", desc: "Top correction suggestions cached in Redis for fast future lookups." }
    ],
    llm_gateway: [
        { nodeId: "ingress", step: 1, title: "WAF & API Gateway Ingress", desc: "Client request authenticated and rate-limited at edge API Gateway." },
        { nodeId: "proxy", step: 2, title: "Token Quotas & Routing", desc: "ECS Gateway checks user token quota and selects optimal model endpoint (OpenAI / SageMaker)." },
        { nodeId: "redis", step: 3, title: "Prompt Cache Check", desc: "Redis semantic prompt cache checks for identical cached responses (30% latency reduction)." },
        { nodeId: "sagemaker", step: 4, title: "Upstream Model Inference", desc: "Proxy streams tokens back to user via Server-Sent Events (SSE) while logging to Kafka." }
    ],
    rag_pipeline: [
        { nodeId: "ingress", step: 1, title: "User Query Ingest", desc: "User submits RAG prompt context to API Gateway." },
        { nodeId: "proxy", step: 2, title: "Query Embedding Generation", desc: "SageMaker bi-encoder generates 768-dim dense embedding for query." },
        { nodeId: "db", step: 3, title: "Vector Similarity Retrieval", desc: "OpenSearch Vector Engine retrieves Top-K relevant document chunks using HNSW." },
        { nodeId: "sagemaker", step: 4, title: "LLM Context Synthesis", desc: "Retrieved chunks + original prompt sent to LLM endpoint for grounded generation." }
    ],
    circuit_breaker: [
        { nodeId: "ingress", step: 1, title: "Client Service Call", desc: "Microservice invocations pass through Envoy sidecar proxy." },
        { nodeId: "proxy", step: 2, title: "Sliding Window Evaluation", desc: "Envoy evaluates rolling error rate (e.g. 50% threshold over 10s)." },
        { nodeId: "redis", step: 3, title: "State Machine Transition", desc: "Circuit state transitions from CLOSED -> OPEN -> HALF-OPEN stored in Redis." },
        { nodeId: "target", step: 4, title: "Fallback Execution", desc: "Tripped circuit returns fast fallback response without calling downstream backend." }
    ]
};
