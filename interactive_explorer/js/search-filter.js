/**
 * Search & Filter Module for Interactive Explorer Sidebar & Command Palette (⌘K)
 * Handles level pill filters, sidebar accordion groups, and full keyboard-driven Command Palette modal.
 */

import { SYSTEMS } from './systems-data.js';

export class SidebarSearchFilter {
    constructor(onSelectSystemCallback) {
        this.navGroups = document.querySelectorAll(".nav-group");
        this.systemButtons = document.querySelectorAll(".nav-item[data-system]");
        this.filterPills = document.querySelectorAll(".filter-pill");
        this.onSelectSystem = onSelectSystemCallback;

        // Command Palette Elements
        this.cmdBackdrop = document.getElementById("cmd-palette-backdrop");
        this.cmdInput = document.getElementById("cmd-palette-input");
        this.cmdResults = document.getElementById("cmd-palette-results");
        this.openCmdTrigger = document.getElementById("open-cmd-palette");

        this.selectedIndex = 0;
        this.filteredResults = [];

        this.initAccordion();
        this.initPillFilters();
        this.initGroupCounts();
        this.initCommandPalette();
    }

    initAccordion() {
        document.querySelectorAll(".nav-group-header").forEach(header => {
            header.addEventListener("click", () => {
                const group = header.closest(".nav-group");
                if (group) {
                    group.classList.toggle("collapsed");
                }
            });
        });
    }

    initPillFilters() {
        this.filterPills.forEach(pill => {
            pill.addEventListener("click", () => {
                const filter = pill.getAttribute("data-filter");

                this.filterPills.forEach(p => p.classList.remove("active"));
                pill.classList.add("active");

                this.navGroups.forEach(group => {
                    const level = group.getAttribute("data-level");
                    if (filter === "all" || level === filter || level === "doc") {
                        group.style.display = "flex";
                        group.classList.remove("collapsed");
                    } else {
                        group.style.display = "none";
                    }
                });
            });
        });
    }

    initGroupCounts() {
        this.navGroups.forEach(group => {
            const buttons = group.querySelectorAll(".nav-item[data-system]");
            const headerTitle = group.querySelector(".nav-group-title");
            
            if (headerTitle && buttons.length > 0 && !group.querySelector(".count-badge")) {
                const countBadge = document.createElement("span");
                countBadge.className = "count-badge";
                countBadge.textContent = buttons.length;
                headerTitle.appendChild(countBadge);
            }
        });
    }

    // --- Command Palette (⌘K) Modal Logic ---

    initCommandPalette() {
        if (this.openCmdTrigger) {
            this.openCmdTrigger.addEventListener("click", () => this.openCommandPalette());
        }

        if (this.cmdBackdrop) {
            this.cmdBackdrop.addEventListener("click", (e) => {
                if (e.target === this.cmdBackdrop) {
                    this.closeCommandPalette();
                }
            });
        }

        if (this.cmdInput) {
            this.cmdInput.addEventListener("input", (e) => {
                const query = e.target.value.toLowerCase().trim();
                this.renderCommandResults(query);
            });

            this.cmdInput.addEventListener("keydown", (e) => {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    this.moveSelection(1);
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    this.moveSelection(-1);
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    this.selectCurrentItem();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    this.closeCommandPalette();
                }
            });
        }
    }

    openCommandPalette() {
        if (!this.cmdBackdrop) return;
        this.cmdBackdrop.classList.add("active");
        if (this.cmdInput) {
            this.cmdInput.value = "";
            this.cmdInput.focus();
        }
        this.renderCommandResults("");
    }

    closeCommandPalette() {
        if (!this.cmdBackdrop) return;
        this.cmdBackdrop.classList.remove("active");
    }

    renderCommandResults(query) {
        if (!this.cmdResults) return;
        this.cmdResults.innerHTML = "";
        this.filteredResults = [];

        // Build result list from SYSTEMS
        Object.keys(SYSTEMS).forEach(key => {
            const sys = SYSTEMS[key];
            const title = sys.title || key;
            const desc = sys.description || "";

            if (query === "" || title.toLowerCase().includes(query) || key.toLowerCase().includes(query) || desc.toLowerCase().includes(query)) {
                this.filteredResults.push({ key, title, desc });
            }
        });

        if (this.filteredResults.length === 0) {
            this.cmdResults.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No system blueprints matching "${query}"</div>`;
            return;
        }

        this.selectedIndex = 0;
        this.filteredResults.forEach((item, index) => {
            const itemEl = document.createElement("div");
            itemEl.className = `cmd-item ${index === 0 ? "selected" : ""}`;
            itemEl.setAttribute("data-key", item.key);
            itemEl.innerHTML = `
                <i class="fa-solid fa-diagram-project"></i>
                <div class="cmd-item-info">
                    <span class="cmd-item-title">${this.escapeHtml(item.title)}</span>
                    <span class="cmd-item-level">${this.escapeHtml(item.desc.slice(0, 70))}...</span>
                </div>
            `;

            itemEl.addEventListener("click", () => {
                this.onSelectSystem(item.key);
                this.closeCommandPalette();
            });

            this.cmdResults.appendChild(itemEl);
        });
    }

    moveSelection(direction) {
        if (this.filteredResults.length === 0) return;
        this.selectedIndex = (this.selectedIndex + direction + this.filteredResults.length) % this.filteredResults.length;

        const items = this.cmdResults.querySelectorAll(".cmd-item");
        items.forEach((item, idx) => {
            if (idx === this.selectedIndex) {
                item.classList.add("selected");
                item.scrollIntoView({ block: "nearest" });
            } else {
                item.classList.remove("selected");
            }
        });
    }

    selectCurrentItem() {
        if (this.filteredResults[this.selectedIndex]) {
            const selectedKey = this.filteredResults[this.selectedIndex].key;
            this.onSelectSystem(selectedKey);
            this.closeCommandPalette();
        }
    }

    focusSearch() {
        this.openCommandPalette();
    }

    escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
}
