# 🌌 [TECH-SPEC] Stellar-Edge: 태그 기반 지능형 노드 연결 (v29.0)

## 1. 개요 (Overview)
본 문서는 3차 필터(태그) 선택 시, 지도상에 흩어진 데이터들 중 동일 태그를 공유하는 노드들을 실시간으로 연결하고 시각적 몰입감을 부여하는 **Stellar-Edge(별자리 연결)** 기술 구현 사양을 정의한다.

## 2. 사용자 경험 시나리오 (UX Sequence)
1. **Trigger**: 상단 3차 태그 바에서 특정 태그(예: `#맛집`, `@서울`) 클릭.
2. **Environment Dimming**: 지도의 타일 레이어 및 비대상 마커들이 40% 밝기로 디밍(Dimming) 및 블러 처리됨.
3. **Stark Glow**: 해당 태그를 가진 마커들이 청록색(#00e5ff) 네온 빛으로 발광하며 크기가 125% 확대됨.
4. **Constellation Drawing**: 발광하는 노드들 사이를 잇는 애니메이션 연결선(Stellar-Edge)이 별자리처럼 전개됨.
5. **Dismiss**: '전체' 탭 클릭 또는 국가 탭 전환 시 모든 시각 효과가 즉시 해제됨.

## 3. 아키텍처 및 구현 로직 (Architecture)

### 3.1 모듈간 상호작용 (Interactions)
- **`kzm_navigator.ts` (Feature)**: `setSubFilter` 이벤트 발생 시 태그 유무를 판단하여 시각화 엔진 호출.
- **`kzm_ui_orchestrator.ts` (UI Layer)**: 시각화의 중추. 디밍 제어, 마커 하이라이트 트리거, 연결선 렌더링 요청.
- **`kzm_map_engine.ts` (Map Layer)**: 실제 Leaflet Polyline 레이어에 애니메이션 클래스(`rag-edge-glow`)를 주입하여 렌더링.
- **`kzm_map_styles.css` (Style)**: GPU 가속 기반의 `filter`, `transform`, `keyframes` 정의.

### 3.2 핵심 함수 (Key Functions)
```javascript
// kzm_ui_orchestrator.ts
async highlightTagLinkage(tag) {
    const targetNodes = state.eventStore.filter(ev => ev.tags.includes(tag));
    document.getElementById('map').classList.add('graph-dimmed');
    targetNodes.forEach(node => this.highlightMarker(node.id));
    this.drawRagFlow(targetNodes.map(n => n.id));
}
```

## 4. 지식 그래프 알고리즘 (Algorithm)
- **Tag-Base Clustering**: 벡터 공간상의 거리가 아닌 **의미론적 태그(Semantic Tag)**를 앵커(Anchor)로 사용.
- **Rhythmic Linkage**: 단순 직선이 아닌 `stroke-dashoffset` 애니메이션을 활용하여 정보의 흐름(Flow)을 시각화.

## 5. 성능 및 최적화 (Optimization)
- **GPU Acceleration**: 디밍 및 블러 처리에 `backdrop-filter` 대신 `filter: brightness()`를 사용하여 저사양 기기 랙 방지.
- **Layer Management**: `ragHighlightLayer`를 별도 관리하여 대량의 마커 클러스터링 로직과 연산 충돌 분리.

---
*Last Updated: 2026-03-25*
*Status: Production Deployed*
