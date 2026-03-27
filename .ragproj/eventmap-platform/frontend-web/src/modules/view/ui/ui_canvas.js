/**
 * 🎨 Kuzmo High-Fidelity Canvas (v22.0)
 * ========================================
 * @description Google Keep 스타일의 고성능 드로잉 엔진입니다.
 * @philosophy '붓의 결이 지능이다' - 단순 픽셀이 아닌 벡터(SVG) 구조를 보존하여 AI Vision 분석을 최적화합니다.
 */

import { showToast } from './ui_base.js';

class KuzmoCanvasEngine {
    constructor() {
        this.active = false;
        this.canvas = null;
        this.ctx = null;
        this.drawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.brushColor = '#000000';
        this.brushSize = 3;
        
        // 🚀 [VECTOR-TRACKING] AI 분석을 위한 SVG 경로 데이터 직렬화
        this.paths = []; 
        this.currentPathData = []; // [[x,y], [x,y]...] for smooth interpolation
        
        // ⚡ [PERF-CORE] 60FPS Render Loop & Buffer
        this.pointsBuffer = [];
        this.drawQueue = []; // Points waiting for RAF
        this.frameId = null;
        
        // ⚡ [TURBO-CORE] WebWorker for Offscreen Rendering
        this.worker = null;
        this.offscreenTop = null;
        
        this.velocity = 0;
        this.lastTimestamp = 0;



        this.initDOM();
    }

