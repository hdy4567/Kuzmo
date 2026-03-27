import L from 'leaflet';
import { $store } from '../state/kuzmo_reactive_store';
import { Kzm } from '../core/kuzmo_domain';

/**
 * 🗺️ MapVortex (v1.0)
 * =============================
 * Intuitive map logic centered on event visualization.
 * Clean modularity to prevent recursive redraws.
 */
export class MapVortex {
  private instance: L.Map | null = null;
  private markers: Map<string, L.Marker> = new Map();
  private clusterGroup: L.LayerGroup | null = null;

  public async initialize(target: string) {
    if (this.instance) return;

    this.instance = L.map(target, {
      center: [37.5665, 126.9780],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.instance);

    // 🔔 Listen for store updates
    $store.subscribe((event) => {
      if (['RECORD_ADDED', 'BULK_LOADED'].includes(event)) {
        this.renderMarkers();
      }
    });

    console.log("🗺️ MapVortex Initialized.");
  }

  // 🛡️ [PREMIUM-RENDER]
  private renderMarkers() {
    if (!this.instance) return;

    $store.records.forEach((record) => {
      if (this.markers.has(record.id)) return; // 🚫 Skip existing

      const marker = L.marker([record.coord.lat, record.coord.lng], {
        icon: this.createNeonIcon(record.category)
      });

      marker.bindPopup(this.createPremiumPopup(record));
      marker.addTo(this.instance!);
      this.markers.set(record.id, marker);
    });
  }

  private createNeonIcon(category: string) {
    return L.divIcon({
      className: `kzm-marker kzm-marker-${category.toLowerCase()}`,
      html: `<div class="marker-pulse-ring"></div><div class="marker-core"></div>`,
      iconSize: [24, 24]
    });
  }

  private createPremiumPopup(record: Kzm.Record) {
    return `
      <div class="kzm-popup glass">
        <h3 class="popup-title">${record.title}</h3>
        <p class="popup-region">📍 ${record.region}</p>
        <div class="popup-tags">${record.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
    `;
  }
}

export const $map = new MapVortex();
