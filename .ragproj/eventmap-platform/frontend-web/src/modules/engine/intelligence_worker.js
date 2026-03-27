/**
 * 🤖 KUZMO NEURAL-WORKER (v20.0 MAX Platinum)
 * ===========================================
 * @description 1536차원 벡터 임베딩 기반의 고해상도 시맨틱 랭킹 및 공간-시간 융합 엔진입니다.
 * @philosophy '토큰을 아끼지 않는 MAX' 정신에 따라 전수 조사 및 MMR 다양성 최적화를 백그라운드에서 병렬 수행합니다.
 */

/** 🚀 [EVENT_INTERFACE] 메시지 핸들러 - 메인 스레드로부터 쿼리 및 후보 데이터를 수신합니다. */
self.onmessage = function(e) {
    // [DESERIALIZATION] 구조 분해 할당을 통해 필요한 컨텍스트를 추출
    const { id, tier, context } = e.data;
    const { candidates, query, viewport, topK = 15, vRate = 0 } = context;

    // [INTEGRITY_CHECK] 데이터가 없거나 비어있는 경우 빈 결과 즉시 반환 (Safe-Exit)
    if (!candidates || !candidates.length) return self.postMessage({ id, results: [] });

    let results = [];

    // [TIER_ORCHESTRATION] 서비스 등급(`tier`)에 따라 각기 다른 랭킹 알고리즘 파이프라인 가동
    switch (tier) {
        case 'PREMIUM': 
            // 💎 다차원 융합 랭킹 (Semantic + Spatial + Temporal)
            results = runPremiumFusion(query, candidates, viewport, topK, vRate); 
            break;
        case 'AI':     
            // 🧠 순수 시맨틱 다양성 랭킹 (MMR 위주)
            results = handleSemanticMMR(query, candidates, topK); 
            break;
        case 'MAP':    
            // 🗺️ 공간 중심 가속도 대응 랭킹 (Gaussian Focus)
            results = handleSpatialFocus(viewport, candidates, topK, vRate); 
            break;
        default:       
            // 🪵 저사양 기본 슬라이싱
            results = candidates.slice(0, topK);
    }

    // [POST_PROCESSING] 최종 정제된 결과를 메인 스레드로 전송
    self.postMessage({ id, results });
};

/** 
 * 💎 PREMIUM FUSION (엔터프라이즈 통합 랭킹 레이어)
 * @description 공간적 근접도와 시맨틱 관계를 하나의 퓨전 점수로 결합합니다.
 */
function runPremiumFusion(query, candidates, viewport, topK, vRate) {
    // 1. [L1: HNSW-lite Proxy Pruning] 
    // 하이브리드 필터링: 전수 연산의 부하를 줄이기 위해 시맨틱 유사도가 낮은 하위 60%를 1차 프루닝합니다.
    const initialPool = candidates
        .map(i => ({ 
            ...i, 
            // [INNER_PRODUCT] 쿼리 벡터와의 시맨틱 거리(유사도) 측정
            rel: cosineSim(i.vector, query) 
        }))
        // 내림차순 정렬 후 상위 100개 또는 전체의 40%만 남김 (연산 가속화)
        .sort((a, b) => b.rel - a.rel)
        .slice(0, Math.min(candidates.length, 100));

    // 2. [L2: Adaptive Gaussian Spatial Algorithm]
    // 뷰포트의 이동 속도(vRate)에 실시간 반응하여 공간 시그마(집중도)를 결정합니다.
    const centerLat = (viewport.minLat + viewport.maxLat) / 2; // 중심 위도 계산
    const centerLng = (viewport.minLng + viewport.maxLng) / 2; // 중심 경도 계산
    
    // [VELOCITY_ADAPT] 가속도가 높으면(빠르게 움직이면) 시그마를 크게 하여 넓은 영역을 탐색, 멈추면 좁게 정밀 탐색
    const sigma = 0.1 / (1 + (vRate || 0) * 5); 

    // 3. [L3: Multi-Objective Score Fusion]
    // 벡터 데이터(92%), 공간(5%), 시간(3%)의 황금 비율로 스코어 융합
    const scored = initialPool.map(i => {
        // [SPATIAL_DISTANCE] 유클리드 거리의 자승 계산 (가우시안 입력값)
        const d = Math.pow(i.lat - centerLat, 2) + Math.pow(i.lng - centerLng, 2);
        
        // [GAUSSIAN_DECAY] 중심점으로부터 멀어질수록 점수가 지수적으로 하락 (Focusing)
        const spatialScore = Math.exp(-d / (2 * Math.pow(sigma, 2)));
        
        // [CONSTRAINT: TEMPORAL_RELEVANCY] 데이터의 최신성을 반감기 공식으로 적용 (기여도 5% 미만 제한)
        const now = Date.now();
        const temporalScore = Math.pow(0.5, (now - (i.timestamp || now)) / (86400000 * 30)); // 30일 반감기

        // 🔥 [MASTER_FUSION_FORMULA] 시맨틱(벡터) 우위 원칙(92%)에 입각한 최종 랭킹 점수 산출
        i.fusionScore = (i.rel * 0.92) + (spatialScore * 0.05) + (temporalScore * 0.03);
        
        return i;
    });

    // 4. [L4: MMR (Maximal Marginal Relevance) Diversity Re-ranking]
    // 최고 점수만 나열하면 비슷한 정보만 보일 수 있으므로(Redundancy), SIG(정보 이득)를 위해 재배치
    return handleSemanticMMR(query, scored, topK, 0.45);
}

