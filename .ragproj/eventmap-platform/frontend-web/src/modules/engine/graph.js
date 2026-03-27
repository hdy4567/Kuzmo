import knn from 'rbush-knn';
import { state } from '../core/state.js';
import { EventDB } from '../core/db.js';
import { calculateDistance, cosineSimilarity } from '../core/utils.js';

/**
 * 🗺️ KZM Graph Engine (Obsidian-Style)
 * ===================================
 * 패킷 간의 지리적/의미적 인력을 계산하고 에지(Edge)를 관리합니다.
 */

/**
 * 🔗 [SOTA] 인접 노드 검색 및 하이브리드 링크 생성 (v25.0)
 * R-Tree를 통한 공간 쿼리(O(log N))와 벡터 유사도를 결합한 고도화.
 */
export async function updateNodeLinks(targetId) {
    const node = state.eventStore.find(e => e.id === targetId);
    if (!node || !node.lat || !node.lng) return;

    const config = state.graphConfigs;
    const newLinks = [];

    // 1. [OPTIMIZATION] R-Tree 기반 공간 쿼리 (Batch neighbor scan)
    // 반경 Threshold 근처의 후보군만 선별 (O(log N))
    const searchPad = 0.5; // 약 50km 패딩 (경도/위도 대략적)
    const neighbors = state.spatialIndex.search({
        minX: node.lng - searchPad, minY: node.lat - searchPad,
        maxX: node.lng + searchPad, maxY: node.lat + searchPad
    });

    neighbors.forEach(match => {
        if (match.id === targetId) return;
        const other = state.eventStore.find(e => e.id === match.id);
        if (!other) return;

        // --- 하이브리드 스코어링 (Hybrid Linkage Scoring) ---
        const dist = calculateDistance(node.lat, node.lng, other.lat, other.lng);
        if (dist > config.radiusThreshold * 1.5) return; // 하드 컷오프

        // [WEIGHT 1] 지리적 근접성 (Physical Proximity)
        const geoStrength = Math.max(0, 1.0 - (dist / config.radiusThreshold));

        // [WEIGHT 2] 의미적 유사도 (Semantic Vector Similarity)
        let semanticStrength = 0;
        if (node.embedding && other.embedding) {
            semanticStrength = cosineSimilarity(node.embedding, other.embedding);
        }

        // [WEIGHT 3] 시간적 근접성 (Temporal Proximity)
        const timeDiff = Math.abs((node.timestamp || Date.now()) - (other.timestamp || Date.now()));
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const timeStrength = Math.max(0.1, 1.0 - (timeDiff / (sevenDays * 4))); // 1개월 쇠퇴

        // [HYBRID COMBINATION] 지리적 거리 + 시간 + 의미적 유사도 (옵시디언 스타일)
        const totalStrength = (geoStrength * 0.35) + (semanticStrength * 0.5) + (timeStrength * 0.15);

        if (totalStrength > 0.45) { // 하이퍼파라미터: 링크 생성 임계값
            newLinks.push({
                id: `link_${node.id}_${other.id}`,
                source: node.id,
                target: other.id,
                strength: totalStrength,
                type: semanticStrength > 0.7 ? 'SEMANTIC' : 'GEO',
                distance: dist,
                similarity: semanticStrength
            });
        }
    });

    // 3. 상태 업데이트 및 DB 영속화 (Top-K 최적화)
    const filteredLinks = newLinks.sort((a,b) => b.strength - a.strength).slice(0, config.maxLinksPerNode);
    
    // 기존 링크 제거 (해당 노드 관련 양방향 갱신)
    state.graphLinks = state.graphLinks.filter(l => l.source !== targetId && l.target !== targetId);
    state.graphLinks.push(...filteredLinks);

    rebuildEdgeMap();

    // DB 배치 저장
    for (const l of filteredLinks) {
        await EventDB.putLink(l);
    }
}

/**
 * 🔄 전수 그래프 재검토 (Step 0.13 - Decay & GC)
 */
export async function auditGraphConnectivity() {
    const config = state.graphConfigs;
    const initialCount = state.graphLinks.length;

    // 120% 임계값 기반 Soft Decay 검사
    state.graphLinks = state.graphLinks.filter(link => {
        const s = state.eventStore.find(e => e.id === link.source);
        const t = state.eventStore.find(e => e.id === link.target);
        if (!s || !t) return false;

        const dist = calculateDistance(s.lat, s.lng, t.lat, t.lng);
        return dist <= (config.radiusThreshold * config.decayHysteresis);
    });

    if (state.graphLinks.length !== initialCount) {
        console.log(`🧹 [GRAPH-GC] Purged ${initialCount - state.graphLinks.length} dead links.`);
        rebuildEdgeMap();
        // DB 반영은 무거울 수 있으므로 메모리 먼저, 나중에 배치 저장
    }
}

function rebuildEdgeMap() {
    state.graphEdges.clear();
    state.graphLinks.forEach(l => {
        if (!state.graphEdges.has(l.source)) state.graphEdges.set(l.source, []);
        state.graphEdges.get(l.source).push(l);
    });
}

/**
 * 🚀 [BATCH-LINK] 대량 데이터 유입 시 일괄 연결 계산 (Step 0.03 대비)
 */
export async function batchUpdateLinks(newNodes) {
    if (!newNodes || newNodes.length === 0) return;
    
    console.log(`📊 [GRAPH] Batch updating ${newNodes.length} nodes...`);
    
    // 단순 무식한 N*M 스캔 (추후 R-Tree 최적화 대상)
    for (const node of newNodes) {
        await updateNodeLinks(node.id);
    }
}
