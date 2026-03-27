# 🏗️ [TECH_SPEC] Kuzmo Clean Architecture: Platform-Independent Strategy

## 1. 개요 (Overview)
본 문서는 Kuzmo 프로젝트의 현재 "하이브리드형 밀집 구조"를 탈피하여, **기술(Domain Logic)**과 **표현(UI/View)**을 엄격히 분리하는 **클린 아키텍처(Clean Architecture)**로의 전환 전략을 상술한다. 

이를 통해 웹, 모바일(Capacitor), 데스크톱(Bridge) 등 어떤 환경에서도 동일한 핵심 로직을 공유하고, 각 플랫폼에 최적화된 UI를 독립적으로 배치하는 것을 목표로 한다.

## 2. 현재 아키텍처 진단 (Current Status)
- **밀접 결합(Tight Coupling)**: `auth.js`, `ai.js`, `ui_locker.js` 내에 API 통신, 상태 관리, DOM 조작(`document.get...`) 코드가 혼재되어 있음.
- **플랫폼 종속성**: 핵심 서비스 레이어 내부에 `showToast`나 `alert` 같은 브라우저 전용 UI 함수가 직접 호출되고 있어, 서버나 앱 환경에서 재사용이 불가능함.

## 3. 목표 아키텍처 (Target Architecture)

### 📂 구현 및 디렉토리 구조 (Implemented Architecture)
```text
src/modules/
 ├── domain/             # (Domain/Entity Layer)
 │    └── kzm_entities.ts       # KZM 핵심 객체 및 타입 정의
 ├── persistence/        # (Infrastructure/Persistence Layer)
 │    └── kzm_indexeddb.ts      # IndexedDB 기반 데이터 영속화 담당
 ├── store/              # (State/Engine Layer)
 │    ├── kzm_store.ts          # 플랫폼 독립적인 반응형 상태 관리
 │    └── kzm_graph_engine.ts   # 지식 그래프 및 데이터 처리 엔진
 ├── sync/               # (Synchronization Layer)
 │    ├── kzm_sync_queue.ts     # 비동기 작업 예약 및 순차 실행 (Transaction)
 │    └── kzm_sync_engine.ts    # 실시간 동기화 및 데이터 병합
 ├── ui/                 # (Presentation Layer - Orchestration)
 │    ├── kzm_ui_orchestrator.ts # 전체 UI 흐름 및 모듈 간 조율
 │    ├── kzm_ui_styles.css     # 전역 UI 테마 및 공통 스타일
 │    └── components/           # 재사용 가능한 UI 아토믹 요소
 └── map/                # (Feature/Map Layer)
      ├── kzm_map_engine.ts     # 지도 렌더링 및 공간 데이터 처리
      └── ui/                   # 지도 전용 컨트롤 요소 (Panel, Dock 등)
```

## 4. 3대 핵심 분리 원칙 (Core Separation)

### ✅ 원칙 1: DOM 접근 금지 (No direct DOM in Core)
- `core/` 폴더 내의 어떤 파일도 `document.`, `window.`, `localStorage.` 등에 직접 접근하지 않는다.
- 데이터가 변경되면 이벤트를 발행(Event Emit)하고, 이를 `view/` 레이어에서 구독하여 화면을 갱신한다.

### ✅ 원칙 2: UI 의존성 제거 (No UI feedback in Core)
- 서비스 로직 중간에 `showToast()` 같은 UI 함수를 직접 넣지 않는다. 
- 대신 Result 객체(`{ success: true, count: 5 }`)를 리턴하여 호출한 UI 레이어에서 메시지를 결정하게 한다.

### ✅ 원칙 3: 인터페이스 주입 (Dependency Injection)
- 로직이 네트워크나 DB를 사용할 때, 구체적인 구현체 대신 인터페이스(추상화)를 사용한다. 
- (예: 로컬 싱크 시 'C# Bridge'를 쓸지 'Browser API'를 쓸지는 초기화 시점에 주입한다.)

## 5. 실행 로드맵 (Refactoring Roadmap)

### [Phase 1] Core Logic 추출 (추출 & 격리)
- `auth.js`의 구글 드라이브 동기화 순수 로직만 떼어내어 `core/engine/sync.js`로 이동.
- `state.js`를 단순 데이터 저장소에서 관찰 가능한(Observable) 상태 관리자로 고도화.

### [Phase 2] Adapter 패턴 도입 (중계층 구축)
- 브라우저용 `ui_base.js`와 로직 사이의 매개체인 `view/handlers/`를 생성.
- UI 버튼 클릭 시 직접 로직을 부르는 대신 핸들러를 거쳐 데이터만 넘김.

### [Phase 3] Multi-Platform UI 배포 (확장)
- `view/layouts/web/` (현재 45% 슬림 그리드)
- `view/layouts/mobile/` (Capacitor 전용 네이티브 느낌의 UI) 분리 시작.

---

## 6. 결론 (Conclusion)
"기술은 엔진으로, UI는 옷으로" 분리함으로써 Kuzmo는 단순한 웹 앱을 넘어, 모든 기기에서 동일하게 영리하게 작동하는 **지능형 이벤트 맵 플랫폼**으로 도약할 것이다.

---
**문서 관리 정보**
- **작성자**: Antigravity (AI Architect)
- **버전**: v1.0 (2026-03-22)
- **상태**: Draft
