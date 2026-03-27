import { state } from '../core/state.js';

/**
 * 🕵️ [PERF-GUARDIAN] Core Performance Monitoring Engine (v2.0)
 * Works Универсально on Web (Browser) and App (Capacitor/WebView).
 */
export class PerformanceGuardian {
    constructor() {
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.isActive = false;
        this.isMobile = !!window.Capacitor;
        this.lastInteraction = Date.now();
        this.isDeepSleep = false;
        
        this.setupInteractionHooks();
    }

    setupInteractionHooks() {
        const wake = () => {
            if (this.isDeepSleep) this.wakeUp();
            this.lastInteraction = Date.now();
        };
        ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(e => 
            window.addEventListener(e, wake, { passive: true })
        );

        // 🌗 [VISIBILITY-THROTTLE] (v22.60) 백그라운드 전환 시 즉시 0% 모드
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.enterDeepSleep();
            else this.wakeUp();
        });
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;
        console.log(`🚀 [PERF] Unified Guardian Started (${this.isMobile ? 'App' : 'Web'})`);
        this.loop();
    }

    stop() {
        this.isActive = false;
        this.isDeepSleep = true; // Signal as suspended
    }

    wakeUp() {
        console.log("🌞 [PERF] Interaction detected. Waking up systems (CPU 0% Phase End)...");
        this.isDeepSleep = false;
        state.perfMode = 'ULTRA';
        this.start();
        
        // Signal systems to resume
        this.signalThrottling('NORMAL');
    }

    loop() {
        if (!this.isActive) return;

        const now = performance.now();
        
        // 💤 [IDLE-DETECTION] (v22.60) 3분간 미활동 시 딥슬립 (CPU 0% 지향)
        if (Date.now() - this.lastInteraction > 180000) {
            this.enterDeepSleep();
            return; 
        }

        this.frameCount++;
        if (now > this.lastTime + 1000) {
            const fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            state.currentFPS = fps;
            this.evaluate(fps);
            this.frameCount = 0;
            this.lastTime = now;
        }
        requestAnimationFrame(() => this.loop());
    }

    enterDeepSleep() {
        console.warn("😴 [PERF] 3 min Inactivity. Entering Deep Sleep (CPU 0% Mode)...");
        this.isDeepSleep = true;
        this.isActive = false;
        state.perfMode = 'DEEP_SLEEP';
        this.signalThrottling('SUSPEND');
        
        // 🏥 [EXC] Update UI to show low-power status
        import('../view/ui/ui_base.js').then(m => m.showToast("시스템이 대기 모드(0% CPU)로 진입했습니다.", "info"));
    }

    /**
     * 🚥 [DYNAMIC-EVALUATION] (Hysteresis-protected)
     */
    evaluate(fps) {
        let targetMode = 'STABLE';
        let aggression = 1.0;

        // Thresholds are TIGHTER on Mobile to prevent thermal throttling
        const lowLimit = this.isMobile ? 35 : 30;
        const critLimit = this.isMobile ? 20 : 15;

        if (fps < lowLimit) {
            targetMode = (fps < critLimit) ? 'CRITICAL' : 'LOW_POWER';
            aggression = (fps < critLimit) ? 2.5 : 1.5;
            
            if (state.perfMode !== targetMode) {
                console.warn(`⚠️ [PERF] High Pressure Identified (${fps} FPS). Switching to ${targetMode}`);
                this.signalThrottling(targetMode);
            }
        } else if (fps > 55) {
            targetMode = 'ULTRA';
            aggression = 1.0;
            if (state.perfMode !== targetMode) this.signalThrottling('NORMAL');
        }

        state.perfMode = targetMode;
        state.clusterAggression = aggression;
    }

    /**
     * 📢 [UNIFIED-SIGNAL] Tell other subsystems to back off or sleep
     */
    signalThrottling(mode) {
        const isThrottled = mode === 'CRITICAL' || mode === 'LOW_POWER';
        const isSleep = mode === 'SUSPEND' || mode === 'DEEP_SLEEP';
        
        // 1. Worker Throttling & Suspension
        if (state.worker) {
            if (isSleep) {
                console.log("🛑 [PERF] Terminating worker for deep sleep...");
                state.worker.terminate();
                state.worker = null;
            } else {
                state.worker.postMessage({ action: 'SET_PERF_MODE', mode: mode });
            }
        } else if (!isSleep) {
            // Wake up worker if it was terminated
            import('../infra/worker_bridge.js').then(m => m.initWorker());
        }

        // 2. AI Network Backoff or Disconnect
        if (state.socket) {
            if (isSleep) {
                console.log("🛑 [PERF] Closing socket for deep sleep...");
                state.socket.close();
                state.socket = null;
            } else if (state.socket.readyState === WebSocket.OPEN) {
                state.socket.send(JSON.stringify({ 
                    type: "SYNC_CONFIG", 
                    config: { throttleLevel: mode === 'CRITICAL' ? 1.0 : isThrottled ? 0.5 : 0.0 } 
                }));
            }
        } else if (!isSleep) {
            import('./ai.js').then(m => m.initSocket());
        }
    }
}

export const perfGuardian = new PerformanceGuardian();
