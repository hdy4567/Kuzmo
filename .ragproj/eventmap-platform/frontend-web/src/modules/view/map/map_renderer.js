import { state } from '../../core/state.js';

/**
 * 🎨 [MAP-RENDERER] Marker & Link Drawing Engine
 */

export function addMarkerToMap(data, isBatch = false) {
    const isSketch = data.type === 'sketch' || (data.tags && data.tags.includes('#sketch'));
    const thumbnailSrc = data.thumbnailBlob instanceof Blob 
        ? URL.createObjectURL(data.thumbnailBlob) 
        : (data.imageUrl && data.imageUrl !== 'null' ? data.imageUrl : (isSketch ? '/sketch-icon.png' : `https://picsum.photos/seed/${data.id}/64/64`));

    const sketchHtml = (isSketch && data.sketch_ai?.svg) 
        ? `<div class="marker-sketch-svg">${data.sketch_ai.svg}</div>`
        : `<img src="${thumbnailSrc}" class="marker-img">`;

    const marker = L.marker([data.lat, data.lng], {
        draggable: true,
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="marker-wrap ${isSketch ? 'sketch-wrap' : ''}" id="marker-${data.id}">${sketchHtml}</div>`,
            iconSize: [64, 64], iconAnchor: [32, 32]
        })
    });

    bindMarkerEvents(marker, data);

    state.markers.set(data.id, { marker, data });
    if (!isBatch) state.clusterGroup.addLayer(marker);
    return marker;
}

function bindMarkerEvents(marker, data) {
    marker.on('drag', () => {
        const pos = marker.getLatLng();
        data.lat = pos.lat;
        data.lng = pos.lng;
        renderGraphLinks();
    });

    marker.on('dragend', async () => {
        const { updateNodeLinks, auditGraphConnectivity } = await import('../../engine/graph.js');
        await updateNodeLinks(data.id);
        await auditGraphConnectivity();
        renderGraphLinks();
        import('../../core/state.js').then(m => m.saveToDB());
    });

    marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        import('../ui/ui_base.js').then(ui => ui.showDetailSheet(data));
        state.map.panTo(marker.getLatLng());
    });
}

export function renderGraphLinks() {
    if (!state.map || !state.linkFeatureGroup || state.perfMode === 'CRITICAL') return;
    state.linkFeatureGroup.clearLayers();

    const zoom = state.map.getZoom();
    const isClustered = zoom < 16; 
    const linesToDraw = [];
    const processedPairs = new Set();

    state.graphLinks.forEach(link => {
        const s = state.markers.get(link.source);
        const t = state.markers.get(link.target);
        
        // 1. [PRUNING] 화면 내 소스나 타겟 중 하나라도 존재해야 렌더링 검토 (Windowing Linkage)
        if (!s && !t) return;
        
        // 2. [DECAY] 노드 강도가 약한 링크는 광역 줌에서 자동 컷오프 (v25.0)
        if (zoom < 10 && link.strength < 0.8) return;
        if (zoom < 14 && link.strength < 0.6) return;

        // 마커 정보가 부족한 경우 (아직 윈도윙에 걸리지 않은 사이드 노드) 
        // 렌더링 품질을 위해 추가 로드 필요없이 스킵 가능
        if (!s || !t) return;

        let sPos, tPos;
        if (isClustered) {
            const sCluster = getClusterParent(s.marker);
            const tCluster = getClusterParent(t.marker);
            if (sCluster === tCluster) return;
            sPos = sCluster.getLatLng();
            tPos = tCluster.getLatLng();
        } else {
            sPos = s.marker.getLatLng();
            tPos = t.marker.getLatLng();
        }

        const pairId = [link.source, link.target].sort().join('-') + (isClustered ? '-c' : '');
        if (processedPairs.has(pairId)) return;
        processedPairs.add(pairId);

        linesToDraw.push({ coords: [sPos, tPos], strength: link.strength, type: link.type });
    });

    linesToDraw.forEach(l => {
        const poly = L.polyline(l.coords, {
            renderer: state.linkLayer,
            color: l.type === 'GEO' ? '#D9F160' : '#FF7A42',
            weight: isClustered ? 1.5 : Math.max(l.strength * 4, 1),
            opacity: isClustered ? 0.4 : Math.min(l.strength + 0.2, 0.8),
            interactive: false
        });
        state.linkFeatureGroup.addLayer(poly);
    });
}

export function renderRAGHighlights(nodeIds) {
    if (!state.map || !state.ragHighlightLayer || !nodeIds || nodeIds.length < 2) return;
    state.ragHighlightLayer.clearLayers();

    const latlngs = [];
    nodeIds.forEach(id => {
        const entry = state.markers.get(id);
        if (entry) {
            latlngs.push(entry.marker.getLatLng());
            const el = document.getElementById(`marker-${id}`);
            if (el) {
                el.classList.add('rag-highlight');
                // Pulse effect per node
                setTimeout(() => el.classList.remove('rag-highlight'), 6000);
            }
        }
    });

    if (latlngs.length < 2) return;

    // 🌊 [v26.0] Animated Flowing Connection (RAG Viz)
    const poly = L.polyline(latlngs, {
        renderer: state.linkLayer,
        color: '#00e5ff',
        weight: 3,
        opacity: 0.9,
        className: 'rag-edge-glow' // CSS Animation Link
    });

    state.ragHighlightLayer.addLayer(poly);
    
    // 🧠 "컴퓨터가 생각 중" 페이드 아웃 시퀀스
    setTimeout(() => {
        if (state.ragHighlightLayer) state.ragHighlightLayer.clearLayers();
    }, 6000);
}


export function updateMarkerUI(data) {
    const el = document.getElementById(`marker-${data.id}`);
    if (el) {
        el.classList.add('pulse-active');
        setTimeout(() => el.classList.remove('pulse-active'), 1000);
    }
}

function getClusterParent(marker) {
    let parent = marker;
    try {
        if (state.clusterGroup && state.clusterGroup.getVisibleParent) {
            parent = state.clusterGroup.getVisibleParent(marker) || marker;
        }
    } catch(e) {}
    return parent;
}
