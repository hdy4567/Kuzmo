# 🏛️ AI Innovation Strategy: RAG & MCP (Study v1.0)
> Source: [Ponyo Design - AI Workflow Transformation](https://brunch.co.kr/@ponyodesign/8)

## 🎯 기술 개요 및 안티그래비티 적용 전략

- **대주제: MCP(Model Context Protocol) 기반 인프라 지능화**
    - **소주제 1: 도구 통합의 sovereignty (주권)**
        - 피그마, 노션, 믹스패널 등 이기종 툴을 AI 컨텍스트에 직접 연결
        - **Antigravity 적용**: 브라우저, 쉘, Git, 파일 시스템을 MCP 규격으로 추상화하여 에이전트 성능 극대화
    - **소주제 2: AI-Ready 데이터 구조 설계**
        - 디자인 파일이나 코드가 AI가 이해하기 쉬운 명명 규칙과 레이어 구조를 가져야 함
        - **Antigravity 적용**: 클린 아키텍처 및 직관적 파일 명명 규칙(Rule #3)을 강제하여 RAG 효율 최적화

- **대주제: RAGS (Retrieval-Augmented Generation at Scale)**
    - **소주제 1: 실시간 컨텍스트 주입**
        - 정적 지식 베이스를 넘어 실시간 프로젝트 가설, 브리프, PRD를 AI가 즉각 참조
        - **Antigravity 적용**: `.docs/coredocs`를 벡터 데이터로 활용하여 에이전트의 의사결정 근거를 강화
    - **소주제 2: 데이터 무결성 검사 (Audit)**
        - AI를 활용한 전수 검사(md 기반)를 통해 누락된 로직이나 잘못된 구조를 실시간 발견
        - **Antigravity 적용**: `omo-supervision` 로직에 RAG 기반 상시 감사 체계 통합

- **대주제: 워크플로우 생산성 혁신**
    - **소주제 1: 기획-리서치 가속화**
        - 수 주가 걸리던 PRD/기능 정의서 작성을 AI 기반 컨텍스트 조립을 통해 1~2일 내 완료
    - **소주제 2: 접근성 및 표준 자동 점검**
        - 배리어프리 체크, 제안서 자동화 등 반복적이고 정밀한 작업을 AI 플러그인으로 대체

---

## 📊 비즈니스 조건 및 코드 액션 매핑

| Business Context | RAG/MCP Action | Expected Outcome |
| :--- | :--- | :--- |
| **Context Fragmentation** | Implement MCP Server for local tool access | Zero-latency tool interaction |
| **Outdated Documentation** | Auto-update `coredocs` via periodic RAG scan | Sync between Code & Strategy |
| **Structural Corruption** | AI-driven 전수검사 for Clean Arch | Technical Debt reduction |

--- 해결책 : Ponyo Design의 AI 전환 사례를 기반으로 MCP 수용 및 RAG 지능화 전략을 `coredocs`에 영구 보존. 안티그래비티 환경의 도구 가속기(Tool Accelerator)로 활용.

## Builder & Tester Verification
- [x] `.docs/coredocs/rag_mcp_strategy.md` 경로 유효성 확인
- [x] 기존 문서를 삭제하지 않고 계층을 심화하여 추가
- [x] Antigravity 환경 내 도구 연동성 검토 (Browser/Shell 연동 확인)
