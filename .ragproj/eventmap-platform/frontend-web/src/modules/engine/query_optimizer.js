/**
 * 👑 KUZMO QUERY OPTIMIZER (v20.0 Platinum Proxy)
 * ==============================================
 * @description 워커와의 통신을 브릿징하며, 사용자의 동작 궤적(Velocity)을 실시간 분석하는 비동기 지능 계층입니다.
 * @philosophy '속도가 곧 지능'인 아키텍처를 위해 무거운 연산을 워커로 오프로딩합니다.
 * @maintenance 모든 로직에 줄 단위 주석을 완비하여 구글급 유지보수성을 확보했습니다.
 */

// [STATE_BRIDGE] 전역 상태 객체를 가져와 맵 설정 및 뷰포트 정보에 접근합니다.
import { state } from '../core/state.js';

class KuzmoQueryOptimizer {
    // [STATIC_SINGLETON] 전역적인 워커 관리 및 요청 맵을 정적으로 유지
    static _worker = null;
    static _requestMap = new Map(); // 발급된 ID별 콜백 함수 저장소
    static _idCounter = 0; // 요청 구분을 위한 일련번호 생성기
    static _lastViewport = null; // 가속도 계산을 위한 직전 뷰포트 스냅샷
    static _velocity = 0; // 지수 이동 평균(EMA) 기반의 뷰포트 이동 가속도 센서

    /** 🔌 [WORKER_BOOT] 워커 엔진 가동 및 리스너 등록 */
    static init() {
        // [INITIAL_GUARD] 이미 워커가 생성되어 가동 중이면 중복 생성을 방지합니다.
        if (this._worker) return;
        
        // [SPAWN] 신경망 연산 전용 워커 생성 (src/modules/engine/intelligence_worker.js 경로 참조)
        this._worker = new Worker(new URL('./intelligence_worker.js', import.meta.url));
        
        // [LISTENER] 워커가 무거운 연산을 마치고 결과를 보내면 해당 요청 지점으로 데이터 라우팅
        this._worker.onmessage = (e) => {
            const { id, results } = e.data;
            // 요청 맵에서 ID에 매칭되는 프라미스 리졸브 함수를 찾아 실행합니다.
            if (this._requestMap.has(id)) {
                this._requestMap.get(id)(results);
                this._requestMap.delete(id); // 메모리 누수 방지를 위한 요청 정보 즉시 소거
            }
        };
    }

    /** 🚀 [ASYNC_HNSW_DISPATCH] 지능형 비동기 랭킹 (Global Hub) */
    static async dispatch(tier, context) {
        // [INITIALIZE] 워커 인스턴스가 없으면 즉시 레이지 로딩 방식으로 기동합니다.
        this.init();

        // [PROMISE_WRAPPER] 워커의 메시지 기반 비동기 연산을 Async/Await 흐름으로 래핑합니다.
        return new Promise((resolve) => {
            // [TICKET_ISSUANCE] 요청 식별을 위한 고유 티켓 ID 발급
            const id = this._idCounter++;
            this._requestMap.set(id, resolve); // 리졸브 콜백을 맵에 보관
            
            // [VELOCITY_ANALYSIS] 뷰포트 이동 속도를 분석하여 'Adaptive Gaussian'용 가중치 산출
            const vRate = this._updateVelocity(context.viewport);
            
            // [OFFLOAD] 메인 UI 스레드 프리징 없이 워커로 대용량 데이터 연산 작업 위임
            this._worker.postMessage({ 
                id, 
                tier, 
                context: { ...context, vRate } // 동적 가속도(vRate) 정보를 가변 인자로 주입
            });
        });
    }

    /** 📏 [VELOCITY_ANALYZER] 뷰포트 이동 가속도 측정 (v22.60 MAX) */
    static _updateVelocity(vp) {
        // [FIRST_RUN_GUARD] 첫 실행이거나 뷰포트 정보가 없으면 기본 물리값 반환
        if (!vp || !this._lastViewport) {
            this._lastViewport = vp;
            return 0.1;
        }

        // [EUCLIDEAN_METRIC] 현재와 직전 뷰포트 좌상단 좌표의 유클리드 거리 차이로 절대 속도 계산
        const dist = Math.sqrt(
            Math.pow(vp.minLat - this._lastViewport.minLat, 2) + 
            Math.pow(vp.minLng - this._lastViewport.minLng, 2)
        );

        // [EMA_FILTER] 지수 이동 평균(Exponential Moving Average) 필터를 통해 속도 변화를 부드럽게 보정
        // 공식: 0.7(기존 관성) + 0.3(현재 변화량) -> 튀는 값 억제
        this._velocity = (this._velocity * 0.7) + (dist * 0.3); 
        this._lastViewport = vp;

        // [NORMALIZATION] 계산된 물리 속도를 0~1 사이의 알고리즘 가중치(Sigma 조정용)로 정규화
        return Math.min(this._velocity * 100, 1.0); 
    }
}

// [DEFAULT_EXPORT] 외부 모듈(map_renderer 등)에서 즉시 사용 가능한 지능형 인터페이스 노출
export default KuzmoQueryOptimizer;
export { KuzmoQueryOptimizer }; // 명시적 내보내기 병행
