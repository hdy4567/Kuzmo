C:\Users\함동윤\.gemini\antigravity\brain\bb2a2757-ac68-4b0e-afa1-f576cb77beb7\kzm_architecture.md.resolved
.kzm (Kuzmo Memory Packet) - 통합 아키텍처
1. 파일 포맷 스펙 (v1.0)
.kzm 파일은 단일 JSON 구조로, 메타데이터와 미디어 바이너리(Base64)를 하나로 묶은 자기완결형(Self-Contained) 패킷이다.

jsonc
{
  "_kzm": "1.0",                       // 포맷 버전
  "manifest": {
    "id": "mem_1742479200000",
    "title": "도쿄 타워 야경",
    "lat": 35.6586,
    "lng": 139.7454,
    "region": "도쿄",
    "tags": ["#야경", "@도쿄"],
    "category": "memory",
    "timestamp": 1742479200000,
    "snippet": "2024년 봄, 도쿄 타워 전망대에서...",  // 2줄 요약 캐시
    "mediaMap": {                        // 파일명 → 역할 매핑
      "content.md": "note",
      "thumbnail.jpg": "thumbnail",
      "voice.mp3": "audio"
    }
  },
  "files": {
    "content.md": "BASE64_ENCODED_MD_CONTENT",
    "thumbnail.jpg": "BASE64_ENCODED_IMAGE",
    "voice.mp3": "BASE64_ENCODED_AUDIO"
  }
}

2. IndexedDB 스키마 v2 (슬림 캐시)
| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| **id** | string | 고유 식별자 (PK) |
| **title** | string | 마커 표시 제목 |
| **lat / lng** | number | 지도 좌표 |
| **snippet** | string | 2줄 요약 (카드 미리보기) |
| **thumbnailBlob** | Blob | 축소된 썸네일 (최대 200x200px) |
| **packetDriveId** | string | 드라이브 .kzm 파일 ID |
| **localKzmPath** | string | 로컬 파일 경로 (PC/Mobile) |
| **timestamp** | number | 생성 시각 |
| **tags** | string[] | 태그 |
| **region** | string | 지역 |

> [!NOTE]
> imageUrl, audioUrl, content 등 전체 데이터는 DB에 저장하지 않음. 카드 클릭 시 .kzm을 언패킹하여 로드.

### 3. Enterprise DB 스키마 v5.5 (MSSQL / Intelligent Harness 대응)
로컬 캐시(IndexedDB)를 넘어, 대규모 지식 그래프와 벡터 검색을 지원하기 위한 엔터프라이즈급 스키마입니다.

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| **Id** | NVARCHAR(450) | PK, `.kzm` 패킷 고유 ID |
| **Title** | NVARCHAR(MAX) | 제목 |
| **Content** | NVARCHAR(MAX) | 전체 본문 (Markdown 포함) |
| **Snippet** | NVARCHAR(MAX) | 2줄 요약 캐시 (카드 미리보기용) |
| **Lat / Lng** | FLOAT | [CRITICAL] 위경도 좌표 (SOTA 지밀도 계산용) |
| **Tags** | NVARCHAR(MAX) | JSON 형태의 태그 리스트 |
| **Vector** | NVARCHAR(MAX) | **1536차원 임베딩 벡터** (시맨틱 검색용) |
| **SyncStatus** | NVARCHAR(50) | synced / pending / dirty 상태 관리 |

#### 🌐 KnowledgeGraph (관계망 테이블)
노드 간의 '인력(Gravity)'과 '관계'를 점수화하여 저장합니다.
- **SourceNodeId / TargetNodeId**: 관계를 맺는 두 노드의 ID
- **RelationType**: GEO(지리), SEM(의미), TEMP(시간)
- **Strength**: 결합 강도 (0.0 ~ 1.0)

---

### 🛠️ Kuzmo Intelligent Harness (kzmmcp)
MCP(Model Context Protocol) 기반의 지식 제어 센터로, AI 모델이 DB에 직접 접근하여 다음과 같은 고난도 작업을 수행합니다.

- **[Rank Intelligence]**: 시맨틱 유사도 + 공간 거리 + 시간 근접성을 융합하여 최적의 장소 추천.
- **[Ingest/Bulk Sync]**: 대량의 `.kzm` 패킷을 DB 스키마에 맞춰 고속 수혈 및 정제.
- **[Auto Prune]**: 중복된 추억 조각이나 유효하지 않은 지식 노드를 자동 감지 및 제거.
- **[Direct Fix]**: 자연어 명령만으로 DB 내의 장소 정보나 좌표를 즉시 교정.



# 통합 데이터 워크플로우 제안
- 기술 문서(문제정의서.md)의 방향에 맞춘 통합 구조입니다.
- kzm 라이브러리 제작하기. 


