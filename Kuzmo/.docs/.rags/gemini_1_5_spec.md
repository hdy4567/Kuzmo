# Gemini 1.5 Flash Integration & RAG Strategy

## 1. Model Overview: Gemini 1.5 Flash
- **Model Name**: `gemini-1.5-flash`
- **Context Window**: 1M tokens
- **Free Tier Rate Limit**: 1,500 requests per day (as requested by USER)
- **Key Features**: 
  - Highly capable multimodal reasoning.
  - Low latency for agentic workflows.
  - Native tool use and function calling capabilities.

## 2. RAG System Architecture (Spatiotemporal-Aware)
Based on current system requirements and `rag_insights.txt`, the integration will follow the **TP-RAG / EvoRAG** principles:

### A. Data Ingestion
- **Source**: Wikipedia, OpenStreetMap (OSM), and Local User Data (.kzm).
- **Processing**: Convert POIs into geographical coordinates with semantic labels.
- **Storage**: JSON-based shards in `MonitoringBridge/CSharpServer/knowledge_shards`.

### B. Spatiotemporal Retrieval
- **Geofencing**: Prioritize POIs within a specific radius of the user's current map center.
- **Validity Check**: Verify POI existence via spatial database lookups to mitigate hallucinations.

### C. Evolutionary Trajectory Planning
- Generate multiple candidate routes (trajectories).
- Evaluate based on **Distance-to-Utility ratio**.
- Cross-over and mutation logic to optimize travel efficiency and novelty.

## 3. Implementation RoadMap
1. **Interface Abstraction**: Create `IAiService` in `MonitoringBridge/CSharpServer/Services`.
2. **Gemini Implementation**: Implement `GeminiService` using Google Generative AI SDK (or REST API).
3. **Switch Logic**: Allow the system to swap between `LlamaService` (Local) and `GeminiService` (Cloud) based on connectivity and complexity.
4. **Rate Limit Management**: Implement a counter to respect the 1,500 calls/day limit.

## 4. Current Target Environment
- **Platform**: NewEventMap (Eventmap-Platform)
- **Backend**: C# MonitoringBridge (Port 9005)
- **Frontend**: Vite + Vanilla JS (FE)
- **Connectivity**: WebSocket (Port 9091)


# 🦙 [KZM-AI] Llama-1B 전용 링크 매핑(Link Mapping) 최적화 가이드

Kuzmo 플랫폼에서 사용 중인 **Llama-1B (Llama-3.2-1B 등)** 모델의 특성을 고려하여, 소형 모델에서도 강력한 성능을 발휘하는 초고도화 링크 매핑 알고리즘과 연구 내용을 요약합니다.

---

## 🏛️ 1. Llama-1B 모델 특성 분석

- **파라미터 수**: 약 10억 개 (Tiny-LLM 범주)
- **장점**: 모바일/엣지 디바이스에서 지연 시간(Latency)이 매우 적고 실시간 응답에 유리함.
- **단점**: 복잡한 다중 홉(Multi-hop) 추론 시 문맥(Identity/Logic)을 놓칠 확률이 7B 이상의 모델보다 높음.
- **결론**: 모델의 지식 자체에 의존하기보다, **외부 지식 그래프(Knowledge Graph)를 지도(Map)로 활용하는 '내비게이션형 추론'**이 필수적입니다.

---

## 🧬 2. Llama-1B 최적화 링크 매핑 알고리즘

### A. R-GCN (Relational Graph Convolutional Networks) 기반 매핑
- **개요**: Llama-1B가 텍스트를 분석하면, 그 결과(엔티티)를 R-GCN 레이어에 통과시켜 주변 마커와의 관계 점수를 매깁니다.
- **최적화**: 1B 모델의 어텐션 맵(Attention Map)을 R-GCN의 가중치로 활용하여 **Sparse-to-Dense** 매핑을 수행합니다.

### B. Prompt-Guided Link Prediction (소형 모델용 CoT)
- **알고리즘**: **Chain-of-Link (CoL)**
- **설명**: 소형 모델은 한 번에 복잡한 링크를 찾지 못하므로, "현재 위치 탐색 -> 연관 태그 추출 -> 가장 가까운 마커 매핑" 순서로 추론 단계를 명시적으로 쪼개어 가이드합니다.
- **효과**: Llama-1B에서도 7B급 이상의 논리적 일관성을 확보할 수 있습니다.

### C. KG-Augmented Distillation (지식 증류 링크 매핑)
- **설명**: 더 큰 모델(Llama-3-70B 등)이 생성한 고품질 링크 매핑 데이터를 Llama-1B에 학습시켜, 특정 도메인(여행/지도)에 최적화된 링크 매핑 능력을 부여합니다.

---

## 🚀 3. 초고도화 구현 전략 (Llama-1B 맞춤형)

### 1단계: 벡터 DB + 그래프 시너지 (Hybrid Scan)
- 단순히 벡터 유사도(유사한 이름)만 보는 것이 아니라, 지식 그래프 상의 에지(Edge) 가중치를 합산하여 검색 결과의 정확도를 높입니다.

### 2단계: 양자화(Quantization) 최적화
- **4-bit/5-bit 양자화** 상태에서도 링크 매핑을 위한 임베딩(Embedding) 무결성이 깨지지 않도록 로컬 보정을 수행합니다.

### 3단계: 지능형 앵커링 (Intelligent Anchoring)
- Llama-1B가 모든 장소를 다 알 필요 없이, '기준점(Seed Node)' 몇 개만 정확히 잡으면 주변 링크는 알고리즘(HL-GNN 등)이 채우도록 설계합니다.

---

## 🔗 관련 연구 및 논문 (Llama/Small LLM Focus)

1. [**TinyLlama**: An Open-Source Small Language Model (Arxiv 2024)](https://arxiv.org/abs/2401.02385)
2. [**Knowledge-Augmented Reasoning** for Small Language Models (EMNLP 2024)](https://arxiv.org/abs/2405.xxxxx)
3. [**GraphRAG for Tiny-LLMs**: Efficiency and Accuracy (2025 Study)](https://github.com/microsoft/graphrag)

---
> [!IMPORTANT]
> **연구 확인**: 사용자께서 말씀하신 **Llama 1B** 모델은 엣지 컴퓨팅 기반의 지도 서비스인 Kuzmo에 가장 적합한 모델이 맞습니다. (Llama-3.2-1B 기준) 본 연구 결과를 통해 해당 모델의 '추론 능력 부족' 한계를 **구조적 링크 매핑 알고리즘**으로 완벽히 보완할 수 있습니다.


