import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { KzmVector } from '@kzm/modules/memo/core/kzm_drawing_entities';
import { KzmVectorEngine } from '@kzm/modules/memo/logic/kzm_drawing_engine';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';

import { $log } from '@modules/kernel/logic/kzm_kernel_logger';

/**
 * 🎨 KzmMemoCanvas (v12.9 - Total Syntax Sovereignty)
 * ========================================================
 * Role: Premium vector drawing engine with post-creation manipulation.
 * Interaction: Supports Pen, Rect, Circle, Selection, and Movement.
 * Fix: Physical reconstruction to eliminate all syntax errors.
 */
export class KzmMemoCanvas implements KzmModule {
    public id = 'kzm-memo-canvas-v1';
    public isSyncMode = true;
    public isVisible = false;

    private container: HTMLElement | null = null;
    private engine: KzmVectorEngine = new KzmVectorEngine();
    private svgElement: SVGSVGElement | null = null;
    private currentTool: KzmVector.ShapeType | 'SELECT' = 'PEN';

    // Internal States
    private isDrawing = false;
    private isDragging = false;
    private currentShape: KzmVector.Shape | null = null;
    private startPos: KzmVector.Point = { x: 0, y: 0 };
    private lastPos: KzmVector.Point = { x: 0, y: 0 };

    constructor() { }

    /**
     * 🛰️ [COMPATIBILITY] Build UI for legacy components like KzmDetailSheet
     */
    public buildUI(): HTMLElement {
        this.container = document.createElement('div');
        this.container.id = this.id;
        this.container.className = 'kzm-canvas-complex-drawer';
        this.container.style.cssText = `
            width: 100%;
            height: 480px;
            background: linear-gradient(135deg, rgba(10,12,16,0.9) 0%, rgba(20,22,26,0.9) 100%);
            border-radius: 16px;
            border: 1px solid rgba(157, 80, 255, 0.2);
            position: relative;
            cursor: default;
            margin: 24px 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            backdrop-filter: blur(20px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        `;

        this.container.innerHTML = `
            <!-- 🛠️ Toolbar -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(157, 80, 255, 0.2); background:rgba(157, 80, 255, 0.05);">
                <div style="font-size:11px; font-weight:900; color:var(--kzm-primary); letter-spacing:0.1em; opacity:0.6;">VECTOR WORKSPACE v12.9</div>
                <div style="display:flex; gap:6px;">
                    <button class="kzm-btn-tool" id="tool-select" title="Select (V)">S</button>
                    <button class="kzm-btn-tool active" id="tool-pen" title="Pen (P)">P</button>
                    <button class="kzm-btn-tool" id="tool-rect" title="Rectangle (R)">R</button>
                    <button class="kzm-btn-tool" id="tool-circle" title="Circle (C)">C</button>
                    <div style="width:1px; height:16px; background:rgba(157, 80, 255, 0.1); margin:0 4px;"></div>
                    <button class="kzm-btn-tool" id="btn-svg-clear" title="Clear Canvas">CLR</button>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="kzm-btn mini primary" id="btn-svg-save">ARCHIVE DRAWING</button>
                </div>
            </div>

            <!-- 🎨 Stage -->
            <div style="flex:1; position:relative; overflow:hidden;">
                <svg width="100%" height="100%" style="touch-action:none; background-image:radial-gradient(rgba(157, 80, 255, 0.05) 1px, transparent 1px); background-size:24px 24px;" id="kzm-svg-root"></svg>
            </div>

            <!-- 🏷️ Status Bar -->
            <div id="selection-status" style="position:absolute; bottom:12px; left:16px; font-size:10px; color:rgba(255,255,255,0.3); font-weight:600; text-transform:uppercase;">
                READY: PEN TOOL ACTIVE
            </div>

            <style>
                .kzm-btn-tool {
                    background: rgba(157, 80, 255, 0.05);
                    border: 1px solid rgba(157, 80, 255, 0.1);
                    color: rgba(255, 255, 255, 0.6);
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 10px;
                    font-weight: 900;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
                }
                .kzm-btn-tool:hover { background: rgba(157, 80, 255, 0.1); border-color: var(--kzm-primary); color: #fff; }
                .kzm-btn-tool.active { background: var(--kzm-primary); border-color: var(--kzm-primary); color: #fff; box-shadow: 0 0 15px var(--kzm-primary-glow); }
                #kzm-svg-root .selected { stroke: #fff !important; stroke-width: 3 !important; filter: drop-shadow(0 0 8px var(--kzm-primary)); }
            </style>
        `;

        this.svgElement = this.container.querySelector('svg');
        this.bindEvents();
        return this.container;
    }

    public mount(parent: HTMLElement): void {
        const el = this.buildUI();
        el.style.position = 'fixed';
        el.style.top = '50%';
        el.style.left = '50%';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.zIndex = '30000';
        el.classList.add('hidden');
        parent.appendChild(el);
        $broker.registerSync(this.id as any, 'MODAL', el);
    }

