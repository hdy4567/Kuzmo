# 🛡️ Kuzmo Gesture & Filter Sovereignty Spec (v1.5)

## 1. Gesture Sovereignty (제스처 주권)

### [Architecture Role]
- **Shell (Sensory Hub)**: 
    - `window.addEventListener`를 유일하게 점유하는 곳입니다. 
    - 로우 레벨 마우스/터치 데이터를 수집하여 원본 좌표와 압력을 정규화합니다.
- **Broker (Distribution Hub)**: 
    - `UI_GESTURE_INPUT` 이벤트를 통해 데이터를 전파합니다.
    - `DRAG_START`, `SWIPE_LEFT` 등 의미 단위로 가상 이벤트를 변환하여 효율성을 높입니다.
- **Orchestra (Sovereignty Manager)**: 
    - **핵심 역할**: 레이어(Map, Dock, Archive) 중 누가 제어권을 가질지 결정합니다.
    - 예를 들어, 사용자가 `Side Dock` 위에서 드래그를 시작하면 `Map`의 제스처 엔진은 즉시 `Lock` 상태가 되어 지도가 움직이지 않게 방어합니다.

### [Why?]
- **UX 충돌 방지**: 레이어가 겹쳐 있는 상황에서 클릭이나 드래그가 하위 레이어로 전달되어 원치 않는 동작(지도 핀 생성 등)이 일어나는 것을 완벽히 제어하기 위함입니다.
- **기술적 일관성**: 모든 모듈이 제스처를 각자 구현하면 라이브러리 파편화가 발생합니다. 주권을 중앙화하면 `Sovereign Gesture Logic` 하나만 고도화하면 모든 UI에 즉시 적용됩니다.

---

## 2. Filter UI Refinement Plan (User Flow)

### [Structure]
- **Tier 2 (Category Tab)**: `MEMO++`, `KR`, `JP`
    - `MEMO++`: 기존의 태그/메모 생성 중심의 모드입니다.
    - `KR`: 한국 지리 검색 모드로 전환됩니다.
    - `JP`: 일본 지리 검색 모드로 전환됩니다.
- **Tier 3 (Sub-Filter Chips)**: 
    - **Dynamic Visibility**: Tier 2에서 국가(`KR`/`JP`)를 선택했을 때만 해당 국가의 도시 칩이 노출됩니다.
    - **Action**: 도시 칩 클릭 시 즉시 해당 좌표로 지도가 이동(Warp)하고 경계선에 Glow 효과가 나타납니다.

### [Implementation Action]
1. `KzmTopFilterRenderer.ts` 수정:
    - `r-tab` 리스트를 `MEMO++`, `KR`, `JP`로 고정 및 UI 매핑.
    - 선택된 탭에 따른 `KzmGeoService` 연동.
2. `KzmMapEngine.ts` 연동:
    - 국가 탭 전환 시 레이어 스왑 로직 정교화.
    - 워프 로직(`flyTo`) 호출 최적화.
