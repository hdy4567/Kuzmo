import L from 'leaflet';
import { Kzm } from '../../domain/kzm_entities';
import { $store } from '../../store/kzm_store';

/**
 * 📍 KzmMarkerHandler (v1.0)
 * ========================
 * High-performance Marker Lifecycle Manager for the Leaflet engine.
 */
export class KzmMarkerHandler {
  private markersMap: Map<string, L.Marker> = new Map();

  /**
   * 🏗️ Build or update map markers for the specified collection of records.
   */
  public refreshMarkers(
    records: Kzm.Record[],
    clusterGroup: L.MarkerClusterGroup,
    onMarkerClick: (id: string) => void
  ): void {
    clusterGroup.clearLayers();
    this.markersMap.clear();

    records.forEach((r: Kzm.Record) => {
      const color = r.category === 'MEMO' ? 'var(--kzm-primary)' : '#9d50bb';
      const marker = L.marker([r.coord.lat, r.coord.lng], {
        draggable: true,
        icon: L.divIcon({
          html: `<div class="kzm-marker-icon" style="border-color:${color}"><div class="kzm-marker-dot"></div></div>`,
          className: 'kzm-marker',
          iconSize: [32, 32]
        })
      });

      marker.on('dragend', (e) => {
        const newPos = (e.target as L.Marker).getLatLng();
        $store.updateRecord(r.id, { coord: newPos });
        console.log(`📍 Relocated [${r.id}] to [${newPos.lat}, ${newPos.lng}]`);
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onMarkerClick(r.id);
      });

      clusterGroup.addLayer(marker);
      this.markersMap.set(r.id, marker);
    });
  }

  /**
   * ✨ Highlight markers based on the current selection.
   */
  public updateHighlights(selectedIds: Set<string>): void {
    this.markersMap.forEach((marker, id) => {
      const iconEl = marker.getElement();
      if (iconEl) {
        if (selectedIds.has(id)) iconEl.classList.add('selected');
        else iconEl.classList.remove('selected');
      }
    });
  }

  /**
   * 🔍 Get the DOM element for a specific marker.
   */
  public getMarkerElement(id: string): HTMLElement | null {
    const marker = this.markersMap.get(id);
    return marker ? (marker.getElement() as HTMLElement) : null;
  }

  /**
   * 🗺️ Find markers within specific geographic bounds.
   */
  public getIdsInBounds(bounds: L.LatLngBounds): string[] {
    const ids: string[] = [];
    this.markersMap.forEach((m, id) => {
      if (bounds.contains(m.getLatLng())) ids.push(id);
    });
    return ids;
  }
}
