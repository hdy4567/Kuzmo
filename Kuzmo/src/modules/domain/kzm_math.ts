/**
 * 📐 KzmMath
 * =============================
 * Core mathematical utilities for the Kuzmo intelligence engine.
 */
export class KzmMath {
  /**
   * 🛰️ Haversine Formula (Earth Distance)
   * Calculates the great-circle distance between two points in KM.
   */
  public static haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in KM
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 🌊 Gaussian Decay
   * Used for spatial fidelity scoring. (FWHM = 2 * sigma * sqrt(2 * ln 2))
   */
  public static gaussianDecay(distance: number, sigma: number): number {
    return Math.exp(-(Math.pow(distance, 2)) / (2 * Math.pow(sigma, 2)));
  }

  /**
   * 🤖 Maximal Marginal Relevance (MMR)
   * Balances relevance and diversity in AI context selection.
   * lambda = 0.5 (Neutral), 0.9 (Relevance focused), 0.1 (Diversity focused)
   */
  public static mmrScore(relevance: number, maxSimilarityToSelected: number, lambda: number = 0.5): number {
    return lambda * relevance - (1 - lambda) * maxSimilarityToSelected;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
