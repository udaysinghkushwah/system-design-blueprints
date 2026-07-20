# System Design Repository

This repository contains professional system design blueprints and documentation.

## Projects

### 1. Zomato System Design
A production-grade, end-to-end system design for a high-scale food delivery platform connecting Customers, Restaurants, and Delivery Partners.

* **Documentation:** [Zomato System Design (zomato_system_design.md)](./zomato_sd/zomato_system_design.md)
* **OpenAPI 3.0 API Spec:** [OpenAPI Contract (zomato_api_spec.yaml)](./zomato_sd/zomato_api_spec.yaml)
* **Local Mock API Server:** [Mock Python Server (mock_server.py)](./zomato_sd/mock_server.py) (run using `python3 zomato_sd/mock_server.py`)

#### Architecture Diagrams

##### A. High-Level System Architecture
Overview of clients, gateway, microservices layer, message brokers, and databases.

![Zomato System Architecture](./zomato_sd/zomato_system_architecture.png)

##### B. Real-Time Ingestion & Live Tracking Pipeline
Visual flow of coordinates streamed from riders to Redis Geo (hot cache), Kafka, Cassandra (historical logs), and WebSocket push connections to tracking users.

![Zomato Live Tracking](./zomato_sd/zomato_live_tracking.png)

##### C. Rider Matching & Dispatch Engine
Visual explanation of the bipartite graph match loop using candidate discovery, multi-criteria weight functions (ETA, Travel Distance, Rating), and Hungarian Algorithm solvers.

![Zomato Rider Matching](./zomato_sd/zomato_rider_matching.png)

---

### 2. ChatGPT System Design
A production-grade system design for a real-time, low-latency conversational AI platform (LLM conversational system). Handles streaming tokens, active session memory, context window compression, and GPU inference routing.

* **Documentation:** [ChatGPT System Design (chatgpt_system_design.md)](./chat_gpt_sd/chatgpt_system_design.md)
* **Architecture Diagram:**

![ChatGPT System Architecture](./chat_gpt_sd/chatgpt_system_architecture.png)

---

## Support

If you find these system design blueprints helpful, support my work by buying me a coffee!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/uday)

---
*Created on 2026-07-20*
