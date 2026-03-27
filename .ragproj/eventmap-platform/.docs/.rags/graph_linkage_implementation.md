# 📊 [KZM-GRAPH] 옵시디언형(Obsidian-style) 지능형 노드 연결 로직 명세서

Kuzmo 플랫폼의 마커(패킷)들을 단발성 데이터가 아닌, **지리적/의미적 인력(Gravity)**에 의한 '지식 그래프'로 변환하기 위한 상세 구현 단계입니다. `mine1` 워크플로우를 따라 0.01 단위로 설계합니다.

---

## 🏗️ Phase 1 : 공간-의미 하이브리드 그래프 엔진 구축

### [Step 0.01 : 데이터 구조(Edge List) 정의]
- **메인 로직**: `eventStore` 내의 개별 패킷들 사이의 관계를 저장하는 `state.links` 배열 및 `state.adjacencyMap` 생성.
- **파라미터**: `sourceId`, `targetId`, `linkType` (GEO/SEM/TEMP), `weight` (0~1).

### [Step 0.02 : 지리적 반경 링크 (Distance Interaction)]
- **메인 로직**: 하버사인(Haversine) 공식을 사용하여 특정 반경 `R` (Def: 100m) 이내의 패킷 검색.
- **파라미터**: `radiusThreshold = 0.5`, `maxConnectionsPerNode = 5`.
- **기능**: 옵시디언의 로컬 그래프처럼, 현재 위치를 기준으로 '물리적 이웃'을 자동 연결.

### [Step 0.03 : 기술 병목 구간 1 - 공간 연산 최적화]
- **병목 원인**: 패킷이 1만 건을 넘을 경우 $O(N^2)$ 비교 연산으로 브라우저 프리징 발생.
- **해결 단계(0.031)**: **R-Tree** 또는 **공간 그리드(Grid-based Hashing)** 라이브러리 도입.
- **해결 단계(0.032)**: Web Worker를 통한 비동기 링크 계산 처리.

### [Step 0.04 : 의미적 링크 (Semantic Similarity)]
- **메인 로직**: Llama-1B 임베딩 벡터 간의 코사인 유사도(Cosine Similarity) 계산.
- **파라미터**: `similarityThreshold = 0.85`.
- **기능**: 위치는 멀어도 성격이 비슷한(예: 동일한 분위기의 카페) 장소들을 은하계처럼 연결.

---

## 🎨 Phase 2 : Stellar-Edge (Tag-based Linkage) 고도화 (v29.0)

### [Step 0.21 : 3차 필터(Tag) 인터랙션 결합]
- **메인 로직**: 상단 태그 바 또는 검색창에서 `@태그` 또는 `#태그` 선택 시 해당 태그를 공유하는 모든 노드를 강제 연결.
- **구현**: `VisualizerCenter.highlightTagLinkage(tag)` 함수를 통해 지리적 거리와 무관하게 '의미적 별자리' 형성.

