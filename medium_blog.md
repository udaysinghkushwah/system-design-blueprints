# Building a Production-Grade Interactive System Design Explorer: From Blueprints to Live Simulation

System design is often taught using abstract boxes, hand-drawn wireframes, and dry, text-heavy documentation. While these resources are great for high-level conceptual understanding, they leave a massive gap when it comes to real-world engineering. 

When you prepare for a FAANG system design interview or architect a new high-scale distributed system at work, you don't just need to know *what* components to use. You need to know:
- How the components map to actual cloud infrastructure (e.g., **AWS Terraform configurations**).
- What the real-time **JSON request/response payloads** look like.
- How query traffic moves across public subnets, private subnets, and caching layers.

To bridge this gap, I built **[System Design Blueprints](https://github.com/udaysinghkushwah/system-design-blueprints)**—a repository containing 14 production-grade blueprints, combined with a live, interactive **[Architecture Explorer Dashboard](https://udaysingh-system-design.web.app)** that animates and simulates query flows.

---

## ⚡ The Interactive Explorer: What Makes It Different?

Unlike static design images or simple text documents, the **[Interactive System Design Explorer](https://udaysingh-system-design.web.app)** is a responsive single-page web app built to feel alive.

Here is what you can do on the platform:

### 1. Interactive SVG Architecture Canvas
The canvas renders high-fidelity system diagrams featuring standard cloud service nodes (ALB, ECS, DynamoDB, Redis, S3, Cognito, etc.) set on a professional dark grid background. Clicking on any node slides open a side panel containing production-ready infrastructure-as-code and schema documentation.

### 2. Live Neon Traffic Simulation
With a single toggle ("Simulate Query Flow"), the static connection lines turn into animated neon laser paths, showing exactly how read/write queries pass through VPC subnets, caching barriers, and message queues in real-time.

### 3. In-Browser Markdown, LaTeX, and Mermaid Compiler
Every system has a "View Full Markdown Blueprint ↗" option. This opens a custom-built document reader that compiles markdown files dynamically in-browser. It features:
- **Mermaid.js** for rendering vector flowcharts inline.
- **KaTeX** for rendering LaTeX math formulas (such as peak QPS, bandwidth, and storage capacity estimations) with absolute precision.
- **ASCII Alignments** styled with compressed monospace layouts to ensure vertical arrows and boxes align perfectly without gaps.

---

## 📂 The 14 Completed System Designs

The platform includes blueprints categorized into three progressive tier levels:

### Level 1 – Core System Design
1. **URL Shortener** (ECS Redirect engines, Redis lookup, Aurora sharding).
2. **Pastebin** (S3 text block uploads, metadata mapping in Aurora).
3. **Distributed File Storage** (Chunk servers, namespace metadata clusters).
4. **Dropbox** (Block servers, deduplication indexing, S3 synchronization).
5. **Smart Parking Lot** (Ultrasonic sensors, IoT core ingress, distributed locks, optimistic concurrency).

### Level 4 – Ride Sharing & Food Delivery
6. **Food Delivery Service** (Geo-spatial indexing, real-time rider tracking, matching algorithms).

### Level 7 – AI Systems
7. **RAG Pipeline** (Document ingestion, chunking, embedding generation, vector search).
8. **Distributed Vector Database** (HNSW indexing, vector partitioning, ANN queries).
9. **ChatGPT/LLM UI** (Token streaming, web sockets, RAG context inject).
10. **Stateful AI Agent Framework** (State loops, tool execution, long-term memory).
11. **LLM Gateway / Proxy** (Semantic caching, semantic routing, rate limiting).
12. **Hybrid Semantic Search** (Sparse BM25 + dense embedding models, reciprocal rank fusion).
13. **Real-time Token Streaming** (Server-Sent Events (SSE), queue buffers).

### Level 8 – Distributed Systems
14. **API Gateway** (Rate-limiting, JWT authentication, dynamic routing, circuit breaking).

---

## 🛠️ The Tech Stack behind the Deployment

To host this explorer at zero cost and bypass standard CI/CD deployment locks, I migrated the project hosting to **Firebase Hosting**:
- **Frontend:** Vanilla HTML5, CSS3 grid/flexbox layouts, and Javascript ES6.
- **Math Rendering:** KaTeX CDN integration.
- **Chart Rendering:** Marked.js and Mermaid.js CDN compilers.
- **Hosting:** Deployed to Google's globally distributed Firebase CDN for ultra-fast load times.
- **Infrastructure:** Configured using `firebase.json` and `.firebaserc` files for structured public build mappings.

---

## 🚀 Explore the System Designs Yourself

All code, documents, and visual layouts are fully open-source. 

* **Explore the Live Dashboard:** [https://udaysingh-system-design.web.app](https://udaysingh-system-design.web.app) 🌐
* **Star the GitHub Repository:** [github.com/udaysinghkushwah/system-design-blueprints](https://github.com/udaysinghkushwah/system-design-blueprints) ⭐️

If you find these blueprints helpful for your interviews or engineering projects, consider **[Buying Me a Chai ☕](https://www.buymeachai.in/toudaysinghkushwah)** to support more designs!
