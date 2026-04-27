import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $store } from '@modules/kernel/persistence/kzm_kernel_store';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';
import { KzmMemoCanvas } from '@modules/memo/ui/kzm_memo_canvas';

/**
 * 🛰️ KzmDetailSheet (v11.0 - Refactored Master)
 * ========================================================
 * Role: Full-screen modal for memory packet inspection and vector drawing.
 * Physics: Kinetic Swipe-to-Dismiss (Module-Level Singleton).
 */
export class KzmDetailSheet implements KzmModule {
  public id = 'kuzmo-detail-sheet';
  public isSyncMode = true;
  public isVisible = false;
  private container: HTMLElement | null = null;
  private startY = 0;
  private currentY = 0;
  private currentRecord: any = null;
  private canvasDrawer = new KzmMemoCanvas();
  private isDragging = false;

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = this.id;
    this.container.className = 'detail-sheet-overlay archive-hidden';
    $broker.registerSync(this.id as any, 'MODAL', this.container);
    parent.appendChild(this.container);
    this.bindGlobalEvents();
  }

  public show(): void {
    this.isVisible = true;
    this.container?.classList.replace('archive-hidden', 'visible');
  }

  public hide(): void {
    this.isVisible = false;
    this.container?.classList.replace('visible', 'archive-hidden');
    if (this.container) this.container.style.transform = '';
    this.startY = 0;
    this.currentY = 0;
    this.isDragging = false;
  }

  public open(record: any): void {
    if (!this.container) return;
    this.currentRecord = record;
    
    // 🎨 Convert existing SVG data or empty
    const savedDrawing = record.metadata?.canvasData ? 
        `<div class="saved-drawing-box" style="margin-bottom:10px; border:1px solid rgba(255,255,255,0.1); border-radius:8px;">${record.metadata.canvasData}</div>` : '';

    this.container.innerHTML = `
      <div class="sheet-scroller" id="sheet-scroller">
        <div class="hero-overlay-box">
             <div class="swipe-handle"></div>
             <img src="https://picsum.photos/seed/${record.id}/1200/800" class="hero-img" />
             <div class="hero-gradient"></div>
             <div class="hero-meta">
                <h1 class="hero-title">${record.title}</h1>
                <div class="hero-tags">${(record.tags || []).map((t: string) => `<span class="tag-chip">${t}</span>`).join('')}</div>
             </div>
        </div>
        <div class="sheet-content-base">
            <div class="content-date">📍 ${record.location || 'Unknown'} | ${new Date(record.createdAt || Date.now()).toLocaleString()}</div>
            ${savedDrawing}
            <div id="drawer-mount-point"></div>
            <div class="content-body">${record.content || 'Memorial transcript missing.'}</div>
            <div class="sheet-actions" style="display:flex; gap:10px; margin-top:20px;">
                <button class="kzm-btn mini" id="btn-open-drawer" style="border-color:var(--kzm-primary);">✏️ DRAW</button>
                <button class="kzm-btn close-sheet">DISMISS MEMORY</button>
            </div>
        </div>
      </div>
    `;
    this.show();
    this.bindStaticUIEvents();
  }

  /**
   * 🛒 [DYNAMIC-UI] Events tied to the innerHTML structure
   */
  private bindStaticUIEvents(): void {
    this.container?.querySelector('.close-sheet')?.addEventListener('click', () => this.hide());
    
    this.container?.querySelector('#btn-open-drawer')?.addEventListener('click', (e) => {
        const mount = this.container?.querySelector('#drawer-mount-point');
        if (mount) {
            mount.innerHTML = '';
            mount.appendChild(this.canvasDrawer.buildUI());
            (e.target as HTMLElement).style.display = 'none';
        }
    });

    const scroller = this.container?.querySelector('#sheet-scroller') as HTMLElement;
    if (scroller) {
        scroller.addEventListener('mousedown', (e) => {
            if ((e.target as HTMLElement).closest('.kzm-canvas-drawer')) return;
            this.isDragging = true;
            this.startY = e.clientY;
        });
    }
  }

  /**
   * 🛰️ [GLOBAL-NEXUS] Bind once per lifecycle
   */
  private bindGlobalEvents(): void {
    $broker.on('PACKET_FOCUSED', (record: any) => {
        if (record) this.open(record);
    });

    $broker.on('UI_GLOBAL_DISMISS', () => this.hide());

    window.addEventListener('mousemove', (e) => {
        if (!this.isVisible || !this.isDragging) return;
        this.currentY = e.clientY - this.startY;
        if (this.currentY > 0 && this.container) {
            this.container.style.transform = `translate3d(0, ${this.currentY}px, 0)`;
        }
    });

    window.addEventListener('mouseup', () => {
        if (!this.isDragging) return;
        if (this.currentY > 150) {
            this.hide();
        } else if (this.container) {
            this.container.style.transform = '';
        }
        this.currentY = 0;
        this.isDragging = false;
    });

    $broker.on('UI_CANVAS_SAVE_REQUEST', (data: any) => {
        if (!this.currentRecord || !this.isVisible) return;
        const meta = this.currentRecord.metadata || {};
        meta.canvasData = data.svgData;
        $store.updateRecord(this.currentRecord.id, { metadata: meta });
        $broker.emit('UI_TOAST', { message: 'Masterpiece archived via Vector Storage.' });
        this.open({ ...this.currentRecord, metadata: meta });
    });
  }
}
