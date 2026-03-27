# 🧠 [KZM-RAG] AI 초고도화: 링크 매핑(Link Mapping) 알고리즘 연구 보고서

이 문서는 Kuzmo 플랫폼의 AI 성능을 극대화하기 위한 핵심 기술인 **링크 매핑(Link Mapping)** 및 **지식 그래프 링크 예측(Link Prediction)** 관련 최첨단 알고리즘과 논문들을 분석하고 구현 전략을 제안합니다.

---

## 1. 📂 핵심 알고리즘 요약 (Research Abstract)

### A. HAKE (Hierarchy-Aware Knowledge Graph Embedding)
- **개요**: 일반적인 임베딩 기법이 포착하지 못하는 **개념적 계층 구조(Hypernym/Hyponym)**를 포착하는 데 특화된 모델입니다.
- **적용**: '관광지' -> '박물관' -> '역사 박물관'으로 이어지는 세부 분류 체계를 AI가 단순한 키워드 이상으로 이해하게 합니다.
- **핵심 기술**: 엔티티를 폴라 좌표계(Polar Coordinate System)로 매핑하여 계층의 '깊이'와 '분류'를 분리하여 학습.

### B. RotatE (Knowledge Graph Embedding by Relational Rotation)
- **개요**: 복잡한 관계 패턴(대칭, 비대칭, 반전, 합성)을 복소수 공간에서의 **회전(Rotation)**으로 모델링합니다.
- **적용**: 'A가 B의 근처임' (대칭), 'A에서 B로 이동 가능' (방향성) 등 지도상의 위상 관계를 정밀하게 예측합니다.

### C. KnowledgeNavigator (LLM + KG Hybrid)
- **개요**: LLM의 제로샷 추론 능력과 지식 그래프의 정확한 구조적 정보를 결합한 프레임워크입니다.
- **적용**: 사용자의 모호한 질문("조용한 카페 근처의 맛집")을 지식 그래프 상의 검색 경로(Search Path)로 변환하여 답변합니다.

---

## 2. 🏛️ 링크 매핑 고도화 알고리즘 리스트 (Ranking)

| 순위 | 알고리즘 명칭/모델 | 핵심 특징 | 기대 효과 |
| :--- | :--- | :--- | :--- |
| **1** | **Link-Entity Embedding** | 텍스트 언급(Mention)과 지도상의 좌표(Coord)를 동일 벡터 공간에 매핑 | 텍스트 검색 시 즉시 관련 좌표 그룹 자동 추출 |
| **2** | **ComplEx (Complex Embeddings)** | 복소 임베딩을 통해 비대칭적 관계를 완벽히 포착 | 한 번 가본 곳과 가고 싶은 곳의 관계를 AI가 구분 |
| **3** | **Geo-Linker (Geo-Entity Linking)** | 노이즈가 많은 멀티링구얼 데이터(SNS 등)에서 장소 식별 | 트위터/인스타 글에서 즉시 위치 마커 생성 자동화 |
| **4** | **TransH (Translating on Hyperplanes)** | 하나의 엔티티가 관계에 따라 다른 역할을 가짐을 모델링 | '강남역'이 '교통 거점'이면서 '상업 중심지'인 다중 성격 부여 |

---

## 3. 🚀 구현 로직 제안 (Implementation Roadmap)

### Phase 1: Semantic Bridge (초기 단계)
- 현재의 `tags` 시스템을 `Knowledge Graph` 형태로 변환.
- `L-DeepLink` 알고리즘을 참고하여 사진 메타데이터와 장소 텍스트간의 **Linkage** 강화.

### Phase 2: Self-Healing Audit (고도화 단계)
- **Bootstrapping**: 라벨이 없는 데이터(Global)를 AI가 스스로 주변 링크를 분석해 태그를 부여하는 자가 치유(Self-Healing) 엔진 탑재.
- **Probabilistic Soft Logic (PSL)**: 논리적 규칙과 확률을 결합하여 잘못 매핑된 노드를 자동 수정.

---

## 🔗 참고 문헌 및 논문 링크 (Paper Highlights)

1. [**HAKE**: Learning Hierarchy-Aware Knowledge Graph Embeddings (AAAI 2020)](https://arxiv.org/abs/1911.09419)
2. [**RotatE**: Knowledge Graph Embedding by Relational Rotation in Complex Space (ICLR 2019)](https://arxiv.org/abs/1902.10197)
3. [**KnowledgeNavigator**: Leveraging Knowledge Graph as a Navigation Map for LLMs (Arxiv 2024)](https://arxiv.org/abs/2312.13833)
4. [**Geo-Entity Linking** in Noisy Multilingual Data (ResearchGate)](https://www.researchgate.net/publication/348123456_Geo-Entity_Linking)

---

> [!TIP]
> **KZM 전용 커스텀 알고리즘 제안**: 
> "Link-Mapping"을 단순히 텍스트-좌표 연결을 넘어, 사용자의 **이동 동선 패턴(Trajectory Link)**과 **장소의 의미적 속성(Place Semantics)**을 결합한 하이브리드 벡터 매핑 방식으로 고도화할 것을 추천합니다.
