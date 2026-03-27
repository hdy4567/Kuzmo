import { state } from '../../core/state.js';
import { renderRAGHighlights } from './map_renderer.js';

/**
 * ✨ [VISUALIZER_CENTER_v29.0]
 * Centralized Map Visualization Engine (Event-Driven)
 * Handles Alt-drag selection boxes, Marker highlighting, and Rhythmic Linkage.
 */
export const VisualizerCenter = {
    _box: null,

    /** 🏁 초기화 및 싱글톤 박스 관리 */
    init() {
        if (!this._box) {
            this._box = document.createElement('div');
            this._box.id = 'selection-box';
            this._box.className = 'kzm-visual-box';
            document.body.appendChild(this._box);
        }
    },

    /** 🖌️ 드래그 박스 (Alt-Key 전용) */
    renderSelectionBox(startPoint, currentPoint) {
        if (!this._box) this.init();
        
        const left = Math.min(startPoint.x, currentPoint.x);
        const top = Math.min(startPoint.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - startPoint.x);
        const height = Math.abs(currentPoint.y - startPoint.y);

        requestAnimationFrame(() => {
            this._box.style.left = left + 'px';
            this._box.style.top = top + 'px';
            this._box.style.width = width + 'px';
            this._box.style.height = height + 'px';
            this._box.style.display = 'block';
        });
    },

    hideSelectionBox() {
        if (this._box) this._box.style.display = 'none';
    },

    /** ✨ 마커 하이라이트 (Pulse/Glow) */
    highlightMarker(id, duration = 5000) {
        const entry = state.markers.get(id);
        if (!entry) return;

        const el = entry.marker.getElement() || document.getElementById(`marker-${id}`);
        if (el) {
            el.classList.add('rag-highlight');
            setTimeout(() => el.classList.remove('rag-highlight'), duration);
        }
    },

    /** ⭐ 선택 상태 시각화 동기화 (Multi-Select) */
    syncSelectionUI() {
        state.markers.forEach((item, id) => {
            const el = item.marker.getElement();
            if (el) {
                if (state.selectedIds.has(String(id))) {
                    el.classList.add('selected');
                } else {
                    el.classList.remove('selected');
                }
            }
        });

        // 🗃️ Locker 카드 동기화 병행
        document.querySelectorAll('.locker-card').forEach(card => {
            const cardId = card.getAttribute('data-id');
            if (state.selectedIds.has(String(cardId))) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    },

    /** 🌐 [STELLAR-EDGE] 태그 중심 별자리형 지식 연결 드로잉 */
    drawGraphLinks(tag, targetNodes) {
        if (!state.ragHighlightLayer) return;
        state.ragHighlightLayer.clearLayers();

        const edges = [];
        const maxLinks = Math.min(targetNodes.length - 1, 3); // 각 노드 당 최대 3개 연결

        // Nearest Neighbor 기반의 Constellation(별자리) 그래프 생성
        for (let i = 0; i < targetNodes.length; i++) {
            const id1 = String(targetNodes[i].id);
            const m1 = state.markers.get(id1)?.marker;
            if (!m1) continue;
            const p1 = m1.getLatLng();

            let distances = [];
            for (let j = 0; j < targetNodes.length; j++) {
                if (i === j) continue;
                const id2 = String(targetNodes[j].id);
                const m2 = state.markers.get(id2)?.marker;
                if (!m2) continue;
                const p2 = m2.getLatLng();
                // 단순 유클리디안 거리 (빠른 시각화용)
                const dist = Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2);
                distances.push({ p2, dist });
            }

            distances.sort((a, b) => a.dist - b.dist);
            const neighbors = distances.slice(0, maxLinks);
            neighbors.forEach(neighbor => {
                edges.push([p1, neighbor.p2]);
            });
        }

        // requestAnimationFrame으로 부하 완화 (Step 0.23 Optimization)
        requestAnimationFrame(() => {
            edges.forEach(edgeCoords => {
                const poly = L.polyline(edgeCoords, {
                    renderer: state.linkLayer,
                    color: '#00e5ff',
                    weight: 3,
                    opacity: 0.8,
                    className: 'rag-edge-glow',
                    interactive: false
                });
                state.ragHighlightLayer.addLayer(poly);
            });
        });
    },

    /** ⭐ [STELLAR-EDGE] 태그 기반 지식 연결 시각화 (v29.0) */
    async highlightTagLinkage(tag) {
        if (!tag || tag === "전체") {
            this.clearTagLinkage();
            return;
        }

        const isTag = tag.startsWith('#') || tag.startsWith('@');
        if (!isTag) return;

        // 1. [RAG-RETRIEVE] 해당 태그를 가진 노드들 필터링
        const targetNodes = state.eventStore.filter(ev => 
            ev.tags && ev.tags.some(t => t.toLowerCase() === tag.toLowerCase())
        );

        if (targetNodes.length < 2) {
            this.clearTagLinkage();
            if (targetNodes.length === 1) this.highlightMarker(String(targetNodes[0].id), 3000);
            return;
        }

        // 2. [UX-DIMMING] 지도 및 범용 마커 어둡게 처리
        document.getElementById('map').classList.add('graph-dimmed');

        // 3. [STARK-GLOW] 대상 노드들 강제 발광 (영구 발광)
        const nodeIds = targetNodes.map(n => String(n.id));
        nodeIds.forEach(id => {
            const entry = state.markers.get(id);
            if (entry) {
                const el = entry.marker.getElement() || document.getElementById(`marker-${id}`);
                if (el) el.classList.add('rag-highlight');
            }
        });

        // 4. [RHYTHMIC-LINE] 연결선 렌더링
        this.drawGraphLinks(tag, targetNodes);
        
        console.log(`✨ [GRAPH] Linked ${nodeIds.length} nodes into Constellation for tag: ${tag}`);
    },

    clearTagLinkage() {
        const mapEl = document.getElementById('map');
        if (mapEl) mapEl.classList.remove('graph-dimmed');
        
        if (state.ragHighlightLayer) state.ragHighlightLayer.clearLayers();
        
        // 잔류 하이라이트 강제 제거
        state.markers.forEach((item, id) => {
            const el = item.marker.getElement() || document.getElementById(`marker-${id}`);
            if (el) el.classList.remove('rag-highlight');
        });
    },

    /** 🚩 시각적 찌꺼기 방지 */
    clearAll() {
        this.hideSelectionBox();
        state.selectedIds.clear();
        this.syncSelectionUI();
        this.clearTagLinkage();
    }
};
