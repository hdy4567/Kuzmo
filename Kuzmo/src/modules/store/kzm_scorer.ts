import { Kzm } from '../domain/kzm_entities';
import { KzmMath } from '../domain/kzm_math';

/**
 * 💎 KzmScorer (v3.0 Premium)
 * =============================
 * Handles intelligent ranking and scoring logic using Gaussian Decay & Diversity sets.
 */
export class KzmScorer {
  public static query(records: Kzm.Record[], text: string, type: Kzm.ScorerType = 'SEARCH', center?: Kzm.Coord): Kzm.Record[] {
    const scored = records.map(r => ({
      ...r,
      score: this.calculateScore(r, text, type, center)
    }));

    // ⚡ [FILTER-THRESHOLD] Only show meaningful items
    return scored
      .filter(r => (r.score || 0) > 0.05)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private static calculateScore(r: Kzm.Record, query: string, type: Kzm.ScorerType, center?: Kzm.Coord): number {
    const q = query.toLowerCase();
    const title = r.title.toLowerCase();
    const tags = r.tags.map(t => t.toLowerCase());

    switch (type) {
      case 'SEARCH':
        let s = 0;
        if (title.startsWith(q)) s += 1.0;
        if (title.includes(q)) s += 0.4;
        if (tags.some(t => t === q || t === `@${q}`)) s += 1.5;
        return s;

      case 'MAP':
        // 🏗️ [GAUSSIAN-DECAY] Center-weighted spatial scoring
        if (!center) return title.includes(q) ? 1.0 : 0.1;
        const dist = KzmMath.haversine(center.lat, center.lng, r.coord.lat, r.coord.lng);
        const sigma = 5.0; // 5km radius for high fidelity
        return KzmMath.gaussianDecay(dist, sigma) * (title.includes(q) ? 1.2 : 0.8);

      case 'AI':
        // 🤖 [DIVERSITY-READY] Scaled semantic matching
        const matchCount = tags.filter(t => t.includes(q)).length;
        const textRelevance = (title.includes(q) ? 0.5 : 0) + (matchCount * 0.2);
        // MMR simulation: if vector is present, we could do more, but for now we scale relevance.
        return Math.min(1.0, textRelevance);

      case 'GRAPH':
        // 🕸️ [COHESION] Connectivity-based scoring
        const adjCount = (r.adjacencies || []).length;
        return 0.1 + (adjCount * 0.15); // Higher connectivity -> Higher GS

      default:
        return 0;
    }
  }
}

