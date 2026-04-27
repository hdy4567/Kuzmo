import * as L from 'leaflet';
import { $store } from '@modules/kernel/persistence/kzm_kernel_store';
import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';

/**
 * 🪐 KzmConstellationRenderer (v1.0 - Restoration)
 * ========================================================
 * Role: Connects memory markers with celestial lines (Constellations).
 * Logic: Distance-based edge generation + Zoom-sensitive visibility.
 */
export class KzmConstellationRenderer {
    private lineLayer: L.FeatureGroup = L.featureGroup();
    private map: L.Map | null = null;
    private maxDistance = 0.05; // Degree-based proximity threshold for lines
    private isVisible = false;
    private renderTask: any = null;

    constructor() { }

    public attach(map: L.Map): void {
        this.map = map;
        this.lineLayer.addTo(this.map);
        this.render();

        // Data Change Listeners
        $store.subscribe('RECORD_ADDED', () => this.render());
        $store.subscribe('RECORD_DELETED', () => this.render());

        $broker.on('MAP_LAYER_TOGGLE', (data: any) => {
            if (data.type === 'CONSTELLATION') {
                this.isVisible = data.visible;
                if (this.isVisible) {
                    this.lineLayer.addTo(this.map!);
                    this.render();
                } else {
                    this.lineLayer.remove();
                }
            }
        });

        this.map.on('zoomend', () => this.updateVisibility());
    }

    public render(): void {
        if (!this.map || !this.isVisible) return;

        // 🚀 [ASYNC-QUEUING] Cancel pending task
        if (this.renderTask) clearTimeout(this.renderTask);

        this.renderTask = setTimeout(() => {
            this.executeAsyncRender();
        }, 50); // Small buffer to prevent multi-trigger lag
    }

    private executeAsyncRender(): void {
        if (!this.map) return;
        this.lineLayer.clearLayers();

        const records = $store.records;
        if (records.length < 2) return;

        const connections: Set<string> = new Set();
        let i = 0;

        // 🛡️ [CHUNKED-PROCESSING] Divide work to prevent UI block
        const chunk = () => {
            const startTime = performance.now();
            while (i < records.length && performance.now() - startTime < 8) { // 8ms limit per frame
                for (let j = i + 1; j < records.length; j++) {
                    const r1 = records[i];
                    const r2 = records[j];
                    const dist = this.calculateDist(r1.geoCoord, r2.geoCoord);

                    if (dist < this.maxDistance) {
                        const pairId = [r1.id, r2.id].sort().join('-');
                        if (!connections.has(pairId)) {
                            this.addLine(r1, r2);
                            connections.add(pairId);
                        }
                    }
                }
                i++;
            }

            if (i < records.length) {
                requestAnimationFrame(chunk);
            } else {
                this.updateVisibility();
            }
        };

        chunk();
    }

    public clear(): void {
        this.lineLayer.clearLayers();
    }

    /**
     * 🌌 [TAG-SPECIFIC-DRAW] Link provided records directly (Stigmata Mode)
     */
    public drawLinks(records: any[]): void {
        if (!this.map) return;
        this.lineLayer.clearLayers();
        if (records.length < 2) return;

        // Directly connect all visible filtered markers in a sequence or star
        for (let i = 0; i < records.length - 1; i++) {
            const r1 = records[i];
            const r2 = records[i + 1];
            this.addLine(r1, r2, 1.0); // Full opacity for explicit tags
        }

        // Form a loop if more than 2
        if (records.length > 2) {
            this.addLine(records[records.length - 1], records[0], 1.0);
        }
    }

    private addLine(r1: any, r2: any, forceOpacity?: number): void {
        const line = L.polyline([
            [r1.geoCoord.geoLat, r1.geoCoord.geoLng],
            [r2.geoCoord.geoLat, r2.geoCoord.geoLng]
        ], {
            color: 'var(--kzm-primary)',
            weight: 2,
            opacity: forceOpacity || 0.3,
            dashArray: '5, 10',
            interactive: false,
            className: 'kzm-constellation-line neon-pulse'
        });
        this.lineLayer.addLayer(line);
    }

    private updateVisibility(): void {
        if (!this.map) return;
        const zoom = this.map.getZoom();

        // [Logic: 250px-ish Zoom Rule]
        // If zoom is too high (close in), hide the constellation lines
        // If zoom is low (far out), show the connections as a cluster
        if (zoom > 16) {
            this.lineLayer.setStyle({ opacity: 0 });
        } else {
            this.lineLayer.setStyle({ opacity: 0.3 });
        }
    }

    private calculateDist(c1: { geoLat: number, geoLng: number }, c2: { geoLat: number, geoLng: number }): number {
        return Math.sqrt(Math.pow(c1.geoLat - c2.geoLat, 2) + Math.pow(c1.geoLng - c2.geoLng, 2));
    }
}