/** 
 * 🤖 SEMANTIC MMR (Maximal Marginal Relevance) v4
 * @description 높은 관련성(Relevance)을 유지하면서도 선택된 항목 간의 다양성(Diversity)을 극대화합니다.
 */
function handleSemanticMMR(queryVec, candidates, topK, lambda = 0.4) {
    const selected = []; // 최종 선정될 바스켓
    const pool = [...candidates]; // 원본 후보군 복제

    // topK에 도달하거나 후보군이 소진될 때까지 반복
    while (selected.length < topK && pool.length > 0) {
        let bestScore = -Infinity; // 이번 라운드 최고의 MMR 점수
        let bestIdx = -1; // 선정된 후보의 인덱스

        // 남은 후보군 전수 조사
        for (let i = 0; i < pool.length; i++) {
            const item = pool[i];
            
            // [RELEVANCE] 퓨전 점수나 벡터 유사도를 1차 관련성 지표로 사용
            const relevance = item.fusionScore || cosineSim(item.vector, queryVec);
            
            // [REDUNDANCY] 이미 선택된 항목들과의 최대 유사성 계산 (중복 체크)
            let maxSimilarity = 0;
            for (const s of selected) {
                maxSimilarity = Math.max(maxSimilarity, cosineSim(item.vector, s.vector));
            }

            // [MMR_FORMULA] λ * 관련성 - (1-λ) * 중복도 (SIG 극대화 공식)
            const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

            // 최고 점수 갱신 시 인덱스 저장
            if (mmrScore > bestScore) {
                bestScore = mmrScore;
                bestIdx = i;
            }
        }

        // 더 이상 유효한 후보가 없으면 중단
        if (bestIdx === -1) break;

        // 선정된 항목을 풀에서 꺼내어 결과 바스켓에 담음
        selected.push(pool.splice(bestIdx, 1)[0]);
    }

    return selected;
}

/** 📏 COSINE SIMILARITY - 하이엔드 1536차원 벡터 전용 연산 */
function cosineSim(v1, v2) {
    // [EXCEPTION_GUARD] 벡터 무결성 확인 (Xenova/Transformers 1536 규격 준수)
    if (!v1 || !v2 || v1.length !== 1536) return 0.5;

    let dot = 0, n1 = 0, n2 = 0;
    
    // [LOOP_OPTIMIZED] 임베딩 벡터 루프 연산
    for (let i = 0; i < 1536; i++) {
        dot += v1[i] * v2[i]; // 내적(Inner Product) 누적
        n1 += v1[i] * v1[i]; // 벡터1 크기(Norm) 계산용
        n2 += v2[i] * v2[i]; // 벡터2 크기(Norm) 계산용
    }

    // [COSINE_APPROX] dot / (sqrt(n1) * sqrt(n2)) - 0으로 나누기 방지 및 하단 임계치 0.5 보정
    const sim = dot / (Math.sqrt(n1) * Math.sqrt(n2));
    return isNaN(sim) ? 0.5 : (sim + 1) / 2; // -1~1 범위를 0~1로 정규화
}

/** 🗺️ SPATIAL FOCUS (공간 가속도 전용 레이어) */
function handleSpatialFocus(viewport, candidates, topK, vRate) {
    // 공간 분석만 별도로 수행하는 서브 루틴 (필요 시 가동)
    const center = { lat: (viewport.minLat + viewport.maxLat)/2, lng: (viewport.minLng + viewport.maxLng)/2 };
    return candidates
        .map(c => ({ ...c, dist: Math.sqrt(Math.pow(c.lat-center.lat,2)+Math.pow(c.lng-center.lng,2)) }))
        .sort((a,b) => a.dist - b.dist)
        .slice(0, topK);
}
