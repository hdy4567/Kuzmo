import * as L from 'leaflet';
import { $geo } from '@modules/map/services/kzm_geo_service';
import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';

/**
 * 🛰️ KzmRegionManager (v1.0 - Modular Geometry Controller)
 * ========================================================
 * Role: Handles GeoJSON loading, regional warping, and focal glows.
 * Part of the KzmMapEngine refactor for Clean Architecture.
 */
export class KzmRegionManager {
    private activeLayer: L.FeatureGroup | null = null;
    private map: L.Map | null = null;

    public attach(map: L.Map): void {
        this.map = map;
    }

    public async warp(country: 'KR' | 'JP', regionName: string): Promise<void> {
        if (!this.map) return;

        // 1. Precise Coordinate Warp
        const coords = $geo.getCoords(regionName);
        if (coords) {
            this.map.flyTo([coords.lat, coords.lng], 10, { animate: true, duration: 1.5 });
        }

        // 2. Load & Sync Boundaries
        await this.initLayer(country);

        if (this.activeLayer) {
            const parentRegion = $geo.getParentRegion(regionName);
            this.activeLayer.eachLayer((layer: any) => {
                const props = layer.feature.properties;
                const regionLower = regionName.toLowerCase();
                const parentLower = parentRegion.toLowerCase();

                const isMatch = [props.nam, props.name, props.name_eng, props.NAME_1, props.NAME_LOCAL]
                    .some(val => {
                        if (!val) return false;
                        const v = val.toString().toLowerCase();
                        return v.includes(regionLower) || regionLower.includes(v) || v === parentLower;
                    });

                if (isMatch) {
                    this.focus(layer.feature, layer as L.Path, country);
                    const bounds = (layer as any).getBounds();
                    if (bounds && bounds.isValid()) this.map?.flyToBounds(bounds, { padding: [100, 100], duration: 1.5 });
                }
            });
        }
    }

    public async initLayer(country: 'KR' | 'JP'): Promise<void> {
        if (!this.map) return;
        
        if (this.activeLayer) this.map.removeLayer(this.activeLayer);

        try {
            const data = await $geo.loadRegionGeoJSON(country);
            this.activeLayer = L.geoJSON(data, {
                style: { color: 'transparent', fillColor: 'transparent', fillOpacity: 0 },
                onEachFeature: (feature, layer) => {
                    layer.on({
                        click: (e: any) => {
                            L.DomEvent.stopPropagation(e);
                            this.focus(feature, layer as L.Path, country);
                        },
                        mouseover: () => (layer as L.Path).setStyle({ fillOpacity: 0.3, stroke: true, weight: 1 }),
                        mouseout: () => (layer as L.Path).setStyle({ fillOpacity: 0, stroke: false })
                    });
                }
            }).addTo(this.map);
        } catch (e) {
            $log.log('WARN', 'REGION_MANAGER', `${country} overlay loading failed.`);
        }
    }

    public clearFocus(): void {
        this.activeLayer?.eachLayer((l: any) => {
            if (l.getElement && l.getElement()) {
                l.getElement().classList.remove('kzm-region-focus');
                l.setStyle({ fillOpacity: 0, stroke: false });
            }
        });
    }

    private focus(feature: any, layer: L.Path, country: string): void {
        const props = feature.properties;
        const regionName = props.nam || props.name || "Unknown Area";

        this.clearFocus();

        if (layer.getElement && layer.getElement()) {
            layer.getElement()!.classList.add('kzm-region-focus');
        }

        const label = $geo.getRegionLabel(regionName);
        $broker.emit('UI_TOAST_OPEN', { message: label, type: 'INFO', duration: 3000 });
        $broker.emit('REGION_FOCUSED', { name: regionName, label, country });
        $log.log('INFO', 'REGION_MANAGER', `Focal Sync: ${regionName}`);
    }
}

export const $regionManager = new KzmRegionManager();
