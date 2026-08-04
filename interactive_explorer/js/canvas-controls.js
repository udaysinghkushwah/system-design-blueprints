/**
 * Canvas Controls Module for Interactive Explorer
 * Handles SVG canvas zooming, panning, reset view, fullscreen mode, and simulation animations.
 */

export class CanvasController {
    constructor(canvasContainerId) {
        this.container = document.getElementById(canvasContainerId);
        this.scale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.simulationActive = true;
        
        this.initPanZoom();
    }

    initPanZoom() {
        if (!this.container) return;

        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            this.setZoom(this.scale * zoomFactor);
        }, { passive: false });

        this.container.addEventListener('mousedown', (e) => {
            // Only start dragging if clicking canvas background or non-interactive element
            if (e.button === 0 && !e.target.closest('.interactive-node')) {
                this.isDragging = true;
                this.startX = e.clientX - this.panX;
                this.startY = e.clientY - this.panY;
                this.container.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.panX = e.clientX - this.startX;
            this.panY = e.clientY - this.startY;
            this.applyTransform();
        });

        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.container.style.cursor = 'default';
            }
        });
    }

    setZoom(newScale) {
        this.scale = Math.min(Math.max(0.5, newScale), 2.5);
        this.applyTransform();
    }

    zoomIn() {
        this.setZoom(this.scale * 1.2);
    }

    zoomOut() {
        this.setZoom(this.scale / 1.2);
    }

    resetView() {
        this.scale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
    }

    applyTransform() {
        const svg = this.container.querySelector('svg');
        if (svg) {
            svg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
            svg.style.transformOrigin = 'center center';
            svg.style.transition = this.isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        }
    }

    toggleFullscreen() {
        const diagramCard = this.container.closest('.diagram-card');
        if (!diagramCard) return;

        if (!document.fullscreenElement) {
            if (diagramCard.requestFullscreen) {
                diagramCard.requestFullscreen();
            } else if (diagramCard.webkitRequestFullscreen) {
                diagramCard.webkitRequestFullscreen();
            }
            diagramCard.classList.add('fullscreen-mode');
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            diagramCard.classList.remove('fullscreen-mode');
        }
    }

    toggleSimulation() {
        this.simulationActive = !this.simulationActive;
        const flowLines = this.container.querySelectorAll('.data-flow-line');
        flowLines.forEach(line => {
            line.style.display = this.simulationActive ? 'block' : 'none';
        });
        return this.simulationActive;
    }
}
