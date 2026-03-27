import { Kzm } from '../domain/kzm_entities';
export class KzmGraphEngine {
  // ⚙️ [CONFIG] Hybrid Logic Weights
  private static readonly WEIGHT_GEO = 0.45;
  private static readonly WEIGHT_TIME = 0.15;
  private static readonly WEIGHT_SEMANTIC = 0.40;
  private static readonly RADIUS_LIMIT = 0.05; // ~5km Max Geo

  /**
   * 🕸️ [DYNAMIC-LINKAGE] Compute Intelligence-based Edges
   * =====================================================
   * Formula: S = (wd·D) + (wt·T) + (ws·σ)
   */
  public static computeLinks(records: Kzm.Record[]): Kzm.Edge[] {
    const edges: Kzm.Edge[] = [];
    if (records.length < 2) return [];

    for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
            const a = records[i];
            const b = records[j];

            const geoScore = this.calculateGeoScore(a, b);
            const timeScore = this.calculateTimeScore(a, b);
            const semanticScore = this.calculateSemanticScore(a, b);

            const totalScore = (geoScore * this.WEIGHT_GEO) + 
                               (timeScore * this.WEIGHT_TIME) + 
                               (semanticScore * this.WEIGHT_SEMANTIC);

            // ⚡ [THRESHOLD-GATE] Only maintain links with S > 0.35
            if (totalScore > 0.35) {
                const type = this.determinePrimaryType(geoScore, semanticScore, timeScore);
                edges.push({
                    id: `edge_${a.id}_${b.id}`,
                    source: a.id,
                    target: b.id,
                    weight: totalScore,
                    type: type,
                    bondStrength: Math.min(1.0, totalScore * 1.2) // Amplified for visual feedback
                });
            }
        }
    }
    return edges;
  }

  private static calculateGeoScore(a: Kzm.Record, b: Kzm.Record): number {
    const d = Math.sqrt(Math.pow(a.coord.lat - b.coord.lat, 2) + Math.pow(a.coord.lng - b.coord.lng, 2));
    if (d > this.RADIUS_LIMIT) return 0;
    return 1.0 - (d / this.RADIUS_LIMIT);
  }

  private static calculateTimeScore(a: Kzm.Record, b: Kzm.Record): number {
    const delta = Math.abs(a.createdAt - b.createdAt);
    const dayMs = 86400000;
    if (delta > dayMs * 7) return 0; // Decay after 7 days
    return 1.0 - (delta / (dayMs * 7));
  }

  private static calculateSemanticScore(a: Kzm.Record, b: Kzm.Record): number {
    const commonTags = a.tags.filter(t => b.tags.includes(t));
    if (commonTags.length === 0) return 0;
    
    // Tag-Link Strength: Exact match on multiple tags boosts similarity towards 1.0
    return Math.min(1.0, commonTags.length * 0.3); 
  }

  private static determinePrimaryType(g: number, s: number, t: number): Kzm.RelationType {
    if (s > g && s > t) return 'SEMANTIC';
    if (g > t) return 'GEO';
    return 'TEMPORAL';
  }
}
