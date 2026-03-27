import RBush from 'rbush';
import { Kzm } from '../../domain/kzm_entities';

export interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;
}

/**
 * 🌲 KzmSpatialSearchService (v1.0)
 * ==============================
 * R-Tree powered viewport windowing & spatial indexing.
 */
export class KzmSpatialSearchService {
  private spatialIndex: RBush<SpatialItem> = new RBush();

  /**
   * 🌳 Rebuild the entire spatial index from scratch.
   */
  public rebuildIndex(records: Kzm.Record[]): void {
    this.spatialIndex.clear();
    const items: SpatialItem[] = records.map(r => ({
      minX: r.coord.lng,
      minY: r.coord.lat,
      maxX: r.coord.lng,
      maxY: r.coord.lat,
      id: r.id
    }));
    this.spatialIndex.load(items);
    console.log(`🌲 SpatialIndex: Indexed ${items.length} records.`);
  }

  /**
   * ⚡ Query records within the specified rectangular bounds.
   */
  public search(minX: number, minY: number, maxX: number, maxY: number): string[] {
    return this.spatialIndex.search({ minX, minY, maxX, maxY }).map(item => item.id);
  }

  /**
   * 🧺 Get all active IDs within the viewport.
   */
  public getViewportInboundIds(bounds: { getWest: () => number, getSouth: () => number, getEast: () => number, getNorth: () => number }): Set<string> {
    const ids = this.search(
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    );
    return new Set(ids);
  }
}