- 내부 DB (Internal Storage Engine):
    - IndexedDB (EventMapDB): 모든 플랫폼의 공통 캐시 엔진. 
        ( **.md 2줄 분량의 snipet 캐싱본 -파일 카드 이벤트 발생 시 내용 로드- + 미디어 썸네일**만 캐싱-지도 초고속 로드-, ※ LocalStorage 이벤트 저장 방식은 폐기됨)
        id
        : 고유 식별자
        title / lat / lng: 지도 마커용 기본 정보
        thumbnailBlob: 패킷을 처음 받을 때 한 번만 추출해서 저장한 바이너리 이미지 (IndexedDB는 이미지 바이너리 저장이 매우 빠름)
        packetDriveId: 드라이브에 있는 .kzm의 고유 파일 ID -중복차단필드-

- 드라이브
    - 추억 데이터 규격 (Payload Format):
    - **.kzm (Kuzmo Memory Packet**): 전송 및 영구 보관용 단일 압축파일. (**JSON 메타데이터(제목,주소,미디어 매핑 좌표 등) + 미디어 바이너리(.md/.jpg/.mp3 등등)를 manifest.json**로, 하나로 묶음)


- 로컬 싱크 경로 (Physical Path):
    - PC: Desktop/Kuzmo_Exports 폴더에 즉시 파일 생성 및 동기화 지원.
    - Mobile: Documents/Kuzmo 폴더에 개별 추억 파일 백업 지원.

- 동기화 모드 (Dual Connectivity):
    - Cloud Mode: 구글 드라이브(Kuzmo_Archive 폴더)를 통한 원거리 동기화.
    - Local Mode: C# 브릿지 서버를 활용한 초고속 유선/근거리 파일 동기화.
    - **Transactional Sync (v10)**: [NEW] 스마트 팩토리 통신 방식을 채택한 큐잉 기반 동기화. 모든 명령(C/U/D)은 `$tx` 매니저를 통해 순차적으로 처리되며, 네트워크 장애 시 최대 10회 자동 재시도 및 하트비트 감시를 지원함.

구분	📱 안드로이드 앱 (App)	💻 윈도우 (PC/Bridge)	🌐 홈페이지 (Web)
메인 DB	IndexedDB (고성능/암호화)	.kzm 파일 (작업 중인 폴더는 언패킹 상태로 동기화)	IndexedDB (브라우저 최적화-실시간-)
저장 규격	Unified .kzm Only	Unified .kzm Only	Unified .kzm Only
미디어(Media)	App 전용 내부 저장소	바탕화면 Kuzmo_Exports(구글드라이브 패킷 수신 후 반출) 브라우저 언패킹 로드(썸네일 우선)
연결 매개체	Google Drive Sync	C# Bridge + Drive App	Google Drive API
특이점	오프라인 뷰잉 우선	외부 반출(Ctrl+C) 우선	실시간 동기화 우선
반출(Export)	Share Plugin (묶음 -공유- 전송)	OS 레벨 언패킹 (낱개 파일)	클라우드 직링크 공유



---> 
방향	방법	모드
앱 → 구글 드라이브	$tx Transaction Queue 자동 실행	✅ 자동 (Queueing)

saveToDB() + $tx.submit()	실행 시 트랜잭션 발행	✅ 자동
구글 드라이브 → 앱	보관함 열 때 자동 수혈	✅ 자동
앱 → 로컬 PC 폴더	☁️ Ctrl+C 또는 드래그	⚠️ 수동
로컬 PC 폴더 → 앱	📥 Import 버튼	⚠️ 수동

### 4. Premium 인터랙션 스펙 (v3.1)
사용자 몰입감을 극대화하기 위한 모바일 네이티브 수준의 제스처 및 애니메이션 사양입니다.

- **Follow-Cursor Drag (커서 추적 드래그)**:
  - `mousedown`/`touchstart` 시점의 Y좌표를 앵커(Anchor)로 설정.
  - `mousemove` 이벤트 발생 시 커서 이동 거리(`deltaY`)를 실시간 계산하여 `transform: translateY` 값에 1:1 반영.
  - 드래그 중에는 `transition: none`을 강제하여 지연 없는 '지문 밀착형' 조작감 제공.

- **Multi-Dismiss (다중 종료 트리거)**:
  - **Swipe-Down**: 하단 방향으로 150px 이상 드래그하거나 빠른 가속도(Flick) 감지 시 자동으로 팝업 종료.
  - **Esc Key**: 전역 키보드 인터럽트를 통해 물리적/가상 키보드 환경에서 즉각적인 Exit 경로 제공.
  - **X Button & Overlay**: 시각적 닫기 버튼과 배경 영역 클릭 시 유기적으로 종료 애니메이션 실행.

- **Animation Optimization**:
  - 드래그 중단 시 `cubic-bezier(0.16, 1, 0.3, 1)` 곡선을 적용하여 제자리 복귀 또는 종료 시 자연스러운 관성 효과 부여. (고급 SNS 앱의 인터랙션 감성 재현)