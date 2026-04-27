import * as L from 'leaflet';
import { Kzm } from '@kzm/modules/memo/db/kzm_memo_entities';
import { $store } from '@modules/kernel/persistence/kzm_kernel_store';
import { $broker } from '@modules/kernel/logic/kzm_shell_broker';

/**
 * 🐚 KzmConchMarkerRenderer (v12.9 - Repaired Additive Sovereignty)
 * ========================================================
 * Role: Principal renderer for 'Godong' (Conch) markers.
 * Action: Generated missing markers Map to resolve TSC error.
 */
export class KzmConchMarkerRenderer {
    private layer: L.LayerGroup | null = null;
    private markers: Map<string, L.Marker> = new Map();

    constructor() { }

    public attach(layer: L.LayerGroup): void {
        this.layer = layer;
    }

    public setVisible(visible: boolean): void {
        if (!this.layer) return;
        // LayerGroup visibility managed via Map engine in v12.0
    }

    public renderRecords(records: Kzm.Record[]): void {
        if (!this.layer) return;

        this.layer.clearLayers();
        this.markers.clear();

        records.forEach(record => {
            const isSelected = $store.selectedIds.has(record.id);
            const icon = this.createConchIcon(record, isSelected);

            if (!record.geoCoord || record.geoCoord.geoLat == null || record.geoCoord.geoLng == null) return;

            const marker = L.marker([record.geoCoord.geoLat, record.geoCoord.geoLng], {
                icon: icon,
                zIndexOffset: isSelected ? 1000 : 0
            }).addTo(this.layer!);

            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                $broker.emit('PACKET_FOCUSED', record);
            });

            this.markers.set(record.id, marker);
        });
    }

    private createConchIcon(record: Kzm.Record, isSelected: boolean): L.DivIcon {
        const gradientId = `conch-glow-${record.id}`;
        return L.divIcon({
            className: 'kzm-conch-marker-wrapper',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            html: `
                <div class="kzm-marker-conch ${isSelected ? 'selected' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <!-- ⭕ Optimized Neon Circle -->
                        <circle cx="12" cy="12" r="10" 
                            fill="${isSelected ? 'rgba(157, 80, 255, 0.4)' : 'rgba(30, 30, 40, 0.9)'}" 
                            stroke="${isSelected ? '#fff' : 'var(--kzm-primary)'}" 
                            stroke-width="2.5"/>
                        
                        <!-- 🔮 Core Orb -->
                        <circle cx="12" cy="12" r="5" fill="url(#${gradientId})" class="neon-pulse"/>
                        
                        <defs>
                            <radialGradient id="${gradientId}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) rotate(90) scale(6)">
                                <stop stop-color="${isSelected ? '#fff' : '#B28BFF'}"/>
                                <stop offset="1" stop-color="var(--kzm-primary)" stop-opacity="0"/>
                            </radialGradient>
                        </defs>
                    </svg>
                </div>
            `
        });
    }
}
