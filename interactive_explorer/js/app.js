/**
 * Main Application Entry Point for Interactive System Design Explorer
 * Modular ES Architecture orchestrating rendering, controls, sequences, inspector, and state.
 */

import { SYSTEMS } from './systems-data.js';
import { renderSVG } from './svg-renderers.js';
import { STEP_SEQUENCES } from './step-sequences.js';
import { CanvasController } from './canvas-controls.js';
import { InspectorPanel } from './inspector.js';
import { SidebarSearchFilter } from './search-filter.js';

class App {
    constructor() {
        this.currentSystemKey = "search_ranking";
        this.activeNodeId = "ingress";
        this.currentStepIndex = -1;
        this.autoPlayInterval = null;

        this.canvasController = new CanvasController("canvas-container");
        this.inspectorPanel = new InspectorPanel();
        this.searchFilter = new SidebarSearchFilter((systemKey) => this.selectSystem(systemKey));

        this.initDOM();
        this.initEventListeners();
        this.initKeyboardShortcuts();
        
        // Initial render
        this.selectSystem(this.currentSystemKey);
    }

    initDOM() {
        this.systemTitle = document.getElementById("system-title");
        this.systemDescription = document.getElementById("system-description");
        this.canvasContainer = document.getElementById("canvas-container");
        this.simulateBtn = document.getElementById("simulate-btn");
        this.statusIndicator = document.querySelector(".status-indicator");
        this.statusText = document.querySelector(".status-text");
        this.heroLevelBadge = document.getElementById("hero-level-badge");
        this.brandLogoBtn = document.getElementById("brand-logo-btn");
        
        // Metric elements
        this.metricLatency = document.getElementById("metric-latency");
        this.metricQps = document.getElementById("metric-qps");
        this.metricSla = document.getElementById("metric-sla");
        this.metricScale = document.getElementById("metric-scale");

        // Step player elements
        this.stepPrevBtn = document.getElementById("step-prev-btn");
        this.stepNextBtn = document.getElementById("step-next-btn");
        this.stepPlayBtn = document.getElementById("step-play-btn");
        this.stepCounter = document.getElementById("step-counter");
        this.stepBanner = document.getElementById("step-banner");
        this.stepTitle = document.getElementById("step-title");
        this.stepDesc = document.getElementById("step-desc");
    }

    initEventListeners() {
        // Brand logo click
        this.brandLogoBtn?.addEventListener("click", () => this.selectSystem("search_ranking"));

        // System button selection
        document.addEventListener("click", (e) => {
            const sysBtn = e.target.closest(".nav-item[data-system]");
            if (sysBtn) {
                const sysKey = sysBtn.getAttribute("data-system");
                this.selectSystem(sysKey);
            }
        });

        // Diagram node click inspection
        if (this.canvasContainer) {
            this.canvasContainer.addEventListener("click", (e) => {
                const nodeEl = e.target.closest(".interactive-node");
                if (nodeEl) {
                    const nodeId = nodeEl.id;
                    this.selectNode(nodeId);
                }
            });
        }

        // Toolbar buttons
        document.getElementById("btn-zoom-in")?.addEventListener("click", () => this.canvasController.zoomIn());
        document.getElementById("btn-zoom-out")?.addEventListener("click", () => this.canvasController.zoomOut());
        document.getElementById("btn-reset-view")?.addEventListener("click", () => this.canvasController.resetView());
        document.getElementById("btn-fullscreen")?.addEventListener("click", () => this.canvasController.toggleFullscreen());
        
        // Simulation Toggle
        this.simulateBtn?.addEventListener("click", () => this.toggleTrafficSimulation());

        // Step Player Buttons
        this.stepPrevBtn?.addEventListener("click", () => this.prevStep());
        this.stepNextBtn?.addEventListener("click", () => this.nextStep());
        this.stepPlayBtn?.addEventListener("click", () => this.toggleStepAutoPlay());
    }

