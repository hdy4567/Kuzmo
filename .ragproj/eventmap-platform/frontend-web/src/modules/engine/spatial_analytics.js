import { state } from '../core/state.js';
import { calculateDistance, cosineSimilarity } from '../core/utils.js';

/**
 * 🏔️ [SOTA] Spatial & Intelligence Analytics Engine
 * DBSCAN, HNSW-like similarity, and Advanced Clustering.
 */

/**
 * 🛸 [DBSCAN] Density-Based Spatial Clustering of Applications with Noise
 * 무질서한 핀들을 논리적인 '이벤트(사건)' 단위로 묶어 가독성을 제공합니다.
 */
export function clusterEventsSpatial(eps = 0.5, minPts = 3) {
    // ⚡ [DYNAMIC-AGGRESSION] (v25.0) 프레임 드랍 시 반격 반경 확대
    const adaptiveEps = eps * (state.clusterAggression || 1.0);
    const data = state.eventStore;
    const visited = new Set();
    const clusters = [];

    data.forEach(point => {
        if (visited.has(point.id)) return;
        visited.add(point.id);

        const neighbors = getNeighbors(point, adaptiveEps);

        if (neighbors.length < minPts) {
            // Noise (skipped for now)
        } else {
            const cluster = [];
            expandCluster(point, neighbors, cluster, adaptiveEps, minPts, visited);
            clusters.push(cluster);
        }
    });

    console.log(`📊 [DBSCAN] Detected ${clusters.length} high-density event clusters.`);
    return clusters;
}

function expandCluster(point, neighbors, cluster, eps, minPts, visited) {
    cluster.push(point);
    
    let i = 0;
    while (i < neighbors.length) {
        const nextPoint = neighbors[i];
        if (!visited.has(nextPoint.id)) {
            visited.add(nextPoint.id);
            const nextNeighbors = getNeighbors(nextPoint, eps);
            if (nextNeighbors.length >= minPts) {
                neighbors.push(...nextNeighbors.filter(n => !neighbors.some(un => un.id === n.id)));
            }
        }
        if (!cluster.some(p => p.id === nextPoint.id)) {
            cluster.push(nextPoint);
        }
        i++;
    }
}

function getNeighbors(point, eps) {
    // 🌳 R-Tree Optimized Neighbor Search (O(log N))
    const searchPad = eps / 111; // Approx KM to Lat/Lng degree
    const results = state.spatialIndex.search({
        minX: point.lng - searchPad, minY: point.lat - searchPad,
        maxX: point.lng + searchPad, maxY: point.lat + searchPad
    });

    return results
        .map(r => state.eventStore.find(e => e.id === r.id))
        .filter(e => e && calculateDistance(point.lat, point.lng, e.lat, e.lng) <= eps);
}

/**
 * 🧠 [SEMANTIC-WINDOWING] 현재 화면 내에서 가장 의미적으로 중요한 노드 선별
 */
export function getTopSemanticNodes(queryEmbedding, limit = 5) {
    const bounds = state.map.getBounds();
    
    // 1. 화면 내에서만 검색 (Spatial Pruning)
    const inView = state.spatialIndex.search({
        minX: bounds.getWest(), minY: bounds.getSouth(),
        maxX: bounds.getEast(), maxY: bounds.getNorth()
    });

    const candidates = inView
        .map(m => state.eventStore.find(e => e.id === m.id))
        .filter(e => e && e.embedding);

    // 2. 유사도 소팅
    return candidates
        .map(e => ({ ...e, similarity: cosineSimilarity(queryEmbedding, e.embedding) }))
        .sort((a,b) => b.similarity - a.similarity)
        .slice(0, limit);
}
