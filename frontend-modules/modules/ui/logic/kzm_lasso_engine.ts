import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';

/**
 * 🎠 KzmLassoEngine (v1.0 - Unified Selection Logic)
 * ========================================================
 * Role: Principal engine for box-selection across all UI modules (Map, Archive, Grid).
 * Pattern: High-Performance Singleton with Event Delegation.
 * Principles: Zero Logic Duplication, Kinetic UI Parity.
 */
export class KzmLassoEngine {
    private static instance: KzmLassoEngine;
    private lassoBox: HTMLElement | null = null;
    private container: HTMLElement | null = null;
    public isActive = false;
    private startPos = { x: 0, y: 0 };
    private currentCallback: ((rect: DOMRect) => void) | null = null;

    private constructor() {
        this.initializeSovereignty();
    }

    public static getInstance(): KzmLassoEngine {
        if (!this.instance) this.instance = new KzmLassoEngine();
        return this.instance;
    }

    private initializeSovereignty(): void {
        $log.log('INFO', 'LASSO_ENGINE', 'Unified Lasso Engine Online.');
    }

    /**
     * 🛰️ [ATTACH] Bind Lasso logic to a specific container
     */
    public attach(container: HTMLElement, callback: (rect: DOMRect) => void, triggerKey: string = 'Alt'): void {
        this.container = container;
        this.currentCallback = callback;

        container.addEventListener('mousedown', (e) => this.handleMouseDown(e, triggerKey));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
    }

    private handleMouseDown(e: MouseEvent, triggerKey: string): void {
        const isTriggered = 
            (triggerKey === 'Alt' && e.altKey) || 
            (triggerKey === 'Ctrl' && (e.ctrlKey || e.metaKey)) ||
            (triggerKey === 'NONE');

        if (!isTriggered) return;

        this.isActive = true;
        this.startPos = { x: e.clientX, y: e.clientY };

        if (!this.lassoBox) {
            this.lassoBox = document.createElement('div');
            this.lassoBox.className = 'selection-lasso-box';
            document.body.appendChild(this.lassoBox);
        }

        // Prevent container-specific default behaviors (e.g., drag)
        e.preventDefault();
        $broker.emit('LASSO_START', null);
    }

    private handleMouseMove(e: MouseEvent): void {
        if (!this.isActive || !this.lassoBox) return;

        const left = Math.min(this.startPos.x, e.clientX);
        const top = Math.min(this.startPos.y, e.clientY);
        const width = Math.abs(e.clientX - this.startPos.x);
        const height = Math.abs(e.clientY - this.startPos.y);

        this.lassoBox.style.left = `${left}px`;
        this.lassoBox.style.top = `${top}px`;
        this.lassoBox.style.width = `${width}px`;
        this.lassoBox.style.height = `${height}px`;

        if (this.currentCallback) {
            this.currentCallback(this.lassoBox.getBoundingClientRect());
        }
    }

    private handleMouseUp(): void {
        if (!this.isActive) return;
        this.isActive = false;
        
        if (this.lassoBox) {
            this.lassoBox.remove();
            this.lassoBox = null;
        }

        $broker.emit('LASSO_END', null);
        $broker.emit('LASSO_SELECTION_COMPLETE', null);
    }

    /**
     * 🧩 [UTILITY] Static Intersection Checker
     */
    public static isIntersecting(rectA: DOMRect, rectB: DOMRect): boolean {
        return !(
            rectB.left > rectA.right || 
            rectB.right < rectA.left || 
            rectB.top > rectA.bottom || 
            rectB.bottom < rectA.top
        );
    }
}

export const $lasso = KzmLassoEngine.getInstance();