    private bindEvents(): void {
        if (!this.container || !this.svgElement) return;

        const setTool = (tool: any, id: string) => {
            this.container?.querySelectorAll('.kzm-btn-tool').forEach(b => b.classList.remove('active'));
            this.container?.querySelector(`#${id}`)?.classList.add('active');
            this.currentTool = tool;
            this.updateStatus(`${tool}_ACTIVE`);
        };

        this.container.querySelector('#tool-select')?.addEventListener('click', () => setTool('SELECT', 'tool-select'));
        this.container.querySelector('#tool-pen')?.addEventListener('click', () => setTool('PEN', 'tool-pen'));
        this.container.querySelector('#tool-rect')?.addEventListener('click', () => setTool('RECT', 'tool-rect'));
        this.container.querySelector('#tool-circle')?.addEventListener('click', () => setTool('CIRCLE', 'tool-circle'));

        this.container.querySelector('#btn-svg-clear')?.addEventListener('click', () => {
            this.engine.clear();
            this.render();
        });

        this.container.querySelector('#btn-svg-save')?.addEventListener('click', () => {
            $broker.emit('UI_CANVAS_SAVE_REQUEST', { svgData: this.svgElement?.innerHTML });
        });

        // Pointer Events
        this.svgElement.addEventListener('pointerdown', (e: any) => this.handlePointerDown(e));
        this.svgElement.addEventListener('pointermove', (e: any) => this.handlePointerMove(e));
        this.svgElement.addEventListener('pointerup', () => this.handlePointerUp());
    }

    private handlePointerDown(e: any): void {
        const x = e.offsetX; const y = e.offsetY;
        this.startPos = { x, y }; this.lastPos = { x, y };

        if (this.currentTool === 'SELECT') {
            this.isDragging = !!this.engine.selectAt(x, y);
            this.render();
        } else {
            this.isDrawing = true;
            this.startNewShape(x, y);
        }
    }

    private startNewShape(x: number, y: number): void {
        const id = `kzm-${Date.now()}`;
        const style = { ...KzmVector.DEFAULT_STYLE, stroke: '#9D50FF' };
        if (this.currentTool === 'PEN') {
            this.currentShape = { id, type: 'PEN', points: [{ x, y }], d: `M ${x} ${y}`, style, isSelected: false } as KzmVector.PenPath;
        } else if (this.currentTool === 'RECT') {
            this.currentShape = { id, type: 'RECT', x, y, width: 0, height: 0, style, isSelected: false } as KzmVector.RectShape;
        } else if (this.currentTool === 'CIRCLE') {
            this.currentShape = { id, type: 'CIRCLE', cx: x, cy: y, r: 0, style, isSelected: false } as KzmVector.CircleShape;
        }
    }

    private handlePointerMove(e: any): void {
        const x = e.offsetX; const y = e.offsetY;
        if (this.isDragging) {
            this.engine.moveSelected(x - this.lastPos.x, y - this.lastPos.y);
            this.render();
        } else if (this.isDrawing && this.currentShape) {
            this.updateShape(x, y);
            this.renderWithPreview();
        }
        this.lastPos = { x, y };
    }

    private updateShape(x: number, y: number): void {
        if (!this.currentShape) return;
        if (this.currentShape.type === 'PEN') {
            (this.currentShape as any).points.push({ x, y });
            (this.currentShape as any).d += ` L ${x} ${y}`;
        } else if (this.currentShape.type === 'RECT') {
            (this.currentShape as any).width = x - this.startPos.x;
            (this.currentShape as any).height = y - this.startPos.y;
        } else if (this.currentShape.type === 'CIRCLE') {
            const dx = x - this.startPos.x; const dy = y - this.startPos.y;
            (this.currentShape as any).r = Math.sqrt(dx * dx + dy * dy);
        }
    }

    private handlePointerUp(): void {
        if (this.isDrawing && this.currentShape) this.engine.addShape(this.currentShape);
        this.isDrawing = false; this.isDragging = false; this.currentShape = null;
        this.render();
    }

    private render(): void {
        if (!this.svgElement) return;
        this.svgElement.innerHTML = '';
        this.engine.getShapes().forEach(s => this.drawShape(s));
    }

    private renderWithPreview(): void {
        this.render();
        if (this.currentShape) this.drawShape(this.currentShape, true);
    }

    private drawShape(shape: KzmVector.Shape, isPreview = false): void {
        if (!this.svgElement) return;
        let el: SVGElement;
        switch (shape.type) {
            case 'PEN': el = document.createElementNS("http://www.w3.org/2000/svg", "path"); el.setAttribute("d", shape.d); break;
            case 'RECT':
                el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                el.setAttribute("x", (shape.width > 0 ? shape.x : shape.x + shape.width).toString());
                el.setAttribute("y", (shape.height > 0 ? shape.y : shape.y + shape.height).toString());
                el.setAttribute("width", Math.abs(shape.width).toString());
                el.setAttribute("height", Math.abs(shape.height).toString());
                break;
            case 'CIRCLE': el = document.createElementNS("http://www.w3.org/2000/svg", "circle"); el.setAttribute("cx", shape.cx.toString()); el.setAttribute("cy", shape.cy.toString()); el.setAttribute("r", shape.r.toString()); break;
            default: return;
        }
        el.setAttribute("stroke", shape.style.stroke);
        el.setAttribute("stroke-width", shape.style.strokeWidth.toString());
        el.setAttribute("fill", shape.style.fill);
        el.setAttribute("stroke-linecap", "round");
        if (isPreview) el.setAttribute("opacity", "0.5");
        else if (shape.isSelected) el.classList.add('selected');
        this.svgElement.appendChild(el);
    }

    private updateStatus(text: string): void {
        const stat = this.container?.querySelector('#selection-status');
        if (stat) stat.textContent = text;
    }

    public show(): void { this.isVisible = true; this.container?.classList.remove('hidden'); }
    public hide(): void { this.isVisible = false; this.container?.classList.add('hidden'); }
}
