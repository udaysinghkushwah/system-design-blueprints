/**
 * Inspector Panel Module for Interactive Explorer
 * Handles node selection details, payload/config/metrics tabs, and copy code buttons with toast notifications.
 */

export class InspectorPanel {
    constructor() {
        this.insCategory = document.getElementById("ins-category");
        this.insTitle = document.getElementById("ins-title");
        this.insDescription = document.getElementById("ins-description");
        this.insPayload = document.getElementById("ins-payload");
        this.insConfig = document.getElementById("ins-config");
        this.techStackContainer = document.getElementById("system-tech-stack");
        this.docLinkButton = document.getElementById("system-doc-link");

        // Metric nodes
        this.metricQps = document.getElementById("node-metric-qps");
        this.metricCpu = document.getElementById("node-metric-cpu");
        this.metricRam = document.getElementById("node-metric-ram");

        this.initTabs();
        this.initCopyButtons();
    }

    initTabs() {
        const tabBtns = document.querySelectorAll(".tab-btn");
        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTab = btn.getAttribute("data-tab");
                
                tabBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
                const activeContent = document.getElementById(`tab-${targetTab}`);
                if (activeContent) {
                    activeContent.classList.remove("hidden");
                }
            });
        });
    }

    initCopyButtons() {
        document.addEventListener("click", (e) => {
            const copyBtn = e.target.closest(".copy-code-btn");
            if (!copyBtn) return;

            const targetId = copyBtn.getAttribute("data-copy-target");
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                const codeText = targetElement.textContent;
                navigator.clipboard.writeText(codeText).then(() => {
                    this.showToast("Copied to Clipboard! 📋");
                }).catch(err => {
                    console.error("Copy failed:", err);
                });
            }
        });
    }

    updateNodeDetails(nodeData, systemData) {
        if (!nodeData) return;

        if (this.insCategory) this.insCategory.textContent = nodeData.category || "Service Node";
        if (this.insTitle) this.insTitle.textContent = nodeData.name || "System Node";
        if (this.insDescription) this.insDescription.textContent = nodeData.description || "";
        if (this.insPayload) this.insPayload.textContent = nodeData.payload || "// No payload data available";
        if (this.insConfig) this.insConfig.textContent = nodeData.config || "# No terraform config available";

        // Generate dynamic node metric values
        const randomQps = Math.floor(Math.random() * 30000 + 15000).toLocaleString();
        const randomCpu = Math.floor(Math.random() * 40 + 30);
        const randomRam = Math.floor(Math.random() * 35 + 45);

        if (this.metricQps) this.metricQps.textContent = `${randomQps} QPS`;
        if (this.metricCpu) this.metricCpu.textContent = `${randomCpu}%`;
        if (this.metricRam) this.metricRam.textContent = `${randomRam}%`;

        // Update tech stack list if systemData provided
        if (systemData && this.techStackContainer) {
            this.techStackContainer.innerHTML = "";
            if (systemData.techStack && systemData.techStack.length > 0) {
                systemData.techStack.forEach(item => {
                    const techEl = document.createElement("div");
                    techEl.className = "tech-item";
                    techEl.innerHTML = `
                        <span class="tech-service">${this.escapeHtml(item.service)}</span>
                        <span class="tech-role">${this.escapeHtml(item.role)}</span>
                    `;
                    this.techStackContainer.appendChild(techEl);
                });
            }
        }

        if (systemData && this.docLinkButton && systemData.docLink) {
            this.docLinkButton.href = systemData.docLink;
        }
    }

    showToast(message) {
        let toast = document.getElementById("app-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "app-toast";
            toast.className = "toast-notification";
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 2200);
    }

    escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
}