    initKeyboardShortcuts() {
        document.addEventListener("keydown", (e) => {
            // Ignore if typing in input field (except escape)
            if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) && e.code !== "Escape") return;

            if (e.code === "Space") {
                e.preventDefault();
                this.toggleTrafficSimulation();
            } else if (e.code === "ArrowRight") {
                this.nextStep();
            } else if (e.code === "ArrowLeft") {
                this.prevStep();
            } else if (e.code === "KeyK" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                this.searchFilter.openCommandPalette();
            } else if (e.key === "/") {
                e.preventDefault();
                this.searchFilter.openCommandPalette();
            } else if (e.code === "Escape") {
                this.canvasController.resetView();
                this.stopStepAutoPlay();
                this.searchFilter.closeCommandPalette();
            }
        });
    }

    selectSystem(systemKey) {
        if (!SYSTEMS[systemKey]) return;

        this.currentSystemKey = systemKey;
        this.stopStepAutoPlay();
        this.currentStepIndex = -1;

        // Update Nav Active State
        document.querySelectorAll(".nav-item[data-system]").forEach(btn => {
            if (btn.getAttribute("data-system") === systemKey) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Update Title & Description
        const sysData = SYSTEMS[systemKey];
        if (this.systemTitle) this.systemTitle.textContent = sysData.title || systemKey;
        if (this.systemDescription) this.systemDescription.textContent = sysData.description || "";

        // Update Breadcrumb Trail & Hero Badge
        const activeBtn = document.querySelector(`.nav-item[data-system="${systemKey}"]`);
        if (activeBtn) {
            const titleEl = activeBtn.closest('.nav-group')?.querySelector('.nav-group-title');
            let groupHeader = "System Design";
            if (titleEl) {
                const clone = titleEl.cloneNode(true);
                clone.querySelectorAll('.count-badge, .chevron').forEach(el => el.remove());
                groupHeader = clone.textContent.trim();
            }
            const bcLevel = document.getElementById('bc-level');
            const bcTitle = document.getElementById('bc-title');
            if (bcLevel) bcLevel.textContent = groupHeader;
            if (bcTitle) bcTitle.textContent = sysData.title || systemKey;
            if (this.heroLevelBadge) this.heroLevelBadge.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${groupHeader}`;
        }

        // Default active node (usually 'proxy' or 'ingress')
        const nodes = sysData.nodes || {};
        this.activeNodeId = nodes["proxy"] ? "proxy" : (nodes["ingress"] ? "ingress" : Object.keys(nodes)[0]);

        // Update Metrics Dashboard
        this.updateSystemMetrics(systemKey);

        // Reset Canvas View & Render SVG
        this.canvasController.resetView();
        this.renderDiagram();
        this.updateInspector();
        this.updateStepBanner();
    }

    selectNode(nodeId) {
        this.activeNodeId = nodeId;

        // Highlight SVG node
        const svg = this.canvasContainer.querySelector("svg");
        if (svg) {
            svg.querySelectorAll(".interactive-node").forEach(node => {
                if (node.id === nodeId) {
                    node.classList.add("selected");
                } else {
                    node.classList.remove("selected");
                }
            });
        }

        this.updateInspector();
    }

    renderDiagram() {
        if (!this.canvasContainer) return;
        const activeStepNode = this.getActiveStepNodeId();
        const svgContent = renderSVG(
            this.currentSystemKey,
            this.canvasController.simulationActive,
            this.activeNodeId,
            activeStepNode
        );
        this.canvasContainer.innerHTML = svgContent;

        // Highlight selected node
        this.selectNode(this.activeNodeId);
    }

    updateInspector() {
        const sysData = SYSTEMS[this.currentSystemKey];
        if (!sysData) return;

        const nodeData = sysData.nodes ? sysData.nodes[this.activeNodeId] : null;
        this.inspectorPanel.updateNodeDetails(nodeData, sysData);
    }

    updateSystemMetrics(systemKey) {
        // Dynamic operational metric approximations based on blueprint specs
        const metricsMap = {
            search_ranking: { latency: "< 50ms P99", qps: "100,000 QPS", sla: "99.99%", scale: "10B Catalog Items" },
            spell_checker: { latency: "< 50ms P99", qps: "35,000 QPS", sla: "99.99%", scale: "3B+ Daily Queries" },
            llm_gateway: { latency: "< 15ms Overhead", qps: "50,000 QPS", sla: "99.999%", scale: "10M Token Quotas" },
            rag_pipeline: { latency: "< 80ms P99", qps: "12,000 QPS", sla: "99.95%", scale: "100M Dense Vectors" },
            vector_database: { latency: "< 10ms HNSW", qps: "80,000 QPS", sla: "99.99%", scale: "1B 768d Embeddings" },
            rate_limiter: { latency: "< 1ms Redis", qps: "1,000,000 QPS", sla: "99.999%", scale: "Sliding Window Lua" },
            circuit_breaker: { latency: "< 0.1ms Envoy", qps: "1,000,000 RPS", sla: "99.999%", scale: "3-State FSM Engine" },
            url_shortener: { latency: "< 5ms CDN", qps: "150,000 QPS", sla: "99.99%", scale: "100B Short Links" },
            hotel_booking: { latency: "< 40ms Geohash", qps: "25,000 QPS", sla: "99.99%", scale: "500k Hotels / 10M Rooms" }
        };

        const defaultMetrics = { latency: "< 30ms P99", qps: "50,000 QPS", sla: "99.99%", scale: "Global Multi-AZ" };
        const metrics = metricsMap[systemKey] || defaultMetrics;

        if (this.metricLatency) this.metricLatency.textContent = metrics.latency;
        if (this.metricQps) this.metricQps.textContent = metrics.qps;
        if (this.metricSla) this.metricSla.textContent = metrics.sla;
        if (this.metricScale) this.metricScale.textContent = metrics.scale;
    }

    toggleTrafficSimulation() {
        const isSimulating = this.canvasController.toggleSimulation();
        if (this.simulateBtn) {
            this.simulateBtn.innerHTML = isSimulating ? '<i class="fa-solid fa-pause"></i> Pause Simulation' : '<i class="fa-solid fa-play"></i> Resume Simulation';
        }
        if (this.statusIndicator) {
            if (isSimulating) {
                this.statusIndicator.classList.remove("stopped");
                if (this.statusText) this.statusText.textContent = "Simulating Active Traffic";
            } else {
                this.statusIndicator.classList.add("stopped");
                if (this.statusText) this.statusText.textContent = "Traffic Simulation Paused";
            }
        }
    }

    // --- Step-by-Step Walkthrough Player ---

    getSequenceSteps() {
        return STEP_SEQUENCES[this.currentSystemKey] || [
            { nodeId: "ingress", step: 1, title: "Client Edge Ingress", desc: "Client sends API request to Edge CDN / Load Balancer." },
            { nodeId: "proxy", step: 2, title: "Compute Processing", desc: "Stateless container service processes business rules." },
            { nodeId: "redis", step: 3, title: "Cache Tier Lookup", desc: "Checks low-latency in-memory cache for fast read hit." },
            { nodeId: "db", step: 4, title: "Database Persistence", desc: "Persists state updates to relational/NoSQL primary data store." }
        ];
    }

    getActiveStepNodeId() {
        if (this.currentStepIndex < 0) return null;
        const steps = this.getSequenceSteps();
        return steps[this.currentStepIndex] ? steps[this.currentStepIndex].nodeId : null;
    }

    nextStep() {
        const steps = this.getSequenceSteps();
        if (this.currentStepIndex < steps.length - 1) {
            this.currentStepIndex++;
        } else {
            this.currentStepIndex = 0; // Loop back to start
        }
        this.executeCurrentStep();
    }

    prevStep() {
        const steps = this.getSequenceSteps();
        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
        } else {
            this.currentStepIndex = steps.length - 1;
        }
        this.executeCurrentStep();
    }

    toggleStepAutoPlay() {
        if (this.autoPlayInterval) {
            this.stopStepAutoPlay();
        } else {
            this.startStepAutoPlay();
        }
    }

    startStepAutoPlay() {
        if (this.stepPlayBtn) this.stepPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Tour';
        this.nextStep();
        this.autoPlayInterval = setInterval(() => {
            this.nextStep();
        }, 3500);
    }

    stopStepAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
        if (this.stepPlayBtn) this.stepPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i> Play Tour';
    }

    executeCurrentStep() {
        const steps = this.getSequenceSteps();
        const step = steps[this.currentStepIndex];

        if (step) {
            this.selectNode(step.nodeId);
            this.renderDiagram();
            this.updateStepBanner();
        }
    }

    updateStepBanner() {
        const steps = this.getSequenceSteps();
        if (this.currentStepIndex < 0) {
            if (this.stepCounter) this.stepCounter.textContent = `0 / ${steps.length}`;
            if (this.stepTitle) this.stepTitle.textContent = "Interactive Architecture Tour";
            if (this.stepDesc) this.stepDesc.textContent = "Click 'Next Step' or 'Play Tour' to walk through request execution sequence.";
            return;
        }

        const step = steps[this.currentStepIndex];
        if (this.stepCounter) this.stepCounter.textContent = `${this.currentStepIndex + 1} / ${steps.length}`;
        if (this.stepTitle) this.stepTitle.textContent = `Step ${step.step}: ${step.title}`;
        if (this.stepDesc) this.stepDesc.textContent = step.desc;
    }
}

// Initialize Application when DOM ready
document.addEventListener("DOMContentLoaded", () => {
    window.app = new App();
});
