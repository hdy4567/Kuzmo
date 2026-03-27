import { state } from '../../core/state.js';

/**
 * 🗺️ Map Core Engine (Leaflet Interface)
 */
export function initMap() {
    console.log("📍 [MAP-CORE] Initializing Map...");
    if (typeof L === 'undefined') throw new Error("Leaflet(L) is missing!");

    try {
        state.map = L.map('map', { 
            zoomControl: false, 
            preferCanvas: true,
            worldCopyJump: true
        }).setView([37.5665, 126.9780], 7);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(state.map);

        setupClusterGroup();
        setupLayers();
        setupEvents();

        displayInitialMarkers();

        console.log("✅ [MAP-CORE] Layer & Markers Ready.");
    } catch (err) {
        console.error("Map Init Failed:", err);
    }
}

function setupClusterGroup() {
    if (typeof L.markerClusterGroup === 'function') {
        state.clusterGroup = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 50,
            disableClusteringAtZoom: 16,
            iconCreateFunction: (c) => {
                const zoom = state.map.getZoom();
                const count = c.getChildCount();
                // 🗺️ [LOD-STRATEGY] 멀리서는 지식 밀도(Heatmap), 가까이서는 카운트 뱃지
                if (zoom < 10) {
                    const size = Math.min(30 + (count / 5), 80);
                    return L.divIcon({
                        html: `<div class="marker-cluster-heatmap" style="width:${size}px; height:${size}px;"></div>`,
                        className: 'heatmap-wrap',
                        iconSize: [size, size]
                    });
                }
                return L.divIcon({
                    html: `<div class="marker-cluster-custom"><span>${count}</span></div>`,
                    className: 'marker-cluster-wrap',
                    iconSize: [44, 44]
                });
            }
        });
    } else {
        state.clusterGroup = L.featureGroup();
    }
    state.map.addLayer(state.clusterGroup);
}

function setupLayers() {
    state.linkLayer = L.canvas({ padding: 0.5 }).addTo(state.map);
    state.linkFeatureGroup = L.featureGroup().addTo(state.map);
    state.ragHighlightLayer = L.featureGroup().addTo(state.map);
}

function setupEvents() {
    state.map.on('moveend', () => updateWindowing());
    state.map.on('zoomend', () => updateWindowing());
}

/**
 * 🌳 [SOTA] Windowing Strategy - R-Tree & Neural Re-ranking Integration (v20.0 MAX)
 * 지도가 이동하거나 줌이 변경될 때 R-Tree로 공간을 필터링하고, Neural Worker로 최종 추천 순위를 결정합니다.
 */
export async function updateWindowing() {
    if (!state.map || !state.spatialIndex) return;

    const bounds = state.map.getBounds();
    const viewport = {
        minLat: bounds.getSouth(), maxLat: bounds.getNorth(),
        minLng: bounds.getWest(), maxLng: bounds.getEast()
    };

    const { addMarkerToMap, renderGraphLinks } = await import('./map_renderer.js');
    const KuzmoQueryOptimizer = (await import('../../engine/query_optimizer.js')).default;
    
    // 1. R-Tree 기반 1차 공간 필터링 (Index Search O(log N))
    const visibleQuery = state.spatialIndex.search({
        minX: bounds.getWest(), minY: bounds.getSouth(),
        maxX: bounds.getEast(), maxY: bounds.getNorth()
    });

    if (visibleQuery.length === 0) {
        state.clusterGroup.clearLayers();
        state.markers.clear();
        return;
    }

    // 🚀 [KUZMO-MAX-PLATINUM] 2차 지능형 랭킹 레이어 가동
    // R-Tree로 걸러진 후보군(`candidates`)을 Neural Worker로 보내 퓨전 랭킹 수행
    const candidates = visibleQuery
        .map(m => state.eventStore.find(e => String(e.id) === String(m.id)))
        .filter(Boolean);
    
    const optimizedResults = await KuzmoQueryOptimizer.dispatch('PREMIUM', {
        viewport,
        candidates,
        query: state.searchQuery || "current focus",
        topK: 25 // 화면에 최적으로 노출할 마커 수 (MMR 다양성 적용됨)
    });

    const currentVisibleIds = new Set(optimizedResults.map(it => String(it.id)));
    const newMarkers = [];

    // 2. [SYNC: ADD] 새로운 최적화 결과에 따라 유효 마커 추가
    optimizedResults.forEach(item => {
        if (!state.markers.has(item.id)) {
            const marker = addMarkerToMap(item, true);
            newMarkers.push(marker);
        }
    });

    // 3. [SYNC: REMOVE] 결과 셋에서 벗어난 마커는 메모리에서 소거 (Ghost Marker Guard)
    state.markers.forEach((item, id) => {
        if (!currentVisibleIds.has(String(id))) {
            state.clusterGroup.removeLayer(item.marker);
            state.markers.delete(id);
        }
    });

    if (newMarkers.length > 0) {
        state.clusterGroup.addLayers(newMarkers);
    }
    
    // 4. 지능형 그래프 레이어 다이어트 및 가시성 조정
    renderGraphLinks();
}

async function displayInitialMarkers() {
    // 초기 로딩 시 전체를 한 번에 넣지 않고 창 영역(Windowing) 먼저 실행
    await updateWindowing();
}
