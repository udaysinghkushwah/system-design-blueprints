// System Blueprint Node Configurations & Interactive Inspector State Data
const systemData = {
    url_shortener: {
        title: "URL Shortener System",
        description: "High-scale unique link creation and fast redirection routing engine with multi-tier edge caching.",
        docLink: "viewer.html?file=level_1_core_system_design/url_shortener/url_shortener_system_design.md",
        techStack: [
            { service: "Amazon Aurora PostgreSQL", role: "Stores URL mappings with short_code as primary key for database-level uniqueness enforcement." },
            { service: "Amazon ElastiCache for Redis", role: "In-memory URL cache serving redirect lookups in < 1ms. Also used for rate limiting." },
            { service: "Amazon MSK (Kafka)", role: "Decouples the redirect hot path from analytics processing. Click events are buffered." },
            { service: "Amazon Redshift Serverless", role: "Column-oriented OLAP store for real-time click analytics and aggregations." },
            { service: "Amazon CloudFront", role: "Edge-caches redirect responses at 400+ global locations, absorbing 60%+ of read traffic." }
        ],
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
  enabled             = true
  default_cache_behavior {
    target_origin_id       = "ALBOrigin"
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
  launch_type     = "FARGATE"
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
  master_password         = "SuperSecurePass123!"
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
  extended_s3_configuration {
    bucket_arn = aws_s3_bucket.analytics_bucket.arn
    role_arn   = aws_iam_role.firehose_role.arn
  }
}`
            }
        }
    },
    pastebin: {
        title: "Pastebin Sharing Platform",
        description: "Metadata and file-separated storage engine supporting compressed content blobs and full-text discovery.",
        docLink: "viewer.html?file=level_1_core_system_design/pastebin/pastebin_system_design.md",
        techStack: [
            { service: "Amazon S3", role: "Content store for raw compressed paste content (zstd) with 11 nines durability." },
            { service: "Amazon Aurora PostgreSQL", role: "Stores lean paste metadata (~200 bytes/record). Partial indexes optimize expiry." },
            { service: "Amazon ElastiCache for Redis", role: "Three-tier cache storing metadata hashes, compressed content blobs, and pre-rendered HTML." },
            { service: "Amazon OpenSearch Service", role: "Full-text search over public paste titles and content snippets for discovery." },
            { service: "Amazon MSK (Kafka)", role: "Decouples read/write paths from async moderation scanning and view analytics." }
        ],
        nodes: {
            "ingress": {
                name: "CloudFront CDN Edge",
                category: "Networking & Edge",
                description: "Caches public paste content and checks syntax-highlighted HTML pages, keeping read latency under 5ms.",
                payload: `GET /raw/paste_99ab88\nHTTP/2 200 OK\nContent-Type: text/plain`,
                config: `resource "aws_cloudfront_distribution" "paste_cdn" {
  origin {
    domain_name = aws_s3_bucket.pastes_bucket.bucket_regional_domain_name
    origin_id   = "S3Origin"
  }
  enabled             = true
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Origin"
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
    viewer_protocol_policy = "redirect-to-https"
  }
}`
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
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"
  container_definitions = jsonencode([{
    name      = "paste-api"
    image     = "pastebin/api:latest"
    essential = true
    portMappings = [{ containerPort = 8080, hostPort = 8080 }]
  }])
}`
            },
            "redis": {
                name: "ElastiCache Redis Cache",
                category: "Database & Cache",
                description: "Multi-tier cache stores raw pastes, pre-compiled syntax highlighting sheets, and metadata index keys.",
                payload: `GET paste:meta:99ab88\n"{\\"title\\":\\"Log Output\\",\\"user_id\\":42}"`,
                config: `resource "aws_elasticache_replication_group" "paste_cache" {
  replication_group_id          = "pastebin-cache-group"
  description                   = "Active paste metadata and compiled syntax cache"
  node_type                     = "cache.r6g.large"
  num_cache_clusters            = 3
  port                          = 6379
  automatic_failover_enabled    = true
}`
            },
            "db": {
                name: "Aurora PostgreSQL DB",
                category: "Durable Metadata",
                description: "Houses paste records metadata (author, expiry, folder paths) with custom index parameters for scheduled expirations.",
                payload: `SELECT * FROM pastes WHERE expiry_time < NOW();`,
                config: `resource "aws_rds_cluster" "paste_db" {
  cluster_identifier      = "pastebin-metadata-db"
  engine                  = "aurora-postgresql"
  database_name           = "paste_metadata"
  master_username         = "admin"
  master_password         = "SecurePass123!"
  backup_retention_period = 7
}`
            },
            "s3": {
                name: "Amazon S3 Content Storage",
                category: "Object Vault",
                description: "Stores raw compressed (zstd) paste body blobs. Designed for infinite horizontal storage scale.",
                payload: `PUT /pastes/99ab88.zst (Size: 4.2 KB)`,
                config: `resource "aws_s3_bucket" "pastes_bucket" {
  bucket = "pastebin-raw-content"
  force_destroy = true
}`
            }
        }
    },
    file_storage: {
        title: "Distributed File Storage",
        description: "Scale-out block/file storage system separating control path (metadata) from high-throughput data path (blocks).",
        docLink: "viewer.html?file=level_1_core_system_design/file_storage/file_storage_system_design.md",
        techStack: [
            { service: "Amazon ECS Fargate", role: "Hosts the stateless Master Cluster managing namespace lookup, leasing, and block reports." },
            { service: "Amazon EC2 Auto Scaling", role: "Runs high-performance local NVMe storage nodes serving raw 64 MB block chunks." },
            { service: "Amazon DynamoDB", role: "Serves as the high-throughput transactional metadata registry for directory listings." },
            { service: "Amazon S3", role: "Serves as the backup/cold storage tier for archiving snapshot states." }
        ],
        nodes: {
            "ingress": {
                name: "Network Load Balancer (NLB)",
                category: "Networking Layer",
                description: "Distributes TCP client connections to control plane or high-throughput storage instances.",
                payload: `TCP Connection Ingress\nLayer 4 TCP forward\nPort 9000 (Data Plane) / Port 8080 (Control Plane)`,
                config: `resource "aws_lb" "storage_nlb" {
  name               = "file-storage-nlb"
  load_balancer_type = "network"
  subnets            = aws_subnet.public.*.id
}`
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
                config: `resource "aws_ecs_service" "master_service" {
  name            = "storage-master-controller"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.master_task.arn
  desired_count   = 3
  launch_type     = "FARGATE"
}`
            },
            "ec2": {
                name: "EC2 NVMe Chunk Servers",
                category: "Data Plane Compute",
                description: "High-performance EC2 instance clusters hosting NVMe SSDs. Receives, replicates, and serves raw 64 MB block chunks.",
                payload: `WRITE_BLOCK block_12 (size: 64MB)\nPipeline Replication -> ChunkServer_B -> ChunkServer_C`,
                config: `resource "aws_instance" "chunk_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "i3en.2xlarge"
  subnet_id     = aws_subnet.private[0].id
  ebs_block_device {
    device_name = "/dev/sdb"
    volume_size = 2000
    volume_type = "gp3"
  }
}`
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
  attribute {
    name = "path_uuid"
    type = "S"
  }
}`
            }
        }
    },
    food_delivery: {
        title: "Food Delivery Architecture",
        description: "Scalable geospatial ingestion and order matchmaking engines connecting users, kitchens, and riders.",
        docLink: "viewer.html?file=level_4_ride_sharing_delivery/food_delivery/food_delivery_system_design.md",
        techStack: [
            { service: "Amazon Aurora PostgreSQL", role: "Handles critical transactional order lifecycle, payment ledger logs, and user metadata." },
            { service: "Amazon DocumentDB", role: "Houses restaurant profiles and dynamic menus in a single document layout, avoiding SQL joins." },
            { service: "Amazon ElastiCache for Redis", role: "Manages real-time driver coordinates using in-memory geospatial indexes and broadcasts updates." },
            { service: "Amazon OpenSearch Service", role: "Drives food search, text keyword autocomplete, and geospatial listing queries near user." },
            { service: "Amazon Keyspaces (Cassandra)", role: "Serverless wide-column DB digesting heavy location coordinate write-streams from riders." },
            { service: "Amazon MSK (Kafka)", role: "Decouples checkout and order placement services from background notification tasks." }
        ],
        nodes: {
            "ingress": {
                name: "Application Load Balancer",
                category: "Networking Ingress",
                description: "Routes client REST requests, restaurant webhooks, and rider telemetry streams.",
                payload: `POST /api/v1/orders/checkout\nAuthorization: Bearer jwt_rider_token`,
                config: `resource "aws_lb" "food_alb" {
  name               = "food-delivery-alb"
  load_balancer_type = "application"
  subnets            = aws_subnet.public.*.id
}`
            },
            "proxy": {
                name: "ECS Fargate (Core Microservices)",
                category: "Compute Clusters",
                description: "Hosts the Order, Restaurant, Delivery, and Dispatch engines coordinating matchmaking queries.",
                payload: `{
  "order_id": "ord_884",
  "matching_status": "searching_rider"
}`,
                config: `resource "aws_ecs_service" "food_services" {
  name            = "order-dispatch-service"
  cluster         = aws_ecs_cluster.food_cluster.id
  task_definition = aws_ecs_task_definition.food_task.arn
  desired_count   = 8
}`
            },
            "redis": {
                name: "ElastiCache Redis Geospatial",
                category: "Geospatial In-Memory Engine",
                description: "Stores live rider coordinate records. Triggers rapid queries to locate closest riders inside a 5km radius.",
                payload: `GEORADIUS active_riders 72.87 19.07 5 km`,
                config: `resource "aws_elasticache_cluster" "geo_redis" {
  cluster_id           = "rider-locations-cache"
  node_type            = "cache.m6g.xlarge"
  num_cache_nodes      = 4
  port                 = 6379
  parameter_group_name = "default.redis7"
}`
            },
            "db": {
                name: "Aurora PostgreSQL Transactional",
                category: "Durable Orders database",
                description: "Transactional DB mapping orders, checkout records, payment authorizations, and ledger updates.",
                payload: `INSERT INTO order_ledgers (order_id, amount, status) VALUES ('ord_884', 24.50, 'authorized');`,
                config: `resource "aws_rds_cluster" "food_postgres" {
  cluster_identifier      = "food-orders-db"
  engine                  = "aurora-postgresql"
  database_name           = "food_orders"
  master_username         = "delivery_admin"
}`
            },
            "keyspaces": {
                name: "Keyspaces (Cassandra Cluster)",
                category: "Rider Telemetry logger",
                description: "Managed Cassandra storage. Ingests heavy raw rider location coordinates updates (25k writes/sec).",
                payload: `INSERT INTO rider_tracks (rider_id, lat, lng, time) VALUES ('r_42', 19.07, 72.87, 1784643600);`,
                config: `resource "aws_keyspaces_table" "telemetry" {
  keyspace_name = "rider_telemetry"
  table_name    = "rider_tracks"
  schema_definition {
    partition_key { name = "rider_id" }
    clustering_key { name = "time"; order = "ASC" }
    column { name = "rider_id"; type = "ascii" }
    column { name = "time"; type = "timestamp" }
    column { name = "lat"; type = "double" }
    column { name = "lng"; type = "double" }
  }
}`
            }
        }
    },
    dropbox: {
        title: "Dropbox Cloud Synchronization",
        description: "Delta synchronization storage system resolving conflicts at block-level via global hashes indexing.",
        docLink: "viewer.html?file=level_1_core_system_design/dropbox/dropbox_system_design.md",
        techStack: [
            { service: "Amazon ECS Fargate", role: "Hosts the metadata and block ingest orchestration tasks." },
            { service: "Amazon S3 Buckets", role: "Provides high-durability object storage for blocks. Standard lifecycles archive versions." },
            { service: "Amazon Aurora PostgreSQL", role: "Tracks directory namespaces and versions map under serializable transaction isolates." },
            { service: "Amazon ElastiCache for Redis", role: "Indexes block hashes to coordinate low-latency dedupe checks." }
        ],
        nodes: {
            "ingress": {
                name: "Network Load Balancer (NLB)",
                category: "Networking Ingress",
                description: "Routes client file uploads and persistent WebSocket notification streams.",
                payload: `WebSocket Connection Ingress\nStream check-ins`,
                config: `resource "aws_lb" "dropbox_nlb" {
  name               = "dropbox-sync-nlb"
  load_balancer_type = "network"
  subnets            = aws_subnet.public.*.id
}`
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
                config: `resource "aws_ecs_service" "sync_workers" {
  name            = "sync-orchestrator"
  cluster         = aws_ecs_cluster.sync_cluster.id
  task_definition = aws_ecs_task_definition.sync_task.arn
  desired_count   = 6
}`
            },
            "redis": {
                name: "ElastiCache Redis Hash Registry",
                category: "Database & Cache",
                description: "Maintains a memory index registry of all unique block hashes for low-latency dedupe checks.",
                payload: `HEXISTS block_hashes SHA256_HASH_BLOCK_H2\n(integer) 0`,
                config: `resource "aws_elasticache_replication_group" "hash_registry" {
  replication_group_id = "dedupe-hash-cache"
  node_type            = "cache.r6g.xlarge"
  num_cache_clusters   = 3
  port                 = 6379
}`
            },
            "db": {
                name: "Amazon Aurora PostgreSQL",
                category: "Metadata Namespaces Store",
                description: "Tracks directory namespaces, file-to-block maps, and file version revisions.",
                payload: `SELECT * FROM file_chunks WHERE file_id = 'file_123' AND version_number = 3;`,
                config: `resource "aws_rds_cluster" "namespaces_db" {
  cluster_identifier = "dropbox-namespaces-db"
  engine             = "aurora-postgresql"
  database_name      = "dropbox_meta"
}`
            },
            "s3": {
                name: "Amazon S3 Object Vault",
                category: "Durable Block Store",
                description: "Holds all unique data block objects, configured with Glacier lifecycle policies for version archive cleanup.",
                payload: `PUT /dropbox-blocks/SHA256_HASH_BLOCK_H2`,
                config: `resource "aws_s3_bucket_lifecycle_configuration" "blocks_lifecycle" {
  bucket = aws_s3_bucket.blocks_bucket.id
  rule {
    id     = "archive-old-blocks"
    status = "Enabled"
    transition {
      days          = 30
      storage_class = "GLACIER"
    }
  }
}`
            }
        }
    },
    parking_lot: {
        title: "Smart Parking Lot Engine",
        description: "IoT-enabled parking slot allocation, sensor telemetry processor, and billing ledger tracker.",
        docLink: "viewer.html?file=level_1_core_system_design/parking_lot/parking_lot_system_design.md",
        techStack: [
            { service: "AWS IoT Core", role: "Directs lightweight MQTT state updates from bay sensors." },
            { service: "AWS Lambda", role: "Processes raw sensor signals and updates Redis geospatial availability caches." },
            { service: "Amazon ECS Fargate", role: "Hosts the Rest API routing spot allocations for entry/exit gates." },
            { service: "Amazon ElastiCache for Redis", role: "Indexes vacant spots as geospatial metrics for rapid radial vacancy lookups." },
            { service: "Amazon Aurora PostgreSQL", role: "Implements ticket ledgers and invoice bookings under optimistic transaction checks." }
        ],
        nodes: {
            "ingress": {
                name: "API Gateway & AWS IoT Core",
                category: "IoT Ingress & API Gateway",
                description: "API Gateway ingests entry/exit ALPR camera scans. AWS IoT Core establishes lightweight MQTT loops with bay sensors.",
                payload: `MQTT TOPIC: /sensors/bay_12/status\n{"occupied": true, "timestamp": 1784643600}`,
                config: `resource "aws_iot_topic_rule" "sensor_rule" {
  name        = "process_parking_sensors"
  sql         = "SELECT * FROM '/sensors/+/status'"
  sql_version = "2016-03-23"
  lambda {
    function_arn = aws_lambda_function.ingest_worker.arn
  }
}`
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
                config: `resource "aws_ecs_service" "alloc_engine" {
  name            = "parking-allocator"
  cluster         = aws_ecs_cluster.parking_cluster.id
  task_definition = aws_ecs_task_definition.alloc_task.arn
  desired_count   = 3
}`
            },
            "redis": {
                name: "ElastiCache Redis Vacancies Map",
                category: "Database & Cache",
                description: "Fast in-memory cache tracking available spots by type and geohash coordinates.",
                payload: `GEORADIUS vacant_ev_spots -73.93 40.73 200 m`,
                config: `resource "aws_elasticache_replication_group" "occupancy_grid" {
  replication_group_id = "parking-occupancy-grid"
  node_type            = "cache.t4g.medium"
  num_cache_clusters   = 2
}`
            },
            "db": {
                name: "Amazon Aurora PostgreSQL",
                category: "Durable Billing Ledger",
                description: "Records parking ticket sessions, pricing scales, payments, and invoice ledger logs.",
                payload: `UPDATE parking_spots SET status = 'RESERVED', version = version + 1 WHERE spot_id = 'spot_104' AND version = 3;`,
                config: `resource "aws_rds_cluster" "parking_db" {
  cluster_identifier = "parking-lot-ledger-db"
  engine             = "aurora-postgresql"
  database_name      = "parking_ledger"
}`
            }
        }
    },
    library_management: {
        title: "Smart Library Management System",
        description: "Multi-branch catalog search engine, optimistic barcode checkout allocator, and hold queue reservation system.",
        docLink: "viewer.html?file=level_1_core_system_design/library_management/library_management_system_design.md",
        techStack: [
            { service: "Amazon API Gateway", role: "Handles JWT authentication, rate limiting, and kiosk REST endpoints." },
            { service: "Amazon OpenSearch Service", role: "Powers full-text fuzzy title, author, and category catalog searches." },
            { service: "Amazon ECS Fargate", role: "Deploys microservices for checkouts, returns, and hold reservation queues." },
            { service: "Amazon ElastiCache for Redis", role: "Caches real-time book availability and manages FIFO hold reservation sorted sets." },
            { service: "Amazon Aurora PostgreSQL", role: "Serves as the durable relational ledger for checkouts, member balances, and OCC versioning." }
        ],
        nodes: {
            "ingress": {
                name: "API Gateway & Edge Kiosks",
                category: "API Gateway & Kiosk Ingress",
                description: "Ingests barcode checkout scans, return chute scans, and member mobile app catalog queries.",
                payload: `POST /api/v1/checkouts\n{\n  "barcode_id": "BARCODE-CS-90123",\n  "member_id": "4a716550-0000-41d4-a716-446655440000"\n}`,
                config: `resource "aws_api_gateway_rest_api" "library_api" {\n  name        = "library-management-api"\n  description = "Ingress for branch kiosks and member app"\n}`
            },
            "opensearch": {
                name: "Amazon OpenSearch Cluster",
                category: "Catalog Search Engine",
                description: "Inverted index for sub-50ms full-text catalog queries on ISBNs, titles, authors, and subject tags.",
                payload: `GET /api/v1/catalog/search?query=distributed+systems\n{"total_hits": 42}`,
                config: `resource "aws_opensearch_domain" "catalog_search" {\n  domain_name    = "library-catalog-index"\n  engine_version = "OpenSearch_2.11"\n  cluster_config {\n    instance_type = "r6g.large.search"\n  }\n}`
            },
            "proxy": {
                name: "ECS Fargate Microservices",
                category: "Compute Engine",
                description: "Processes checkout validation, OCC database updates, fine calculations, and queue triggers.",
                payload: `UPDATE book_items SET status = 'CHECKED_OUT', version = version + 1 WHERE barcode_id = 'BARCODE-CS-90123' AND version = 4;`,
                config: `resource "aws_ecs_service" "borrowing_service" {\n  name            = "library-borrowing-engine"\n  cluster         = aws_ecs_cluster.library_cluster.id\n  task_definition = aws_ecs_task_definition.borrowing_task.arn\n  desired_count   = 3\n}`
            },
            "redis": {
                name: "ElastiCache Redis Hold Queue",
                category: "Cache & Hold Queue",
                description: "Manages real-time availability counters and FIFO sorted sets (ZADD/ZPOPMIN) for ISBN reservations.",
                payload: `ZADD hold:isbn:9871449373320 1784643600 "member_uuid_8877"`,
                config: `resource "aws_elasticache_cluster" "hold_queue_cache" {\n  cluster_id           = "library-hold-queue-cache"\n  engine               = "redis"\n  node_type            = "cache.t4g.medium"\n  num_cache_nodes      = 1\n}`
            },
            "db": {
                name: "Amazon Aurora PostgreSQL",
                category: "Durable Ledger",
                description: "ACID-compliant SQL database for books metadata, physical items, members, checkouts, and fines.",
                payload: `INSERT INTO checkouts (barcode_id, member_id, due_date) VALUES ('BARCODE-CS-90123', 'member_uuid', NOW() + INTERVAL '14 days');`,
                config: `resource "aws_rds_cluster" "library_db" {\n  cluster_identifier = "library-management-db"\n  engine             = "aurora-postgresql"\n  database_name      = "library_ledger"\n}`
            }
        }
    },
    atm_system: {
        title: "Automated Teller Machine (ATM) System",
        description: "ISO 8583 financial switch, CloudHSM PIN decryption, Saga 2PC withdrawal engine, and Redis cassette inventory tracker.",
        docLink: "viewer.html?file=level_1_core_system_design/atm/atm_system_design.md",
        techStack: [
            { service: "AWS Network Load Balancer (NLB)", role: "High-throughput TCP socket load balancer handling 50,000+ persistent ATM terminal links." },
            { service: "AWS CloudHSM Cluster", role: "FIPS 140-2 Level 3 dedicated hardware security module for DUKPT PIN block decryption." },
            { service: "Amazon ECS Fargate", role: "Hosts containerized ISO 8583 message switch services and Saga Transaction Orchestrators." },
            { service: "Amazon ElastiCache for Redis", role: "Tracks real-time bill counts per cassette slot and executes greedy/DP note allocation routines." },
            { service: "Amazon Aurora PostgreSQL", role: "Serves as the durable system of record for customer accounts, balances, and Saga ledgers." }
        ],
        nodes: {
            "ingress": {
                name: "Network Load Balancer & ATM Switch",
                category: "NLB & ISO 8583 Switch Ingress",
                description: "Ingests encrypted ISO 8583 binary transaction streams from physical ATM terminals over secure TCP sockets.",
                payload: `ISO 8583 MTI: 0200 (Financial Request)\n{\n  "terminal_code": "ATM-NY-90210",\n  "amount_cents": 13000,\n  "pin_block_encrypted": "9F1A2B3C4D5E6F708192A3B4C5D6E7F8"\n}`,
                config: `resource "aws_lb" "atm_nlb" {\n  name               = "atm-switch-nlb"\n  load_balancer_type = "network"\n  internal           = false\n}`
            },
            "cloudhsm": {
                name: "AWS CloudHSM Cluster",
                category: "Hardware Security Module",
                description: "Dedicated hardware cluster performing hardware-level DUKPT PIN decryption and PIN Block validation.",
                payload: `HSM_VERIFY_PIN_BLOCK(pin_block="9F1A2B3C", ksn="9876543210") => STATUS: VALID`,
                config: `resource "aws_cloudhsm_v2_cluster" "atm_hsm" {\n  hsm_type   = "hsm1.medium"\n  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]\n}`
            },
            "proxy": {
                name: "ECS Fargate (Saga Coordinator)",
                category: "Compute & Transaction Core",
                description: "Orchestrates Saga Two-Phase Commit withdrawals, account holds, hardware jam compensation, and funds debits.",
                payload: `EXECUTE SAGA: Reserve Account Balance ($130) -> Reserve Cassette Bills (1x $100, 1x $20, 1x $10) -> Confirm Dispense -> Commit Debit`,
                config: `resource "aws_ecs_service" "saga_coordinator" {\n  name            = "atm-saga-coordinator"\n  cluster         = aws_ecs_cluster.atm_cluster.id\n  task_definition = aws_ecs_task_definition.saga_task.arn\n  desired_count   = 4\n}`
            },
            "redis": {
                name: "ElastiCache Redis Cassette Inventory",
                category: "Cache & Cassette Tracking",
                description: "Holds real-time note counts for $10, $20, $50, and $100 cassette slots; runs bill allocation routines.",
                payload: `HGETALL atm:cassettes:ATM-NY-90210 => {"slot_1_100": 450, "slot_2_50": 120, "slot_3_20": 800, "slot_4_10": 950}`,
                config: `resource "aws_elasticache_cluster" "cassette_cache" {\n  cluster_id           = "atm-cassette-inventory"\n  engine               = "redis"\n  node_type            = "cache.t4g.medium"\n  num_cache_nodes      = 1\n}`
            },
            "db": {
                name: "Amazon Aurora PostgreSQL",
                category: "Durable CBS Ledger",
                description: "ACID system of record for account balances, held funds, daily limits, and transaction audit ledgers.",
                payload: `UPDATE accounts SET balance_cents = balance_cents - 13000, version = version + 1 WHERE account_number = 'ACC-99881122' AND version = 5;`,
                config: `resource "aws_rds_cluster" "cbs_ledger_db" {\n  cluster_identifier = "atm-cbs-ledger-db"\n  engine             = "aurora-postgresql"\n  database_name      = "cbs_ledger"\n}`
            }
        }
    },
    elevator_system: {
        title: "Smart Multi-Elevator Control System",
        description: "Destination Dispatch System (DDS), Minimum ETA scheduling math, 10 Hz MQTT telemetry ingestion, and Redis min-heap priority queues.",
        docLink: "viewer.html?file=level_1_core_system_design/elevator_system/elevator_system_design.md",
        techStack: [
            { service: "AWS IoT Core", role: "Managed MQTT broker handling sub-100ms 10 Hz real-time telemetry streaming from 24+ elevator cars." },
            { service: "Amazon API Gateway", role: "HTTPS/gRPC REST API ingress for lobby destination kiosks and mobile elevator request endpoints." },
            { service: "AWS ECS Fargate", role: "Deploys containerized Destination Dispatch Engine microservices running Minimum ETA calculation algorithms." },
            { service: "Amazon ElastiCache for Redis", role: "Sub-millisecond in-memory cache holding real-time car state grids, min-heap stop priority queues, and atomic locks." },
            { service: "Amazon Aurora PostgreSQL", role: "Relational database for elevator car registries, passenger trip audit logs, and maintenance schedules." }
        ],
        nodes: {
            "ingress": {
                name: "Lobby Kiosks & API Gateway",
                category: "Kiosk REST & gRPC Ingress",
                description: "Ingests passenger destination floor requests (e.g. Lobby -> Floor 45) and displays assigned car labels (e.g. Elevator B).",
                payload: `POST /api/v1/dispatch/request\n{\n  "kiosk_id": "kiosk_lobby_north_02",\n  "source_floor": 1,\n  "destination_floor": 45\n}`,
                config: `resource "aws_api_gateway_rest_api" "elevator_api" {\n  name        = "elevator-dispatch-api"\n  description = "Ingress for lobby kiosks and mobile app"\n}`
            },
            "mqtt": {
                name: "AWS IoT Core (MQTT Broker)",
                category: "IoT Telemetry Ingress",
                description: "Maintains persistent TCP/TLS MQTT sessions for 24+ elevator car PLCs publishing 10 Hz telemetry metrics.",
                payload: `TOPIC: building/bank1/elevator/2/telemetry\n{\n  "car_number": 2,\n  "current_floor": 14,\n  "direction": "UP",\n  "state": "MOVING",\n  "weight_kg": 640.0\n}`,
                config: `resource "aws_iot_topic_rule" "telemetry_rule" {\n  name        = "ElevatorTelemetryIngest"\n  sql         = "SELECT * FROM 'building/+/elevator/+/telemetry'"\n  sql_version = "2016-03-23"\n}`
            },
            "proxy": {
                name: "ECS Fargate (Dispatch Engine)",
                category: "Minimum ETA Scheduler",
                description: "Executes Minimum ETA cost function J(c) considering car travel time, door cycles, weight penalties, and direction alignment.",
                payload: `J(c) = ETA_wait(c) + ETA_travel(c) + W_load(c) + P_dir(c) => Selected Car B (Wait: 14.5s)`,
                config: `resource "aws_ecs_service" "dispatch_engine" {\n  name            = "elevator-dispatch-engine"\n  cluster         = aws_ecs_cluster.elevator_cluster.id\n  task_definition = aws_ecs_task_definition.dispatch_task.arn\n  desired_count   = 3\n}`
            },
            "redis": {
                name: "ElastiCache Redis Priority Queues",
                category: "Cache & Stop Queues",
                description: "Holds real-time car state hash grid (\`elevator:{id}:state\`) and sorted ZSET min-heap stop queues (\`up_stops\`, \`down_stops\`).",
                payload: `ZADD elevator:car_b:up_stops 1 1\nZADD elevator:car_b:up_stops 45 45`,
                config: `resource "aws_elasticache_cluster" "elevator_state_grid" {\n  cluster_id           = "elevator-state-grid"\n  engine               = "redis"\n  node_type            = "cache.t4g.medium"\n  num_cache_nodes      = 1\n}`
            },
            "db": {
                name: "Amazon Aurora PostgreSQL",
                category: "Durable System Ledger",
                description: "Relational database for elevator master registry, trip audit records, and maintenance logs.",
                payload: `INSERT INTO dispatch_requests (kiosk_id, source_floor, destination_floor, assigned_car_id) VALUES ('kiosk_02', 1, 45, 'car_b_uuid');`,
                config: `resource "aws_rds_cluster" "elevator_db" {\n  cluster_identifier = "elevator-control-db"\n  engine             = "aurora-postgresql"\n  database_name      = "elevator_system"\n}`
            }
        }
    },
    hotel_booking: {
        title: "Global Hotel Booking System",
        description: "Geohash spatial search, 10-minute temporary room hold locks, OCC double-booking prevention, and Saga 2PC payment orchestrator.",
        docLink: "viewer.html?file=level_1_core_system_design/hotel_booking/hotel_booking_system_design.md",
        techStack: [
            { service: "Amazon CloudFront + WAF", role: "Global CDN asset caching and Web Application Firewall DDoS protection." },
            { service: "Amazon API Gateway", role: "HTTPS REST API router, JWT authorization, and rate limiting." },
            { service: "Amazon OpenSearch Service", role: "Sub-50ms geohash spatial indexing and full-text hotel search." },
            { service: "AWS ECS Fargate", role: "Deploys containerized Search, Inventory Hold Engine, and Saga Payment microservices." },
            { service: "Amazon ElastiCache for Redis", role: "Stores 10-minute temporary room hold locks, geohashes, and availability grids." },
            { service: "Amazon Aurora PostgreSQL", role: "Multi-AZ relational database guaranteeing ACID room inventory updates via Optimistic Concurrency Control." }
        ],
        nodes: {
            "ingress": {
                name: "CloudFront & API Gateway",
                category: "CDN & REST Ingress",
                description: "Ingests global hotel search requests and checkout room hold calls with WAF filtering.",
                payload: `GET /api/v1/hotels/search?city=NewYork&check_in=2026-10-15&check_out=2026-10-18`,
                config: `resource "aws_api_gateway_rest_api" "hotel_api" {\n  name        = "hotel-booking-api"\n  description = "Ingress for global hotel booking app"\n}`
            },
            "opensearch": {
                name: "Amazon OpenSearch Cluster",
                category: "Spatial Hotel Search Engine",
                description: "Geohash spatial index for sub-50ms radial searches (e.g. hotels within 5km of city center).",
                payload: `GET /hotels/_search\n{\n  "query": {\n    "geo_bounding_box": {\n      "pin.location": {\n        "top_left": "dr5reg",\n        "bottom_right": "dr5ru7"\n      }\n    }\n  }\n}`,
                config: `resource "aws_opensearch_domain" "hotel_search_domain" {\n  domain_name    = "hotel-spatial-index"\n  engine_version = "OpenSearch_2.11"\n}`
            },
            "proxy": {
                name: "ECS Fargate (Hold & Saga Engine)",
                category: "Inventory & Payment Core",
                description: "Manages 10-minute TTL hold locks, executes Saga 2PC transactions, and enforces OCC versioning.",
                payload: `EXECUTE SAGA: Issue 10m Hold -> Process Payment -> OCC Commit (version = version + 1)`,
                config: `resource "aws_ecs_service" "inventory_hold_engine" {\n  name            = "hotel-inventory-hold-service"\n  cluster         = aws_ecs_cluster.hotel_cluster.id\n  task_definition = aws_ecs_task_definition.hold_task.arn\n  desired_count   = 4\n}`
            },
            "redis": {
                name: "ElastiCache Redis Hold Locks",
                category: "Distributed Hold Cache",
                description: "Stores 10-minute TTL room hold keys (`hold:{res_id}`) and cached availability grid snapshots.",
                payload: `SET hold:res_77665544 "user_88771122" EX 600 NX`,
                config: `resource "aws_elasticache_replication_group" "hold_lock_grid" {\n  replication_group_id = "hotel-hold-lock-grid"\n  node_type            = "cache.t4g.medium"\n  num_cache_clusters   = 2\n}`
            },
            "db": {
                name: "Amazon Aurora PostgreSQL",
                category: "Durable Room Inventory Grid",
                description: "Master SQL ledger tracking daily room inventory records, OCC version tags, and confirmed bookings.",
                payload: `UPDATE room_inventory SET reserved_rooms = reserved_rooms + 1, version = version + 1 WHERE hotel_id = 'h_90210' AND version = 14;`,
                config: `resource "aws_rds_cluster" "hotel_db" {\n  cluster_identifier = "hotel-inventory-db"\n  engine             = "aurora-postgresql"\n  database_name      = "hotel_reservation"\n}`
            }
        }
    },
    rag_pipeline: {
        title: "RAG Pipeline Engine",
        description: "Unified ingestion and dense/sparse retrieval pipeline with cross-encoder reranking.",
        docLink: "viewer.html?file=level_7_ai_systems/rag_pipeline/rag_pipeline_system_design.md",
        techStack: [
            { service: "Amazon OpenSearch Serverless", role: "HNSW-indexed vector search over 10M+ chunks with metadata filtering and scalar quantization." },
            { service: "Amazon OpenSearch Service", role: "BM25 sparse keyword search for exact-match retrieval, combined with dense search via RRF." },
            { service: "Amazon SageMaker", role: "Hosts cross-encoder model to re-score top-50 candidates for 10–20% higher accuracy." },
            { service: "Amazon Bedrock Titan", role: "Managed embedding API for batch document indexing and real-time query embedding." },
            { service: "Amazon Bedrock Claude/Titan", role: "Managed LLM inference with SSE streaming. Supports augmented prompts and citations." }
        ],
        nodes: {
            "ingress": {
                name: "Application Load Balancer",
                category: "Networking Ingress",
                description: "Distributes incoming client text query streams to the query orchestrator pods.",
                payload: `POST /v1/search\n{"query": "distributed consensus systems"}`,
                config: `resource "aws_lb" "rag_alb" {
  name               = "rag-query-alb"
  load_balancer_type = "application"
  subnets            = aws_subnet.public.*.id
}`
            },
            "proxy": {
                name: "ECS Fargate (Query Orchestrator)",
                category: "Compute Tier",
                description: "Coordinates query lookup, calls OpenSearch dense/sparse search, executes RRF fusion, and calls Bedrock for generation.",
                payload: `{
  "query": "distributed consensus",
  "top_opensearch_candidates": 50
}`,
                config: `resource "aws_ecs_service" "rag_orchestrator" {
  name            = "rag-query-orchestrator"
  cluster         = aws_ecs_cluster.rag_cluster.id
  task_definition = aws_ecs_task_definition.orchestrator_task.arn
  desired_count   = 4
}`
            },
            "opensearch": {
                name: "Amazon OpenSearch Cluster",
                category: "Search Database",
                description: "Unified vector space database. Houses HNSW index graph shards for dense cosine checks and traditional BM25 inverted indices.",
                payload: `{
  "dense_scores": [0.912, 0.844],
  "sparse_scores": [15.22, 11.08]
}`,
                config: `resource "aws_opensearch_domain" "rag_os" {
  domain_name    = "rag-embeddings-store"
  engine_version = "OpenSearch_2.11"
  cluster_config {
    instance_type  = "r6g.large.search"
    instance_count = 2
  }
}`
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
                config: `resource "aws_sagemaker_endpoint" "reranker" {
  name                 = "rag-cross-encoder-reranker"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.rerank_config.name
}`
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
                config: `resource "aws_iam_policy" "bedrock_access" {
  name   = "bedrock-invoke-model-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "bedrock:InvokeModel"
      Resource = "arn:aws:bedrock:*::foundation-model/*"
    }]
  })
}`
            }
        }
    },
    vector_database: {
        title: "Distributed Vector Database",
        description: "Low-latency LSM-like segment space vector database. Optimizes HNSW index graphs using scalar quantization.",
        docLink: "viewer.html?file=level_7_ai_systems/vector_database/vector_database_system_design.md",
        techStack: [
            { service: "Amazon EC2 (r6g nodes)", role: "Holds the active in-memory HNSW index structures and executes vector calculations." },
            { service: "Amazon EBS (gp3)", role: "Provides fast local storage for sequential Write-Ahead Log (WAL) commits." },
            { service: "Amazon ECS Fargate", role: "Hosts the stateless Proxy Coordination Cluster managing schemas, shards, and gather queries." },
            { service: "Amazon S3", role: "Serves as the backup snapshot registry for archiving segment indexes." }
        ],
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
                config: `resource "aws_instance" "shard_node" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "r6g.xlarge"
  subnet_id     = aws_subnet.private[0].id
}`
            },
            "ebs": {
                name: "Amazon EBS gp3 Volume",
                category: "Database Storage",
                description: "Durable Write-Ahead Log SSD. Persists newly inserted vectors immediately before compiling index memory segments.",
                payload: `Append record log:\n[TX_142] Collection: my_vectors | UUID: p_99 | Data: float32[768]`,
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
        docLink: "viewer.html?file=level_7_ai_systems/chat_gpt/chatgpt_system_design.md",
        techStack: [
            { service: "Application Load Balancer (ALB)", role: "Supports long-lived HTTP/2 chunked-transfer connections (SSE), pushing response tokens." },
            { service: "Amazon DynamoDB", role: "Stores chat histories, partitioned by session_id and sorted by created_at for sub-10ms reads." },
            { service: "Amazon ElastiCache for Redis", role: "Caches short-term active chat context windows and session state." },
            { service: "Amazon OpenSearch Vector Engine", role: "Indexes chunked vector embeddings using HNSW graphs for Retrieval-Augmented Generation." },
            { service: "Amazon EKS GPU Instances", role: "Runs model servers (vLLM/Triton) on GPU instances (p4d/p5) using tensor parallelism." }
        ],
        nodes: {
            "ingress": {
                name: "Application Load Balancer",
                category: "Networking Ingress",
                description: "Maintains persistent HTTP/2 connection tunnels to client devices, streaming text completions text-by-text.",
                payload: `HTTP/2 200 OK\nContent-Type: text/event-stream\nTransfer-Encoding: chunked`,
                config: `resource "aws_lb_listener" "http2_sse" {
  load_balancer_arn = aws_lb.chat_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.cert.arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.chat_sse_tg.arn
  }
}`
            },
            "proxy": {
                name: "ECS Session Orchestrators",
                category: "Compute Gateway",
                description: "Compiles prompt payloads. Reads conversational history from DynamoDB, checks Redis session cache, and feeds GPU clusters.",
                payload: `{
  "session_id": "sess_421",
  "prompt_assembled": "[History: 4 messages] [User: Hello!]"
}`,
                config: `resource "aws_ecs_service" "chat_orchestrator" {
  name            = "chat-orchestrator"
  cluster         = aws_ecs_cluster.chat_cluster.id
  task_definition = aws_ecs_task_definition.orchestrator_task.arn
  desired_count   = 6
}`
            },
            "redis": {
                name: "ElastiCache Redis Session Store",
                category: "Database & Cache",
                description: "Sub-millisecond context window cache. Stores active dialogue tokens to accelerate context assembly loops.",
                payload: `GET session:context:sess_421\n"[Message history array]"`,
                config: `resource "aws_elasticache_replication_group" "context_cache" {
  replication_group_id = "chat-context-cache"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 3
  port                 = 6379
}`
            },
            "db": {
                name: "Amazon DynamoDB (Chat History)",
                category: "Durable History Database",
                description: "Durable database mapping all chronological conversation messages, partitioned by session UUID.",
                payload: `SELECT * FROM chat_history WHERE session_id = 'sess_421' ORDER BY timestamp ASC;`,
                config: `resource "aws_dynamodb_table" "chat_history" {
  name           = "chat_history_records"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "session_id"
  range_key      = "message_id"
  attribute { name = "session_id"; type = "S" }
  attribute { name = "message_id"; type = "S" }
}`
            },
            "gpu": {
                name: "Amazon EKS GPU Inference Pods",
                category: "Inference Compute Tier",
                description: "Hosts Triton or vLLM engines on p4d instances. Executes model forward passes using PagedAttention to optimize GPU memory.",
                payload: `{
  "inference_tokens_per_sec": 42.8,
  "vllm_engine_status": "generating"
}`,
                config: `resource "aws_eks_node_group" "gpu_instances" {
  cluster_name    = aws_eks_cluster.core_eks.name
  node_group_name = "gpu-worker-pool"
  node_role_arn   = aws_iam_role.node_role.arn
  subnet_ids      = aws_subnet.private.*.id
  instance_types  = ["p4d.24xlarge"]
  scaling_config {
    desired_size = 4
    max_size     = 10
    min_size     = 2
  }
}`
            }
        }
    },
    ai_agent_framework: {
        title: "AI Agent Framework Loop",
        description: "Stateful agent execution engine executing loops, checking checkpoints, and providing tool sandboxes.",
        docLink: "viewer.html?file=level_7_ai_systems/ai_agent_framework/ai_agent_framework_system_design.md",
        techStack: [
            { service: "AWS Lambda", role: "Provides ephemeral execution sandboxes for untrusted agent tool code." },
            { service: "Amazon Aurora PostgreSQL", role: "Logs thread checkpoints and state variables as transactional JSONB structures." },
            { service: "Amazon ElastiCache for Redis", role: "Stores temporary active context variables and manages locks for active threads." },
            { service: "Amazon Bedrock", role: "Serves as the backplane model provider." }
        ],
        nodes: {
            "ingress": {
                name: "AWS API Gateway",
                category: "Networking Ingress",
                description: "API Gateway proxies incoming execution triggers and agent interaction requests.",
                payload: `POST /v1/agent/run\n{"agent_id": "researcher", "task": "Summarize AI news"}`,
                config: `resource "aws_apigatewayv2_api" "agent_api" {
  name          = "agent-framework-gateway"
  protocol_type = "HTTP"
}`
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
                config: `resource "aws_ecs_service" "loop_executor" {
  name            = "agent-loop-executor"
  cluster         = aws_ecs_cluster.agent_cluster.id
  task_definition = aws_ecs_task_definition.loop_task.arn
  desired_count   = 4
}`
            },
            "redis": {
                name: "ElastiCache Redis Mutex Cache",
                category: "Database & Cache",
                description: "Manages state locks and execution tokens, ensuring an agent thread has exactly one active worker loop execution.",
                payload: `SETNX lock:agent:run:researcher true\n(integer) 1`,
                config: `resource "aws_elasticache_replication_group" "mutex_registry" {
  replication_group_id = "agent-mutex-locks"
  node_type            = "cache.t4g.medium"
  num_cache_clusters   = 2
}`
            },
            "db": {
                name: "Aurora PostgreSQL State Ledger",
                category: "Durable History DB",
                description: "Relational database mapping chronological execution graphs states, variable updates, and history checkpoints.",
                payload: `SELECT checkpoint_data FROM agent_checkpoints WHERE agent_id = 'researcher' ORDER BY step_idx DESC LIMIT 1;`,
                config: `resource "aws_rds_cluster" "checkpoints_db" {
  cluster_identifier = "agent-checkpoints-db"
  engine             = "aurora-postgresql"
  database_name      = "agent_checkpoints"
}`
            },
            "lambda": {
                name: "AWS Lambda Sandboxes",
                category: "Secure Execution Sandbox",
                description: "Executes untrusted agent tool scripts (python, node) inside isolated, ephemeral container sandboxes.",
                payload: `{
  "script": "import urllib; print(urllib.request.urlopen('http://url').read())",
  "execution_duration_ms": 1420
}`,
                config: `resource "aws_lambda_function" "tool_sandbox" {
  function_name = "agent-tool-executor-sandbox"
  runtime       = "python3.11"
  role          = aws_iam_role.sandbox_role.arn
  handler       = "index.handler"
  filename      = "sandbox.zip"
  timeout       = 30
  memory_size   = 512
}`
            }
        }
    },
    llm_gateway: {
        title: "LLM Gateway Pipeline",
        description: "High-throughput proxy layer routing, auditing, and rate-limiting upstream LLM model transactions.",
        docLink: "viewer.html?file=level_7_ai_systems/llm_gateway/llm_gateway_system_design.md",
        techStack: [
            { service: "Application Load Balancer (ALB)", role: "VPC Ingress gateway proxy. Distributes incoming client HTTP/2 Completion streams." },
            { service: "Amazon ECS Fargate", role: "Hosts Go proxy worker shards to validate keys, check rate-limits, and filter completions." },
            { service: "Amazon ElastiCache for Redis", role: "Sub-millisecond token rate counter and semantic cache memory cluster." },
            { service: "Amazon DynamoDB", role: "Holds active tenant configuration states, daily spend budgets, and allowed provider maps." },
            { service: "Kinesis Data Firehose", role: "Asynchronous serverless logging pipeline to pull audit ledgers without blocking requests." },
            { service: "Amazon Bedrock API", role: "Managed Bedrock Execution Endpoint Connection forwarding requests upstream." }
        ],
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
                payload: `HGETALL tenant:rate:tenant-123\n1) "tokens_in_window"\n2) "4210"\n3) "window_start"\n4) "1784616000"`,
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
                config: `resource "aws_iam_role_policy_attachment" "bedrock_attach" {
  role       = aws_iam_role.proxy_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonBedrockFullAccess"
}`
            }
        }
    },
    semantic_search: {
        title: "Hybrid Semantic Search Engine",
        description: "Multi-stage vector retrieval, BM25 text keyword lookup, Reciprocal Rank Fusion, and Cross-Encoder reranking.",
        docLink: "viewer.html?file=level_7_ai_systems/semantic_search/semantic_search_system_design.md",
        techStack: [
            { service: "Application Load Balancer (ALB)", role: "VPC public endpoint router directing searches to ECS containers." },
            { service: "ECS Search Service Pods", role: "Coordinates search workflows, runs RRF fusion, and calls Reranker endpoints." },
            { service: "Amazon OpenSearch Cluster", role: "Houses HNSW index graphs for dense search and traditional BM25 inverted indices." },
            { service: "SageMaker Reranker Endpoint", role: "Hosts Cross-Encoder model to calculate relevance scores on candidates." },
            { service: "Amazon MSK Kafka", role: "Buffers incoming document updates to shield OpenSearch indexing nodes." }
        ],
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
    instance_type  = "r6g.xlarge.search"
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
        docLink: "viewer.html?file=level_7_ai_systems/token_streaming/token_streaming_system_design.md",
        techStack: [
            { service: "Network Load Balancer (NLB)", role: "Operates at layer 4 to preserve client TCP sockets and avoid long-lived SSE timeouts." },
            { service: "EKS Connection Pods", role: "Gateway proxy nodes holding client sockets inside non-blocking event-loop (epoll) wait queues." },
            { service: "ElastiCache Redis Pub/Sub", role: "Message broker routing generated tokens from GPU worker instances to gateway connections." },
            { service: "Amazon SQS Queue", role: "Orchestrates prompt generation tasks distributed across GPU model instances." },
            { service: "EC2 GPU Worker Instances", role: "Hosts model instances (vLLM/Triton) processing token streaming batches." }
        ],
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
                config: `resource "kubernetes_deployment" "eks_connection_gateway" {
  metadata { name = "eks-connection-gateway" }
  spec {
    replicas = 8
    selector { match_labels = { app = "eks-conn-gateway" } }
    template {
      metadata { labels = { app = "eks-conn-gateway" } }
      spec {
        container {
          name  = "connection-broker"
          image = "stream-broker:latest"
          port { container_port = 8000 }
        }
      }
    }
  }
}`
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
                config: `resource "aws_autoscaling_group" "gpu_asg" {
  name                = "gpu-inference-workers-asg"
  desired_capacity    = 4
  max_size            = 12
  min_size            = 2
  vpc_zone_identifier = aws_subnet.private.*.id
  launch_template {
    id      = aws_launch_template.gpu_worker_lt.id
    version = "$Latest"
  }
}`
            }
        }
    },
    api_gateway: {
        title: "API Gateway Engine",
        description: "High-performance edge reverse proxy routing, auditing, and rate-limiting general client HTTP requests.",
        docLink: "viewer.html?file=level_8_distributed_systems/api_gateway/api_gateway_system_design.md",
        techStack: [
            { service: "Network Load Balancer (NLB)", role: "Maps TCP connections directly to Envoy proxy tasks at the VPC boundary." },
            { service: "Amazon ECS Fargate", role: "Envoy-based reverse proxy container nodes executing validation and route filter chains." },
            { service: "Amazon ElastiCache for Redis", role: "Records sliding-window sorted sets for precise rate-limit metrics." },
            { service: "Amazon DynamoDB", role: "Stores active configuration rules, dynamic routes, and tenant security maps." },
            { service: "Cognito User Pool Auth", role: "Validates JWT credentials before forwarding traffic downstream." }
        ],
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
  attribute {
    name = "route_id"
    type = "S"
  }
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
                config: `resource "aws_cognito_user_pool" "gateway_auth" {
  name = "api-gateway-user-pool"
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
  }
}`
            }
        }
    },
    distributed_cache: {
        title: "Distributed Cache Cluster",
        description: "High-throughput, low-latency key-value memory engine with consistent hashing, LRU eviction, and write-behind persistence.",
        docLink: "viewer.html?file=level_8_distributed_systems/distributed_cache/distributed_cache_system_design.md",
        techStack: [
            { service: "Amazon Network Load Balancer (NLB)", role: "High-throughput TCP ingress load balancing across cache partitions." },
            { service: "Amazon EC2 / ElastiCache Nodes", role: "Memory-optimized Graviton nodes hosting primary and replica cache shards." },
            { service: "ECS Fargate (Consul Coordinator)", role: "Containerized cluster coordinator managing consistent hash ring topology and node heartbeats." },
            { service: "ECS Fargate (Write-Behind Workers)", role: "Asynchronously flushes memory ring-buffer mutations to persistent databases in micro-batches." },
            { service: "Amazon Aurora PostgreSQL", role: "Durable primary relational database store." }
        ],
        nodes: {
            "ingress": {
                name: "AWS Network Load Balancer (NLB)",
                category: "Networking & Routing",
                description: "L4 TCP load balancer forwarding requests directly to target hash ring partition nodes.",
                payload: `{"protocol": "TCP", "port": 6379, "action": "FORWARD", "target_group": "tg-partition-a"}`,
                config: `resource "aws_lb" "cache_nlb" {
  name               = "cache-cluster-nlb"
  load_balancer_type = "network"
  internal           = true
}`
            },
            "proxy": {
                name: "Smart Client / Consul Coordinator",
                category: "Cluster Routing",
                description: "Computes key hash on virtual ring topology to route requests directly to assigned physical nodes.",
                payload: `{"key": "user:profile:98214", "hash_val": 28459102, "assigned_node": "node-p1-a1"}`,
                config: `resource "aws_ecs_service" "consul_coordinator" {
  name            = "consul-cluster-coordinator"
  desired_count   = 3
}`
            },
            "redis": {
                name: "In-Memory LRU Node (Primary)",
                category: "Memory Storage",
                description: "Thread-safe hash table and doubly linked list executing O(1) reads, writes, and LRU evictions.",
                payload: `{"status": "HIT", "key": "user:profile:98214", "ttl_remaining_ms": 284500, "node_id": "node-p1-a1"}`,
                config: `resource "aws_instance" "cache_primary" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "r6g.xlarge"
  tags          = { Role = "Primary-Partition-A" }
}`
            },
            "db": {
                name: "Amazon Aurora PostgreSQL",
                category: "Persistent Database",
                description: "Authoritative datastore receiving async write-behind updates from ring buffer worker tasks.",
                payload: `UPDATE users SET name = 'Sarah Connor' WHERE user_id = '98214';`,
                config: `resource "aws_rds_cluster" "persistent_db" {
  cluster_identifier = "cache-persistent-aurora"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
}`
            },
            "s3": {
                name: "Write-Behind Async Worker",
                category: "Persistence Engine",
                description: "Flushes memory ring buffer mutation events into Aurora PostgreSQL in bulk micro-batches.",
                payload: `{"batch_size": 150, "flush_interval_ms": 100, "operation": "WRITE_BEHIND"}`,
                config: `resource "aws_ecs_service" "persistence_worker" {
  name          = "write-behind-worker"
  desired_count = 4
}`
            }
        }
    },
    distributed_lock: {
        title: "Distributed Lock Manager",
        description: "High-concurrency mutual exclusion engine with Redlock quorum consensus, monotonic fencing tokens, and watchdog lease renewal.",
        docLink: "viewer.html?file=level_8_distributed_systems/distributed_lock/distributed_lock_system_design.md",
        techStack: [
            { service: "Amazon Network Load Balancer (NLB)", role: "High-throughput ingress load balancing across Lock microservices." },
            { service: "Amazon MemoryDB for Redis", role: "Multi-AZ independent master nodes executing atomic SETNX PX and Redlock consensus." },
            { service: "ECS Fargate (Lock API Service)", role: "Containerized lock API tasks managing watchdog threads and fencing token issuance." },
            { service: "Amazon DynamoDB (Fencing Guard)", role: "Target database storage validating monotonic fencing tokens to block out-of-order writes." },
            { service: "Amazon CloudWatch", role: "Monitors lock acquisition latencies, TTL expiry rates, and lock contention frequency." }
        ],
        nodes: {
            "ingress": {
                name: "AWS Network Load Balancer (NLB)",
                category: "Networking & Ingress",
                description: "L4 TCP load balancer forwarding requests directly to containerized lock API workers.",
                payload: `{"protocol": "TCP", "port": 8088, "action": "FORWARD", "target_group": "tg-lock-service"}`,
                config: `resource "aws_lb" "lock_nlb" {
  name               = "distributed-lock-nlb"
  load_balancer_type = "network"
  internal           = true
}`
            },
            "proxy": {
                name: "Lock SDK & Watchdog Coordinator",
                category: "Lock Coordinator",
                description: "Executes Redlock quorum algorithm and starts background threads to renew active lock leases.",
                payload: `{"resource_id": "acc:9901", "client_id": "worker-1", "action": "WATCHDOG_RENEW", "ttl_ms": 10000}`,
                config: `resource "aws_ecs_service" "lock_service" {
  name            = "distributed-lock-service"
  desired_count   = 4
}`
            },
            "redis": {
                name: "Redlock Quorum Cluster (5 Masters)",
                category: "Consensus Engine",
                description: "Independent Redis instances executing atomic SETNX PX commands to grant locks.",
                payload: `SET lock:acc:9901 val_uuid_104859 NX PX 10000\nACK: 4/5 Nodes`,
                config: `resource "aws_elasticache_cluster" "lock_masters" {
  count                = 5
  cluster_id           = "lock-master-\${count.index}"
  node_type            = "cache.t4g.medium"
  num_cache_nodes      = 1
}`
            },
            "db": {
                name: "Amazon DynamoDB (Fencing Guard)",
                category: "Protected Storage",
                description: "Enforces atomic updates checking fencing token > last_seen_token to prevent stale writes.",
                payload: `UPDATE balance SET amount=1200 WHERE account_id='9901' AND fencing_token > 104858;`,
                config: `resource "aws_dynamodb_table" "account_balances" {
  name     = "bank_accounts"
  hash_key = "account_id"
  attribute {
    name = "account_id"
    type = "S"
  }
}`
            },
            "s3": {
                name: "Fencing Token Service",
                category: "Sequence Generator",
                description: "Monotonically increasing counter issuing sequential fencing tokens with every lock grant.",
                payload: `{"resource_id": "acc:9901", "issued_token": 104859, "timestamp": 1784900000}`,
                config: `resource "aws_dynamodb_table" "token_counter" {
  name     = "fencing_token_sequence"
  hash_key = "resource_id"
}`
            }
        }
    },
    distributed_queue: {
        title: "Distributed Message Queue",
        description: "High-throughput, partitioned streaming message platform with Write-Ahead Logs, consumer groups, offset commits, and DLQ escalation.",
        docLink: "viewer.html?file=level_8_distributed_systems/distributed_queue/distributed_queue_system_design.md",
        techStack: [
            { service: "Amazon Network Load Balancer (NLB)", role: "High-throughput L4 TCP traffic distribution across broker endpoints." },
            { service: "Amazon MSK (Managed Streaming for Kafka)", role: "Multi-AZ brokers storing partition WAL logs on high-speed EBS volumes." },
            { service: "ECS Fargate (Consumer Microservices)", role: "Auto-scaled container workers processing topic messages in consumer groups." },
            { service: "Amazon DynamoDB (Offset & DLQ Registry)", role: "Stores committed consumer group offsets and Dead Letter Queue poison pill records." },
            { service: "Amazon CloudWatch", role: "Monitors topic lag, bytes in/out, and partition rebalance events." }
        ],
        nodes: {
            "ingress": {
                name: "AWS Network Load Balancer (NLB)",
                category: "Ingress Router",
                description: "L4 TCP load balancer routing producer publish requests directly to active partition leaders.",
                payload: `{"protocol": "TCP", "port": 9092, "topic": "orders", "action": "ROUTE_PARTITION_LEADER"}`,
                config: `resource "aws_lb" "queue_nlb" {
  name               = "queue-cluster-nlb"
  load_balancer_type = "network"
}`
            },
            "proxy": {
                name: "Partition Commit Log (WAL Engine)",
                category: "Message Storage Engine",
                description: "Appends message bytes to disk segment files (.log) and sparse offset index files (.index).",
                payload: `{"topic": "orders", "partition": 1, "offset": 1048592, "key": "user_101", "payload_bytes": 1024}`,
                config: `resource "aws_msk_cluster" "queue_brokers" {
  cluster_name           = "distributed-queue-msk"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = 6
}`
            },
            "redis": {
                name: "Consumer Group Coordinator",
                category: "Group Management",
                description: "Manages consumer heartbeats and executes partition rebalancing protocols when workers join or leave.",
                payload: `{"consumer_group": "order-processors", "active_consumers": 4, "assigned_partitions": [0, 1, 2, 3]}`,
                config: `resource "aws_ecs_service" "consumer_workers" {
  name            = "order-processor-consumers"
  desired_count   = 4
}`
            },
            "db": {
                name: "Amazon DynamoDB (Offset Registry)",
                category: "Offset Storage",
                description: "Stores durable sequence offsets for consumer groups to guarantee state resumption after restarts.",
                payload: `{"group_id": "order-processors", "topic": "orders", "partition": 1, "committed_offset": 1048592}`,
                config: `resource "aws_dynamodb_table" "offsets" {
  name     = "consumer_group_offsets"
  hash_key = "group_id"
}`
            },
            "s3": {
                name: "Dead Letter Queue (DLQ Engine)",
                category: "Poison Message Store",
                description: "Stores unprocessable messages exceeding max retry limits for offline inspection.",
                payload: `{"dlq_id": 8812, "original_topic": "orders", "retry_count": 5, "reason": "DeserializationError"}`,
                config: `resource "aws_sqs_queue" "dead_letter_queue" {
  name = "orders-dlq-queue"
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

// Tech Stack Detail Nodes
const techStackContainer = document.getElementById("system-tech-stack");
const docLinkButton = document.getElementById("system-doc-link");

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
    } else if (currentSystem === "library_management") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Enterprise Library Network)</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#c084fc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">API GW /</text>
                <text x="40" y="55" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">Kiosks</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Fargate</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Borrowing Engine</text>
            </g>
            <g class="interactive-node" id="opensearch" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="100" rx="10" fill="#111827" stroke="#c084fc" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="13" fill="#c084fc" font-weight="700" text-anchor="middle">OpenSearch</text>
                <text x="100" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Catalog Inverted Index</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 280)">
                <rect x="0" y="0" width="200" height="70" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="35" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Redis Hold Queue</text>
                <text x="100" y="55" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">ZADD/ZPOPMIN</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(200, 340)">
                <rect x="0" y="0" width="140" height="60" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="70" y="35" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
            </g>
        </svg>`;
    } else if (currentSystem === "atm_system") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Banking Network Core)</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#00e676" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">NLB / ISO</text>
                <text x="40" y="55" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">8583 Switch</text>
            </g>
            <g class="interactive-node" id="cloudhsm" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="90" rx="10" fill="#111827" stroke="#00e676" stroke-width="2" />
                <text x="100" y="40" font-family="Outfit" font-size="13" fill="#00e676" font-weight="700" text-anchor="middle">AWS CloudHSM</text>
                <text x="100" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">DUKPT PIN Decryption</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Fargate</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Saga Coordinator</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 280)">
                <rect x="0" y="0" width="200" height="70" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="35" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Redis Cassette Cache</text>
                <text x="100" y="55" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Note Allocation Routine</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(200, 340)">
                <rect x="0" y="0" width="140" height="60" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="70" y="35" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
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
    } else if (currentSystem === "elevator_system") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Elevator Control Core)</text>

            <path d="M120 170 L 200 220" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M120 330 L 200 270" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 170 L 200 220" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M120 330 L 200 270" stroke="#00e676" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 170" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 130)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">API Gateway</text>
                <text x="40" y="55" font-family="Outfit" font-size="11" fill="#ff9800" font-weight="700" text-anchor="middle">Lobby Kiosk</text>
            </g>
            <g class="interactive-node" id="mqtt" transform="translate(40, 290)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#00e676" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="12" fill="#00e676" font-weight="700" text-anchor="middle">AWS IoT</text>
                <text x="40" y="55" font-family="Outfit" font-size="11" fill="#00e676" font-weight="700" text-anchor="middle">MQTT Broker</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Fargate</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Dispatch Engine</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">State Grid & Min-Heap Queues</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 280)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#4caf50" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Car Registry & Trip Ledger</text>
            </g>
        </svg>`;
    } else if (currentSystem === "hotel_booking") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Hotel Booking Core)</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 240 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#00e676" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 240 L 520 300" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">API Gateway</text>
                <text x="40" y="55" font-family="Outfit" font-size="11" fill="#ff9800" font-weight="700" text-anchor="middle">& CloudFront</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Fargate</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Hold & Saga Engine</text>
            </g>
            <g class="interactive-node" id="opensearch" transform="translate(420, 70)">
                <rect x="0" y="0" width="180" height="75" rx="10" fill="#111827" stroke="#00e676" stroke-width="2" />
                <text x="90" y="35" font-family="Outfit" font-size="13" fill="#00e676" font-weight="700" text-anchor="middle">Amazon OpenSearch</text>
                <text x="90" y="55" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Spatial Geohash Index</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 180)">
                <rect x="0" y="0" width="180" height="75" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="35" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="90" y="55" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">10-Min Hold Locks</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 290)">
                <rect x="0" y="0" width="180" height="75" rx="10" fill="#111827" stroke="#4caf50" stroke-width="2" />
                <text x="90" y="35" font-family="Outfit" font-size="13" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
                <text x="90" y="55" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">OCC Room Inventory</text>
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

            <!-- Target Pods -->
            <g class="interactive-node" id="target" transform="translate(680, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#10b981" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#10b981" font-weight="700" text-anchor="middle">Target Pods</text>
            </g>
        </svg>`;
    }

    // Inject premium dark grid background and neon glow filters dynamically
    const gridAndFilters = `
        <defs>
            <pattern id="blueprint-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.025)" stroke-width="1" />
            </pattern>
            <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <!-- Background grid block -->
        <rect width="100%" height="100%" fill="url(#blueprint-grid)" rx="15" />
    `;
    svgContent = svgContent.replace(/<svg ([^>]+)>/, `<svg $1>${gridAndFilters}`);

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

            // If a node is clicked, auto-switch tab to Payload/Config for node inspection
            const activeTab = document.querySelector(".tab-btn.active").getAttribute("data-tab");
            if (activeTab === "system") {
                switchTab("payload");
            }

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

// Update System Tech Stack Details
function updateSystemOverview() {
    const system = systemData[currentSystem];
    if (!system) return;

    systemTitle.innerText = system.title;
    systemDescription.innerText = system.description;
    
    // Set doc link
    docLinkButton.setAttribute("href", system.docLink);
    
    // Set tech stack list
    let listHTML = "";
    system.techStack.forEach(item => {
        listHTML += `
        <div class="tech-item">
            <span class="tech-service">${item.service}</span>
            <span class="tech-role">${item.role}</span>
        </div>`;
    });
    techStackContainer.innerHTML = listHTML;
}

// Switch tabs helper
function switchTab(targetTab) {
    document.querySelectorAll(".tab-btn").forEach(t => {
        t.classList.remove("active");
        if (t.getAttribute("data-tab") === targetTab) {
            t.classList.add("active");
        }
    });

    document.querySelectorAll(".tab-content").forEach(content => {
        content.classList.add("hidden");
    });

    if (targetTab === "system") {
        document.getElementById("tab-system").classList.remove("hidden");
    } else if (targetTab === "payload") {
        document.getElementById("tab-payload").classList.remove("hidden");
    } else {
        document.getElementById("tab-config").classList.remove("hidden");
    }
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

        updateSystemOverview();
        // Reset inspector focus to System Overview tab when switching systems
        switchTab("system");
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
        switchTab(btn.getAttribute("data-tab"));
    });
});

// Initial Invocations
simulateBtn.innerText = "Pause Simulation";
updateSystemOverview();
switchTab("system");
renderSVG();
