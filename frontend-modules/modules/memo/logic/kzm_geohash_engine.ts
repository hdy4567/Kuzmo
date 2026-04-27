import { Kzm } from '../db/kzm_memo_entities';

/**
 * 🗺️ KzmGeohashEngine (v1.0 - Spatial Clustering Core)
 * ========================================================
 * Role: Clusters 10,000+ points using a Grid-Based Geohash algorithm.
 * Specs: Handles missing addresses by anchoring to map center.
 * Logic: O(N) Complexity. Groups points into spatial buckets.
 */
export class KzmGeohashEngine {

  // 📏 Precision bits (higher = smaller clusters)
  private static readonly PRECISION = 10;

  /**
   * 🏗️ [CLUSTER-ACTION] Groups records into clusters or individual points
   */
  public static cluster(records: Kzm.Record[], mapCenter: Kzm.GeoCoord): Kzm.Record[] {
    const buckets: Map<string, Kzm.Record[]> = new Map();

    records.forEach(record => {
      // 🛡️ [EXCEPTION-SAFETY] Fallback for missing coordinates
      const lat = record.geoCoord?.geoLat || mapCenter.geoLat;
      const lng = record.geoCoord?.geoLng || mapCenter.geoLng;

      const hash = this.encodeGeohash(lat, lng, this.PRECISION);

      if (!buckets.has(hash)) buckets.set(hash, []);
      buckets.get(hash)!.push(record);
    });

    const result: Kzm.Record[] = [];

    buckets.forEach((group, hash) => {
      if (group.length === 1) {
        // ⛰️ SPEC: Isolated points (like Seongsan Ilchulbong) show as 1
        const single = group[0];
        single.metadata.isClustered = false;
        single.metadata.clusterCount = 1;
        result.push(single);
      } else {
        // 🌌 Create Cluster Representative
        const rep = group[0]; // Take the first as seed
        rep.metadata.isClustered = true;
        rep.metadata.clusterCount = group.length;
        result.push(rep);
      }
    });

    return result;
  }

  /**
   * 🧮 [GEOHASH-ENCODE] Super-fast integer-based grid hashing
   */
  private static encodeGeohash(lat: number, lng: number, precision: number): string {
    // simplified grid hash for 10k performance
    const latIncr = 180 / Math.pow(2, precision);
    const lngIncr = 360 / Math.pow(2, precision);

    const latGrid = Math.floor((lat + 90) / latIncr);
    const lngGrid = Math.floor((lng + 180) / lngIncr);

    return `${latGrid}_${lngGrid}`;
  }
}
