import { Kzm } from '../domain/kzm_entities';

/**
 * 💎 KzmScorer
 * =============================
 * Handles intelligent ranking and scoring logic for KZM records.
 */
export class KzmScorer {
  public static query(records: Kzm.Record[], text: string, type: Kzm.ScorerType = 'SEARCH'): Kzm.Record[] {
    const scored = records.map(r => ({
      ...r,
      score: this.calculateScore(r, text, type)
    }));

    return scored
      .filter(r => (r.score || 0) > 0.1)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private static calculateScore(r: Kzm.Record, query: string, type: Kzm.ScorerType): number {
    const q = query.toLowerCase();
    if (!q) return 0;

    const title = r.title.toLowerCase();
    const content = r.content.toLowerCase();
    const tags = r.tags.map(t => t.toLowerCase());

    switch (type) {
      case 'SEARCH':
        let s = 0;
        if (title.startsWith(q)) s += 1.0;
        if (title.includes(q) || content.includes(q)) s += 0.4;
        if (tags.some(t => t === q || t === `@${q}` || t === `#${q}`)) s += 1.5;
        return s;

      case 'MAP':
        return title.includes(q) ? 1.0 : 0.2;

      case 'AI':
        const matchCount = tags.filter(t => t.includes(q)).length;
        return 0.1 + (matchCount * 0.3);

      case 'GRAPH':
        const adjCount = (r.adjacencies || []).length;
        return 0.2 + (adjCount * 0.1);

      default:
        return 0;
    }
  }
}
