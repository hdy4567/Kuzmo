 # 🧠 [KUZMO-INSIGHT-REPORT] Claude Code & MCP 에이전트 팀 전략 분석

## 📝 [STRUCTURED-INSIGHT-QUERY]
| 비즈니스 조건 (Business Condition) | 코드/시스템 액션 (Code Action) | 매핑 가치 (Value) |
| :--- | :--- | :--- |
| **"프롬프트가 아니라 채용 공고를 써라"** | 에이전트별 업무 기술서(`.md`) 기반 동적 로딩 | 지능의 파편화 방지 및 재사용성 극대화 |
| **만능 모델의 한계 및 지연 시간** | 특정 역할(작성/검토/관리)에 특화된 소형 모델/에이전트 군단 병렬화 | 작업 정확도 향상 및 시스템 응답성 최적화 |
| **외부 데이터 연동의 규격 부재** | MCP (Model Context Protocol) 도입으로 표준화된 도구 연동 | Slack, Google Drive 등 외부 생태계와의 즉각적 연결 |
| **지속적 작업 컨텍스트 유실** | 에이전트 전용 Memory 레이어(IndexedDB/File) 구축 | 세션 간 영속적 지능(Continuous Intelligence) 구현 |

---

## 🚀 [INSIGHT-CORE: MCP & AI AGENT TEAM]

### 1. 철학적 전환: 프롬프트 엔지니어링 → 에이전트 채용 (Hiring)
- **핵심 Insight**: AI에게 매번 '어떻게'를 설명하는 대신, 마크다운 형식의 **업무 정의서(Job Description)**를 제공하여 스스로 판단하게 함.
- **Kuzmo 적용**: `.docs/coredocs/agents/` 디렉토리를 생성하여 각 UI/Logic 모듈을 담당할 '에이전트 페르소나'를 명문화함.

### 2. MCP (Model Context Protocol) 실무 분석
- **정의**: Anthropic이 제안한 AI 모델과 데이터/도구 간의 오픈 표준 인터페이스.
- **다운로드 및 이용 안내**:
    - **MCP 자체**는 소프트웨어가 아닌 **규약(Protocol)**입니다.
    - **클라이언트**: Claude Desktop 앱 등에 이미 내장되어 있어 즉시 사용 가능합니다.
    - **서버**: 특정 기능(Google Drive, Slack 등)을 수행하는 'MCP 서버'는 [MCP 서버 리포지토리](https://github.com/modelcontextprotocol/servers)에서 다운로드(git clone/npm)하여 가동할 수 있습니다.
    - **Kuzmo 전략**: Kuzmo 자체를 하나의 **MCP 서버**로 구현하여, 사용자의 IDE나 다른 AI가 Kuzmo의 '기억 파편'에 직접 접근하게 설계 가능.

### 3. Kuzmo 에이전트 군단 (The Legion) 로드맵
- **Intelligence Core의 진화**: `KzmIntelligenceCore`를 중앙 브로커로 격상하여 하위 에이전트들의 작업을 오케스트레이션함.
- **SBO 아키텍처 결합**: 
    - **Shell**: 에이전트의 외형 및 명령 입력부.
    - **Broker**: MCP 규격으로 외부 도구 연결($broker).
    - **Orchestrator**: 에이전트 팀의 작업 상태 및 Z-Index 레이어링 관리.

---

## 🛠️ [SYSTEM-EVOLUTION-PLAN]

```javascript
/**
 * @typedef {Object} AgentJobDescription
 * @property {string} role 에이전트의 역할 명 (Unique)
 * @property {string} goal 달성 목표
 * @property {string[]} tools 사용 가능한 MCP 도구 리스트
 * @property {string} memoryPath 영속적 기억 저장 경로
 */

/**
 * Kuzmo Intelligence Core - CMO (Chief Management Officer)
 * 클린 아키텍처 기반 에이전트 팀 관제 로직
 * @param {AgentJobDescription} jd 채용 공고 기반 역할 정의
 */
async function hireAgent(jd) {
    try {
        console.log(`[KUZMO-CMO] Hiring new agent: ${jd.role}...`);
        // 로직: coredocs/agents/${jd.role}.md 로드 및 브로커 등록
    } catch (error) {
        throw new DatabaseException(`Agent activation failed: ${error.message}`);
    }
}
```

---

## 🕵️ [Z-INDEX & UI AUDIT]
- **현황**: 현재 UI 레이어는 3계층(Shell, Broker, Orchestrator)으로 관리됨.
- **리스크**: 에이전트 팀 관리 대시보드 추가 시 기존 `kzm_ui_styles.css`의 `z-index: 1000` 이상 영역과의 충돌 우려.
- **해결**: 에이전트 레이어를 `Z-INDEX_LEGION (2000)`으로 격리하여 시각적 주권 확보.

> [!IMPORTANT]
> "우리는 코드를 짜는 AI를 넘어, 시스템 주권을 운영하는 AI 군단을 고용한다."
> 이 문구는 Kuzmo 에이전트의 새로운 행동 강령으로 채택됩니다.
