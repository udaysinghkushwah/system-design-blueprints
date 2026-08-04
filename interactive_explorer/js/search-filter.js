/**
 * Search & Filter Module for Interactive Explorer Sidebar
 * Real-time filter across system design buttons with keyboard shortcut support.
 */

export class SidebarSearchFilter {
    constructor(onSelectSystemCallback) {
        this.searchInput = document.getElementById("system-search");
        this.navGroups = document.querySelectorAll(".nav-group");
        this.systemButtons = document.querySelectorAll(".nav-item[data-system]");
        this.onSelectSystem = onSelectSystemCallback;

        this.initSearch();
        this.updateGroupCounts();
    }

    initSearch() {
        if (!this.searchInput) return;

        this.searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            this.filterSystems(query);
        });

        // Clear search on Escape key
        this.searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.searchInput.value = "";
                this.filterSystems("");
                this.searchInput.blur();
            }
        });
    }

    filterSystems(query) {
        this.navGroups.forEach(group => {
            let matchCount = 0;
            const buttons = group.querySelectorAll(".nav-item[data-system]");

            buttons.forEach(btn => {
                const label = btn.querySelector(".nav-label")?.textContent.toLowerCase() || "";
                const systemKey = btn.getAttribute("data-system") || "";

                if (query === "" || label.includes(query) || systemKey.includes(query)) {
                    btn.style.display = "flex";
                    matchCount++;
                } else {
                    btn.style.display = "none";
                }
            });

            // Toggle category group visibility
            if (matchCount > 0) {
                group.style.display = "flex";
            } else {
                group.style.display = "none";
            }

            // Update badge count
            const countBadge = group.querySelector(".count-badge");
            if (countBadge) {
                countBadge.textContent = matchCount;
            }
        });
    }

    updateGroupCounts() {
        this.navGroups.forEach(group => {
            const buttons = group.querySelectorAll(".nav-item[data-system]");
            const titleEl = group.querySelector("h3");
            
            if (titleEl && !group.querySelector(".count-badge")) {
                const countBadge = document.createElement("span");
                countBadge.className = "count-badge";
                countBadge.textContent = buttons.length;
                titleEl.appendChild(countBadge);
            }
        });
    }

    focusSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
            this.searchInput.select();
        }
    }
}
