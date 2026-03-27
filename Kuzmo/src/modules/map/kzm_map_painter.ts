import L from 'leaflet';
import { Kzm } from '../domain/kzm_entities';

/**
 * 🎨 KzmMapPainter
 * =========================
 * Specialized submodule for rendering complex map elements like graph edges.
 */
export class KzmMapPainter {
  public static drawGraph(layer: L.LayerGroup, records: Kzm.Record[], edges: Kzm.Edge[]): void {
    if (!layer) return;
    layer.clearLayers();

    edges.forEach((edge: Kzm.Edge) => {
      const s = records.find((n: Kzm.Record) => n.id === edge.source);
      const t = records.find((n: Kzm.Record) => n.id === edge.target);
      
      if (s && t) {
        let color = '#00e5ff'; // Default Cyan
        if (edge.type === 'GEO') color = '#D9F160';
        if (edge.type === 'SEMANTIC') color = '#FF7A42';
        if (edge.type === 'TEMPORAL') color = '#9D50FF';

        L.polyline([[s.coord.lat, s.coord.lng], [t.coord.lat, t.coord.lng]], {
          color: color,
          weight: Math.max(1, (edge.bondStrength || 0.5) * 3),
          opacity: (edge.bondStrength || 0.5) * 0.7,
          className: 'rag-edge-glow'
        }).addTo(layer);
      }
    });
  }
}