    /** 🏗️ [DOM_INJECTION] 캔버스 레이어 생성 및 초기화 */
    initDOM() {
        if (document.getElementById('canvas-layer')) return;

        const backdrop = document.createElement('div');
        backdrop.id = 'canvas-layer';
        backdrop.className = 'canvas-backdrop';
        backdrop.innerHTML = `
            <div id="sketch-canvas-wrapper">
                <div class="canvas-main-container">
                    <canvas id="canvas-grid-layer"></canvas> <!-- Grid/Background -->
                    <canvas id="main-sketch-canvas"></canvas> <!-- Static Strokes -->
                    <canvas id="canvas-top-layer"></canvas>   <!-- Active/Real-time Stroke -->
                    
                    <div class="canvas-floating-toolbar">
                        <div class="tool-group">
                            <button class="canvas-tool active" data-tool="pen" title="Pen">🖋️</button>
                            <button class="canvas-tool" data-tool="highlighter" title="Highlighter">🖍️</button>
                            <button class="canvas-tool" data-tool="eraser" title="Eraser">🧽</button>
                        </div>
                        <div class="tool-divider"></div>
                        <div class="tool-group color-palette">
                            <button class="color-dot active" style="--color: #ffffff" data-color="#ffffff"></button>
                            <button class="color-dot" style="--color: #00e5ff" data-color="#00e5ff"></button>
                            <button class="color-dot" style="--color: #ffde00" data-color="#ffde00"></button>
                            <button class="color-dot" style="--color: #ff4081" data-color="#ff4081"></button>
                        </div>
                        <div class="tool-divider"></div>
                        <button class="canvas-action-btn" id="canvas-clear" title="Clear All">🧹</button>
                    </div>

                    <div class="canvas-bottom-bar">
                        <div class="canvas-info-chip">Samsung-Grade Engine v28.0</div>
                        <button class="kzm-btn-premium" id="canvas-done-btn">
                            <span>SAVE NOTES</span>
                            <div class="btn-glow"></div>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);

        this.gridCanvas = document.getElementById('canvas-grid-layer');
        this.canvas = document.getElementById('main-sketch-canvas');
        this.topCanvas = document.getElementById('canvas-top-layer');
        
        this.ctx = this.canvas.getContext('2d', { desynchronized: true });
        this.topCtx = this.topCanvas.getContext('2d', { desynchronized: true });
        this.gridCtx = this.gridCanvas.getContext('2d', { alpha: true });

        // 💥 [WORKER-HYDRATION] OffscreenCanvas 전송
        this.initWorker();
        this.setupListeners();



    }

    /** 🔌 [EVENT_LISTENERS] 포인터 이벤트 바인딩 (압력/속도 감응형) */
    setupListeners() {
        const wrapper = document.getElementById('sketch-canvas-wrapper');
        
        // [FULLSCREEN-TOGGLE] 탭/클릭 시 전체화면 전환 (Keep 스타일)
        wrapper.onclick = (e) => {
            if (e.target.id === 'main-sketch-canvas' && !this.drawing) {
                // wrapper.classList.toggle('fullscreen'); // 필요 시 활성화
                // this.resize();
            }
        };

        const startDraw = (e) => {
            if (this.penMode && e.pointerType === 'touch') return;
            if (e.pointerType === 'touch' && (e.width > 25 || e.height > 25)) return;

            if (e.pointerType === 'pen') this.penMode = true;
            this.activePointerId = e.pointerId;
            this.drawing = true;

            const [x, y] = this.getCoords(e);
            this.lastX = x;
            this.lastY = y;
            this.lastTimestamp = e.timeStamp;
            this.currentPathData = [[x, y]];
            
            this.worker.postMessage({ type: 'START', payload: { x, y } });
        };

        const draw = (e) => {
            if (!this.drawing || e.pointerId !== this.activePointerId) return;
            
            const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
            events.forEach(ev => {
                const [x, y] = this.getCoords(ev);
                const dt = ev.timeStamp - this.lastTimestamp;
                const dist = Math.hypot(x - this.lastX, y - this.lastY);
                const velocity = dt > 0 ? (dist / dt) : 0;
                
                this.worker.postMessage({ 
                    type: 'MOVE', 
                    payload: { 
                        x, y, 
                        brushColor: this.brushColor, 
                        brushSize: this.brushSize,
                        velocity 
                    } 
                });

                this.currentPathData.push([x, y]);
                this.lastX = x;
                this.lastY = y;
                this.lastTimestamp = ev.timeStamp;
            });
        };

        const stopDraw = (e) => {
            if (this.drawing && e.pointerId === this.activePointerId) {
                const svgPath = this.generateSvgPath(this.currentPathData);
                this.paths.push(svgPath);
                this.drawing = false;
                
                // 🏁 [BAKE] Sync worker stroke to main canvas
                this.ctx.drawImage(this.topCanvas, 0, 0, this.canvas.width / devicePixelRatio, this.canvas.height / devicePixelRatio);
                this.worker.postMessage({ type: 'CLEAR' });
                
                if (e.pointerType === 'pen') {
                    setTimeout(() => { if (!this.drawing) this.penMode = false; }, 1000);
                }
            }
        };



        this.canvas.addEventListener('pointerdown', startDraw);
        this.canvas.addEventListener('pointermove', draw);
        this.canvas.addEventListener('pointerup', stopDraw);
        this.canvas.addEventListener('pointerout', stopDraw);

        // [CONTROLS] 도구 선택
        document.querySelectorAll('.canvas-tool').forEach(btn => {
            btn.onclick = () => {
                this.currentTool = btn.dataset.tool;
                if (this.currentTool === 'eraser') {
                    this.brushColor = 'rgba(255,255,255,1)';
                    this.brushSize = 30;
                } else if (this.currentTool === 'highlighter') {
                    this.brushColor = 'rgba(255, 222, 0, 0.3)';
                    this.brushSize = 15;
                } else {
                    this.brushColor = this.selectedColor || '#ffffff';
                    this.brushSize = 3;
                }
                document.querySelectorAll('.canvas-tool').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });

        document.querySelectorAll('.color-dot').forEach(btn => {
            btn.onclick = () => {
                this.selectedColor = btn.dataset.color;
                this.brushColor = this.selectedColor;
                document.querySelectorAll('.color-dot').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });


        document.getElementById('canvas-clear').onclick = () => this.clear();
    }

    getCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
    }

    /** ⚡ [TURBO] Offscreen Canvas Worker Initialization */
    initWorker() {
        if (this.worker) return;
        
        // Use relative path for worker file
        this.worker = new Worker(new URL('./canvas_worker.js', import.meta.url));
        
        // Transfer Offscreen Control
        const offscreen = this.topCanvas.transferControlToOffscreen();
        this.worker.postMessage({ type: 'INIT', payload: { canvas: offscreen } }, [offscreen]);
    }



    generateSvgPath(points) {
        if (points.length < 2) return "";
        let path = `M ${points[0][0]} ${points[0][1]}`;
        for (let i = 1; i < points.length; i++) {
            const p = points[i];
            const prev = points[i-1];
            const midX = (prev[0] + p[0]) / 2;
            const midY = (prev[1] + p[1]) / 2;
            path += ` Q ${prev[0]} ${prev[1]} ${midX} ${midY}`;
        }
        return path;
    }


    /** 🧹 [CLEAR] 캔버스 초기화 */
    clear() {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.paths = [];
        showToast("캔버스가 초기화되었습니다.", "info");
    }

    /** 📏 [RESIZE] 레이어별 타겟 해상도 설정 */
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        [this.gridCanvas, this.canvas].forEach(c => {
            c.width = rect.width * dpr;
            c.height = rect.height * dpr;
            c.style.width = rect.width + 'px';
            c.style.height = rect.height + 'px';
            c.getContext('2d').scale(dpr, dpr);
        });

        // Worker Resize
        if (this.worker) {
            this.worker.postMessage({ 
                type: 'RESIZE', 
                payload: { width: rect.width * dpr, height: rect.height * dpr } 
            });
        }

        this.drawGrid();
    }


    drawGrid() {
        this.gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        this.gridCtx.strokeStyle = 'rgba(255,255,255,0.03)';
        this.gridCtx.lineWidth = 0.5;
        const step = 30;
        for (let x = 0; x < this.gridCanvas.width; x += step) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(x, 0);
            this.gridCtx.lineTo(x, this.gridCanvas.height);
            this.gridCtx.stroke();
        }
        for (let y = 0; y < this.gridCanvas.height; y += step) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, y);
            this.gridCtx.lineTo(this.gridCanvas.width, y);
            this.gridCtx.stroke();
        }
    }


    /** 🚀 [OPEN] 캔버스 기동 */
    open(callback) {
        const layer = document.getElementById('canvas-layer');
        layer.classList.add('active');
        this.resize();
        
        document.getElementById('canvas-done-btn').onclick = () => {
            const dataUrl = this.canvas.toDataURL('image/png');
            const svgData = `<svg xmlns="http://www.w3.org/2000/svg">${this.paths.map(p => `<path d="${p}" fill="none" stroke="black" />`).join('')}</svg>`;
            
            callback({ dataUrl, svgData });
            this.close();
        };
    }

    close() {
        document.getElementById('canvas-layer').classList.remove('active');
    }
}

export const KuzmoCanvas = new KuzmoCanvasEngine();
export default KuzmoCanvas;
