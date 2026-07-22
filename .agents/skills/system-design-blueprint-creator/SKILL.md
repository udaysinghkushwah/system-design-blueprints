---
name: system-design-blueprint-creator
description: Standard workflow and guidelines for creating production-grade system design blueprints in this repository, including OpenAPI specs, mock servers, architecture diagrams, interactive explorer integration, and Firebase deployment.
---

# System Design Blueprint Creator Skill

This skill provides the mandatory end-to-end workflow for designing, building, documenting, and deploying production-grade system design blueprints in the `system-design-blueprints` repository.

---

## Standard Workflow Checklist

When requested to design a new system (e.g., *Food Delivery System*, *Elevator System*, *Hotel Booking System*), perform the following steps sequentially:

### Step 1: Directory & Blueprint Creation
Create a new directory under the appropriate level (e.g. `level_1_core_system_design/<topic_slug>/`) and create `<topic_slug>_system_design.md` containing all 11 standard sections:

1. **Title & Overview**: High-level problem context and target scale.
2. **Section 1: System Requirements**:
   - Functional Requirements (core features, workflows, administrative controls).
   - Non-Functional Requirements (latency targets, consistency SLAs, uptime % Availability, security, edge failover).
3. **Section 2: Capacity & Scale Estimation**:
   - Scale Assumptions (Users, DAU, Requests/day, Total items).
   - Throughput Math (Average QPS, Peak Spike QPS).
   - Bandwidth & Data Storage Sizing (Daily storage growth, Redis RAM requirements).
4. **Section 3: High-Level Architecture**:
   - Decoupled component architecture explanation.
   - Image reference: `![System Architecture](./<topic_slug>_system_architecture.png)`.
   - Mermaid `graph TD` flowchart with double-quoted labels (e.g., `Node["Label (Text)"]`).
5. **Section 4: Component-Level Design & Algorithms**:
   - Core data models, finite state machines, mathematical equations (e.g., cost functions, surge pricing).
   - Concurrency & conflict resolution strategies (e.g., Optimistic Concurrency Control OCC, Redis Redlock).
6. **Section 5: Database Schema & Data Models**:
   - PostgreSQL DDL table schemas (`CREATE TABLE ...`) with indexes.
   - Redis key namespace strategy table (`Key Pattern`, `Data Structure`, `Purpose`).
7. **Section 6: API Design & Contracts**:
   - REST/gRPC/MQTT request & response JSON payloads.
8. **Section 7: End-to-End Workflow Sequence**:
   - Complete sequence flow using Mermaid `sequenceDiagram`.
9. **Section 8: Executable Python OOD Code**:
   - Fully functional Python Object-Oriented Design implementation with zero syntax errors.
   - Verification test harness demonstrating concurrency locking and state transitions.
10. **Section 9: Scalability, Resilience & Edge Failover**:
    - Multi-region database failover, edge local mode, retry idempotency, rate limiting.
11. **Section 10: AWS Cloud-Native Architecture**:
    - Image reference: `![AWS Architecture](./<topic_slug>_aws_architecture.png)`.
    - AWS Service Mapping Table (`Generic Component`, `AWS Service`, `Design Details`).
12. **Section 11: Technology Justification**:
    - Detailed trade-off comparison ("Why We Use X over Y").

---

### Step 2: High-Resolution Architecture Diagrams
Generate two visual PNG diagrams using the `generate_image` tool and save them in the topic directory:
* `<topic_slug>_system_architecture.png`
* `<topic_slug>_aws_architecture.png`

---

### Step 3: OpenAPI 3.0 API Specification
Create `<topic_slug>_api_spec.yaml` containing the complete OpenAPI 3.0 contract for all core REST endpoints, path parameters, query schemas, and response components.

---

### Step 4: Runnable Local Mock API Server
Create `mock_server.py` in the topic directory (executable via `chmod +x`):
* A standalone Python HTTP server using built-in `http.server`.
* Mock JSON responses matching the OpenAPI specification.
* Runs on a designated local port (e.g., `8080`, `8088`, `8089`).

---

### Step 5: Interactive Explorer Integration
1. Update `interactive_explorer/index.html`:
   - Add navigation button `<button class="nav-item" data-system="<topic_slug>">` under the corresponding level group.
2. Update `interactive_explorer/app.js`:
   - Add system entry to `SYSTEMS` dictionary (title, description, docLink, techStack array, node configs for `ingress`, `proxy`, `redis`, `db`).
   - Add SVG interactive diagram rendering block in the renderer function.

---

### Step 6: Repository README Update
Update `README.md`:
1. **Table of Contents**: Add clickable link to the new section.
2. **System Design Roadmap**: Change level table status from `⬜ Planned` to `✅ [Blueprint](./level_1_core_system_design/<topic_slug>/<topic_slug>_system_design.md)`.
3. **Progress Tracker**:
   - Update Level completed count and progress bar.
   - Update Total completed count, total count, and percentage (e.g. `18 / 108 (16.7%)`).
4. **Completed Blueprints**:
   - Add detailed topic preview under `## 📂 Completed Blueprints`.
   - Include links to Documentation Markdown, OpenAPI Contract, and Mock Server command.
   - Embed high-level system architecture and AWS cloud-native architecture diagrams.
5. **Timestamp**:
   - Update `*Updated on YYYY-MM-DD*` at the bottom of `README.md` to the current date.

---

### Step 7: Build, Deploy & Push
1. Sync static web assets to `dist/`:
   ```bash
   cp interactive_explorer/index.html dist/index.html
   cp interactive_explorer/app.js dist/app.js
   cp README.md dist/README.md
   mkdir -p dist/<level_folder>/<topic_slug>
   cp -r <level_folder>/<topic_slug>/* dist/<level_folder>/<topic_slug>/
   ```
2. Deploy to Firebase Hosting:
   ```bash
   npx -y firebase-tools@latest deploy
   ```
3. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Add <System Name> design blueprint, architecture diagrams, OpenAPI spec, mock server, and interactive explorer integration"
   git push origin main
   ```