### [Step 0.22 : 환경 디밍(Environment Dimming)]
- **메인 로직**: 태그 활성화 시 `#map.graph-dimmed` 클래스 주입.
- **시각 효과**: 지도 타일 밝기 40% 감소 + 비대상 마커 투명도 15% 처리. 대상 마커만 네온 글로우(#00e5ff) 효과 부여.

### [Step 0.23 : 흐름형 연결선 (Animated Flow)]
- **메인 로직**: `rag-edge-glow` CSS 클래스를 Polyline에 주입하여 `stroke-dashoffset` 기반의 무한 흐름 애니메이션 적용.
- **파라미터**: `animation: ragFlow 3s linear infinite`.

---

## 🖥️ UX/UI 흐름 및 데이터 플로우 분석

| 구분 | 현재 기술 병목 지점 (Bottleneck) | 해결 및 고도화 방향 |
| :--- | :--- | :--- |
| **App/Mobile** | 1B 모델의 CPU 부하 및 렌더링 오버헤드 | **Slim-Link Cache**: 서버에서 계산된 링크 가중치를 IndexedDB에 캐싱 |
| **Web/Desktop** | 수천 개의 선(Edge) 렌더링 시 프레임 드랍 | **Canvas-based Edge Layer**: SVG 대신 HTML5 Canvas로 에지 일괄 드로잉 |
| **데이터 흐름** | 단방향 저장(Save-only) 구조 | **Bi-directional Mapping**: 링크 업데이트 시 주변 노드의 '연관성 가중치' 동시 업데이트 |

---

## 🛠️ [mine1] 상세 단계 가이드 (Step-by-Step)

### 1단계 [0.11] : 링크 계산 오퍼레이터 (Graph Engine)
- **메인 로직**: 신규 메모 작성 시 즉시 주변 2km 내 노드 스캔 및 유사도 검사.
- **구현 가능성**: 100% (Worker 브릿지 활용 시).

### 2단계 [0.12] : 시각적 연결선 (Edge Rendering)
- **메인 로직**: Leaflet 마커 사이를 잇는 베지어 곡선(Bezier Curve) 또는 직선 렌더링.
- **구현 가능성**: 90% (모바일에서 부하가 있으므로 '현재 선택된 노드' 주변 1-Hop만 그리는 방식 추천).

### 3단계 [0.13] : 기술 병목 구간 2 - 드래그 동적 갱신
- **병목 원인**: 마커 드래그 시 선이 실시간으로 따라오지 못하고 끊김.
- **해결 단계(0.131)**: RequestAnimationFrame을 이용한 렌더링 동기화.
- **해결 단계(0.132)**: 링크 렌더링 전용 오프스크린 캔버스 사용.

---

## 🔮 최종 답안 (Solution Hypothesis)

"Kuzmo Graph"는 단순히 직선으로 연결된 점들이 아닙니다. **Llama-1B가 태그를 분석(의미)**하고 **알고리즘이 거리를 계산(물리)**하여, 사용자의 여행 덱(Deck)이 하나의 **'살아있는 지식 지도'**로 기능하게 합니다.
---

## 🔗 4. 동적 연결 및 해제 메커니즘 (Dynamic Linkage & Decay)

### [연결고리(Connection Bridge) : 패킷 내부 데이터]
이웃으로 맺어지면, 각 패킷(Event Object)은 서로의 ID를 **`adjacencies`** 리스트에 기록하거나, 글로벌 **`EdgeMap`**에 다음과 같은 정보를 공유합니다:
- **`bondStrength` (결합 강도)**: $1.0 - (현재 거리 / 임계 반경)$. 0에 가까울수록 선이 가늘고 투명해집니다.
- **`bondMetadata`**: 두 장소가 공유하는 키워드(#맛집 등), 방문 시간 차이, 이동 경로 시퀀스 ID.

### [해제(Disconnection) : 풀어짐의 로직]
거리가 멀어질 때 선이 '툭' 끊기지 않고 자연스럽게 해제되도록 **히스테리시스(Hysteresis) 및 감쇄(Decay)** 로직을 적용합니다:
1. **임계값 이탈 (Hard Break)**: 거리가 반경의 120%($1.2R$)를 초과하면 즉시 데이터 트리에서 삭제. (1.2배인 이유는 경계선에서 마커가 미세하게 움직일 때 선이 깜빡거리는 현상 방지)
2. **소성 변형 (Semantic Retention)**: 거리가 멀어져도 **의미적 유사도(Llama-1B 분석)**가 매우 높다면, 선의 색을 '회색(과거 이웃)'으로 변경하고 데이터는 남겨둠 (옵시디언의 '관련 노드' 연동과 유사).
3. **가비지 컬렉터 (GC)**: 1분마다 연결 상태를 전수 검사하여 유효하지 않은(Dead) 링크를 메모리에서 정리.

---

## 📐 5. 구현 수식 및 파라미터 제안 (최종)

- **Attraction Force**: $F = k \times \frac{Similarity}{Distance^2}$
- **Tag-Link Strength**: 태그 일치 시 $Similarity = 1.0$ (강제 결합)
- **Visual Feedback**:
    - **Active Tag**: 청록색(#00e5ff) 네온 광원
    - **GEO Link**: 노란색(#D9F160) 실선
    - **SEM Link**: 주황색(#FF7A42) 점선
    - **Dimmed State**: 주변광 0.4x 필터링
