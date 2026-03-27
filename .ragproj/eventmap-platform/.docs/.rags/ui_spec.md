# 🎨 [UI_SPEC] Kuzmo High-Fidelity UX/UI Specification (v25.0)

본 문서는 Kuzmo 플랫폼의 사용자 경험(UX) 및 인터페이스(UI) 핵심 기술 규격을 정의한다. 모든 구현은 "지연 없는 반응성"과 "멀티모달 데이터 보존"을 최우선으로 한다.

---

## 1. 📐 Space-Efficient Grid (Masonry System)
보관함(Locker) 및 덱(Deck) 뷰의 동적 배치 규격이다.

- 카드 규격: 기본 너비 140px를 준수하며, 부모 컨테이너 크기에 따라 1fr 단위로 가변 확장된다.
- 유동 열 배치: 
    - 좁은 화면(Mobile/Slim Panel): 최소 2열 배치 보장.
    - 넓은 화면(Desktop/Wide): 3~4열까지 자동 확장(repeat(auto-fill, minmax(140px, 1fr))).
- Masonry 엔진: 
    - ResizeObserver 및 requestAnimationFrame을 결합하여 실시간 높이 계산 및 grid-row-end 보정을 수행한다.
    - 이미지 로딩 완료 시점에 재배치 로직이 트리거되어 레이아웃 깨짐을 방지한다.

---

## 2. 🖋️ High-Fidelity Canvas (v22.0)
사용자의 스케치와 필기를 고해상도 지능형 데이터로 변환하는 드로잉 엔진이다.

- 브러시 엔진: 
    - Bézier Curve Smoothing: 점과 점 사이를 부드러운 곡선으로 연결하여 프리미엄 필기감을 제공한다.
    - Desynchronized Rendering: 캔버스 컨텍스트 옵션(desynchronized: true)을 통해 입력 지연(Input Latency)을 최소화한다.
- Sketch-to-Data (AI Ready):
    - 단순 래스터(PNG) 저장이 아닌, 모든 획(Stroke)을 XML/SVG Path 데이터로 캡처한다.
    - Gemini 1.5 Flash Vision 레이어가 사용자의 낙서를 "공간 정보"나 "장소 태그"로 해석할 수 있는 구조적 메타데이터를 포함한다.

- Active Stylus Intelligence (v22.8):
    - Pointer Type Discrimination: 표준 API를 통해 mouse, pen, touch를 실시간 구분한다.
    - Pen-Priority Logic: 펜(Pen) 입력을 감지할 경우, 1초간 손가락(Touch) 입력을 소프트웨어적으로 차단하여 필기 안정성을 확보한다.
    - Area-Based Palm Rejection: 접촉 면적(width/height)이 25px를 초과하는 터치 신호를 손바닥으로 간주하여 필터링한다.
- 브러시 엔진:
    - Bézier Curve Smoothing: 점과 점 사이를 부드러운 곡선으로 연결하여 프리미엄 필기감을 제공한다.
    - Desynchronized Rendering: 캔버스 컨텍스트 옵션(desynchronized: true)을 통해 입력 지연(Input Latency)을 최소화한다.


---

## 3. 🚀 Lag-Free Navigation (v25.0)
대량의 데이터(5,000+건) 환경에서도 60FPS를 유지하는 비동기 네비게이션 전략이다.

- Concurrent UI Dispatcher:
    - 탭 클릭 시 UI 시각 상태(Active Class, Indicator)를 동기식(1순위)으로 즉시 변경한다.
    - 무거운 지도 이동 및 마커 필터링은 requestAnimationFrame을 통해 비동기(2순위)로 지연 처리하여 애니메이션 끊김을 방지한다.
- Parallel Chunked Filtering:
    - 마커 필터링 시 전체를 한 번에 검사하지 않고, 400개 단위의 청크로 나누어 실행한다.
    - 청크 사이마다 requestAnimationFrame으로 메인 스레드 제어권을 양보(Yield)하여 브라우저의 반응성을 유지한다.
- Task Cancellation:
    - 새로운 네비게이션 요청이 발생하면 이전 테스크를 즉시 중단(Abort)하는 Task ID 추적 시스템을 통해 리소스 낭비를 차단한다.

---

## 📱 4. Interactive Detail Sheet (v22.6)
기존 기록을 쉽고 빠르게 수정/보강할 수 있는 SNS 스타일의 상세 시트 규격이다.

- In-place Edit Mode:
    - 별도의 편집 페이지 이동 없이, 상세 내용 텍스트를 클릭하면 즉시 입력창(Textarea)으로 전환된다.
    - 포커스 해제(blur) 시 초고속 자동 저장 후 다시 텍스트 뷰로 복귀한다.
- SNS-style Action Bar:
    - 가로 스크롤이 가능한 액션바를 통해 🎨 스케치, 🎙️ 음성, 📤 공유 등 다수의 도구를 공간 효율적으로 배치한다.
- Multi-modal Preview:
    - 보관된 스케치는 SVG 형태로 즉시 렌더링되어 텍스트 메모와 유기적으로 결합된 미리보기를 제공한다.

---

## 🗺️ 5. Map Visual Intelligence (v26.0)
지도의 시각적 피드백을 통해 AI의 사고 과정과 데이터 밀도를 전달하는 지능형 렌더링 규격이다.

- Dynamic LOD (Heatmap Clustering):
    - 광역 줌(Zoom < 10): 개별 마커 대신 지식 밀도를 나타내는 **보라색 글로우(Heatmap)** 아이콘으로 전환하여 데이터의 집약도를 시각화한다.
    * 상세 줌(Zoom >= 10): 정확한 데이터 카운트가 표시되는 클러스터 아이콘으로 자동 전환(L.divIcon 기반)되어 정밀 정보를 제공한다.
- Visual RAG Logic (Thinking Flow):
    - AI 추론 동작 시, 참조 중인 데이터 노드들 사이에 **애니메이션이 적용된 하늘색 네온 연결선(`rag-edge-glow`)**을 실시간으로 투사한다.
    - 연결된 마커는 심장 박동처럼 깜빡이는(Pulse) 하이라이트 효과를 적용하여 "AI가 현재 이 데이터를 읽고 있음"을 사용자에게 인지시킨다.
- High-Performance Animation:
    - CSS Keyframe 및 Canvas 레이어를 결합하여 수백 개의 지능형 연결선이 동시에 나타나도 60FPS를 유지하도록 설계되었다.

---

## 🚀 7. Kuzmo Turbo-Canvas Engine (v29.0)
네이티브 수준의 필기 경험을 제공하기 위한 초저지연 렌더링 규격이다.
- Offscreen Rendering Architecture:
    - 메인 쓰레드(Main Thread)와 독립된 WebWorker에서 필기 렌더링을 전담한다.
    - `OffscreenCanvas.transferControlToOffscreen()`을 통해 GPU 자원을 Worker가 직접 제어한다.
- Dynamic Physics Stroke:
    - 펜의 가속도 및 압력을 C++급 물리 엔진으로 실시간 계산하여 잉크 번짐 및 필기 선의 강약을 시뮬레이션한다.
- Layer Isolation Strategy:
    - Grid(배경), Balance(정적 획), Turbo(실시간 획)의 3중 레이어 시스템을 통해 렌더링 오버헤드를 최소화한다.
문서 관리 정보
- 최종 업데이트: Antigravity (AI Coding Assistant)
- 버전: v26.0 (2026-03-25)
- 상태: Production Ready / Implemented

