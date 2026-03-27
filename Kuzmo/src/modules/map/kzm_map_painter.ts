import L from 'leaflet';
import { Kzm } from '../domain/kzm_entities';

/**
 * 🎨 KzmMapPainter (v3.0 Stellar Ready)
 * =========================
 * Specialized submodule for rendering complex map elements like graph edges and constellations.
 */
export class KzmMapPainter {
  /**
   * 🕸️ [GRAPH-LINK] Regular Relationship Edges
   */
  public static drawGraph(layer: L.LayerGroup, records: Kzm.Record[], edges: Kzm.Edge[]): void {
    if (!layer) return;
    // Note: We don't clear here because multiple types may co-exist on the same layer group
    // But usually clearLayers() is called by the caller MapEngine.
    
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
          weight: Math.max(1, (edge.bondStrength || 0.5) * 2.5),
          opacity: (edge.bondStrength || 0.5) * 0.6,
          className: 'rag-edge-glow'
        }).addTo(layer);
      }
    });
  }

  /**
   * 🌌 [STELLAR-EDGE] Tag-based Constellation Links
   * Draws a sequence of links between nodes sharing the same target tag.
   */
  public static drawConstellation(layer: L.LayerGroup, records: Kzm.Record[]): void {
    if (!layer || records.length < 2) return;

    const points = records.map(r => L.latLng(r.coord.lat, r.coord.lng));
    
    // Connect in a chain for a constellation look
    for (let i = 0; i < points.length - 1; i++) {
        L.polyline([points[i], points[i+1]], {
            color: '#00e5ff', // Stark Cyan Neon
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10',
            className: 'stellar-link-animation'
        }).addTo(layer);
    }

    // Connect last to first if > 2 for a closed loop/cluster feel
    if (points.length > 2) {
        L.polyline([points[points.length-1], points[0]], {
            color: '#00e5ff',
            weight: 2,
            opacity: 0.4,
            dashArray: '5, 5',
            className: 'stellar-link-animation'
        }).addTo(layer);
    }
  }
}

