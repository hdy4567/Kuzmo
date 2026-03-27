# 🌌 Kuzmo Platform (Clean Architecture v5.5)

Kuzmo는 **Premium Modular Architecting** 및 **고밀도 물리 인터랙션**을 지향하는 차세대 이벤트 맵 플랫폼입니다.

---

## 🛠️ Modular UI Styles (v5.5 Refactoring)
유지보수와 직관성을 극대화하기 위해 거대 CSS 파일을 5개의 독립 모듈로 파편화하여 관리합니다.
- `kzm_core.css`: 전역 변수 및 맵 마커 베이스
- `kzm_sheet.css`: 고밀도 상세 정보창(Detail Sheet) 디자인
- `kzm_dock.css`: 맥북 스타일 사이드 독(Side Dock) 및 필터 컨트롤
- `kzm_locker_vibe.css`: 보관함(Locker)의 메이슨리 그리드 및 테마
- `kzm_panel_navigation.css`: AI 모니터 및 하단 내비게이터

---

## 🏗️ Excluded Files & Recovery Guide (재생 가이드)
리포지토리 용량 최적화 및 보안을 위해 직접 업로드되지 않은 파일 목록과 복구 방법입니다.

### 1. 📦 Dependencies (`node_modules/`)
- **설명**: 프로젝트 실행에 필요한 수천 개의 라이브러리 파일입니다.
- **복구**: 터미널에서 `npm install`을 실행하여 로컬에 재생성하십시오.

### 2. 🤖 AI Large Models (`*.gguf`)
- **위치**: `.ragproj/models/llama.gguf` (약 770MB)
- **설명**: 깃허브 용량 제한(100MB)으로 인해 업로드에서 제외된 대용량 AI 모델입니다.
- **복구**: 
  1. `.ragproj/` 폴더 내부에 `models/` 폴더를 직접 생성하십시오.
  2. 준비된 `llama.gguf` 파일을 해당 폴더 안에 수동으로 배치하거나, 내부 브릿지 서버를 통해 동기화하십시오.

### 3. 💾 Local Persistence (`KuzmoVault/`)
- **설명**: 사용자의 IndexedDB 데이터 저장소입니다.
- **복구**: 첫 실행 시 자동으로 생성되지만, 기존 데이터를 복구하려면 구글 드라이브 동기화 기능을 활성화하십시오.

### 4. 🧠 AI Context (`.gemini/`, `brain/`)
- **설명**: AI 에이전트의 대화 맥락과 히스토리 로그입니다.
- **복구**: 실시간 인터랙션 시 자동 생성되므로 별도 복구가 필요 없습니다.

---

## 🚀 Getting Started
```bash
# 1. Clone the repository
git clone https://github.com/hdy4567/Kuzmo.git

# 2. Install dependencies
npm install

# 3. Model placement
# (Manual copy: .ragproj/models/llama.gguf)

# 4. Start Development Server
npm run dev
```

---
**Maintained by**: [hdy4567](https://github.com/hdy4567)  
**Clean Architecting Engine**: Kuzmo Modular v5.5
