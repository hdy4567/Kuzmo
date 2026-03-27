import { $store } from '../../store/kzm_store';
import { Kzm } from '../../domain/kzm_entities';

/**
 * 📝 KzmDetailSheet (v3.1 - Premium SNS View)
 * ===========================================
 * Split-layout Modal with Visual on Left, Editor on Right.
 * Includes AI Audio Waveform Visualization.
 */
export class KzmDetailSheet {
  private overlay: HTMLElement | null = null;
  private currentRecord: Kzm.Record | null = null;
  private waveAnim: number | null = null;
  get isOpen(): boolean { return this.overlay?.classList.contains('active') || false; }

  public mount(parent: HTMLElement): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'detail-overlay';
    parent.appendChild(this.overlay);

    window.addEventListener('kzm-view-detail', (e: any) => {
      const id = e.detail.id;
      const record = $store.records.find(r => r.id === id);
      if (record) this.open(record);
    });

    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) this.close();
    };
  }

  public open(record: Kzm.Record): void {
    this.currentRecord = record;
    this.render();
    const modal = this.overlay!.querySelector('.detail-modal') as HTMLElement;
    if (modal) modal.style.transform = `translate(-50%, 0)`; 
    this.overlay!.classList.add('active');
    this.startWaveform();
  }

  public close(): void {
    this.overlay!.classList.remove('active');
    this.currentRecord = null;
    if (this.waveAnim) cancelAnimationFrame(this.waveAnim);
  }

  private render(): void {
    if (!this.overlay || !this.currentRecord) return;
    const r = this.currentRecord;

    const bgUrl = r.category === 'MEMO'
      ? 'linear-gradient(135deg, #a8c0ff, #3f2b96)'
      : 'linear-gradient(135deg, #8e2de2, #4a00e0)';

    this.overlay.innerHTML = `
      <div class="detail-modal glass-lux no-scrollbar">
        <div class="sheet-handle"><div class="handle-bar"></div></div>
        
        <div class="detail-visual" style="background-image: ${bgUrl};">
            <div class="visual-badge">${r.category}</div>
            <div class="hero-overlay">
                <div class="hero-title">STORY OF ${r.region}</div>
            </div>
        </div>
        
        <div class="detail-content">
            <div class="detail-header">
                <input type="text" id="detail-title-input" class="kzm-title-input" value="${r.title}">
                <div class="meta-row">
                    <span>🗓️ ${new Date(r.createdAt).toLocaleString()}</span>
                    <span>📍 ${r.region}</span>
                </div>
            </div>

            <div class="sns-action-bar">
                <div class="sns-audio-visualizer">
                    <canvas id="waveform-canvas" width="120" height="32"></canvas>
                    <button class="kzm-btn-circle small pulse-logic">🎙️</button>
                </div>
                <div class="action-btn-group">
                   <button class="kzm-btn small">🪄 AI</button>
                   <button class="kzm-btn small">🧪 LINKS</button>
                </div>
            </div>

            <textarea id="detail-editor" class="kzm-editor-area" placeholder="Deep dive into this memory...">${r.content}</textarea>

            <div class="tag-system">
                <label>🏷️ SEMANTIC ENTITIES</label>
                <div class="tag-row" id="detail-tags">
                    ${r.tags.map(t => `<span class="sns-tag">${t}</span>`).join('')}
                    <div class="tag-add">+</div>
                </div>
            </div>

            <div class="detail-footer">
                <button id="detail-save-btn" class="kzm-btn large neon-pulse">UPDATE RECORD</button>
                <button id="detail-close-btn" class="kzm-btn-secondary large">CLOSE</button>
            </div>
        </div>
      </div>
    `;

    document.getElementById('detail-close-btn')!.onclick = () => this.close();

    this.setupEvents();
  }

  /**
   * 🌊 [WAVEFORM-LOGIC] AI Waveform Visualization
   * Simulates real-time semantic audio healing.
   */
  private startWaveform(): void {
    const canvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00e5ff';
      for (let i = 0; i < 20; i++) {
        const h = 5 + Math.random() * 20;
        ctx.fillRect(i * 6, (32 - h) / 2, 4, h);
      }
      this.waveAnim = requestAnimationFrame(draw);
    };
    draw();
  }

  private startY: number = 0;
  private currentY: number = 0;
  private isDragging: boolean = false;

  private setupDragging(): void {
    const modal = this.overlay!.querySelector('.detail-modal') as HTMLElement;
    const handle = modal.querySelector('.sheet-handle') as HTMLElement;

    if (!modal || !handle) return;

    const onStart = (y: number) => {
      this.startY = y;
      this.isDragging = true;
      modal.style.transition = 'none';
    };

    const onMove = (y: number) => {
      if (!this.isDragging) return;
      this.currentY = y;
      const deltaY = Math.max(0, this.currentY - this.startY);
      modal.style.transform = `translate(-50%, ${deltaY}px)`;
    };

    const onEnd = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      modal.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      
      const deltaY = this.currentY - this.startY;
      // 🚀 [SPEED-DISMISS] Check distance or speed
      if (deltaY > 150) {
        this.close();
      } else {
        modal.style.transform = `translate(-50%, 0)`;
      }
    };

    handle.onmousedown = (e) => onStart(e.clientY);
    window.onmousemove = (e) => onMove(e.clientY);
    window.onmouseup = () => onEnd();

    handle.ontouchstart = (e) => onStart(e.touches[0].clientY);
    window.ontouchmove = (e) => onMove(e.touches[0].clientY);
    window.ontouchend = () => onEnd();

    // ESC Key Global
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  private setupEvents(): void {
    const saveBtn = document.getElementById('detail-save-btn');
    const titleIn = document.getElementById('detail-title-input') as HTMLInputElement;
    const editorIn = document.getElementById('detail-editor') as HTMLTextAreaElement;

    this.setupDragging();

    if (saveBtn) saveBtn.onclick = () => {
      if (!this.currentRecord) return;
      $store.updateRecord(this.currentRecord.id, {
        title: titleIn.value,
        content: editorIn.value
      });
      this.close();
    };
  }
}

