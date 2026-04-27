import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';
import { $packetKuzmo } from '@modules/memo/db/kzm_packet_kuzmo';
import { Kzm } from '@modules/memo/core/kzm_memo_entities';
import { $map } from '@modules/map/kzm_map_engine';
import { KzmVector } from '@modules/memo/core/kzm_drawing_entities';

/**
 * 🛰️ KzmMemoryCreator (v12.9 - Repaired Additive Sovereignty)
 * ========================================================
 * Role: Sovereign packet creation engine with vibrant UI.
 * Status: Repaired syntax errors in handleSave to ensure correct data persistence.
 */
export class KzmMemoryCreator implements KzmModule {
  public id = 'memory-creator-v1';
  public isSyncMode = true;
  public isVisible = false;

  private container: HTMLElement | null = null;
  private currentCoords: { lat: number; lng: number } = { lat: 37.5665, lng: 126.9780 };
  private canvasData: string | null = null;
  private currentCategory: Kzm.Category = 'MEMO';

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = this.id;
    this.container.className = 'memory-creator-v1 hidden';

    $broker.registerSync(this.id as any, 'HI_MODAL', this.container);
    parent.appendChild(this.container);
    this.render();
    this.bindEvents();
  }

  public show(coords?: { lat: number; lng: number }, category: Kzm.Category = 'MEMO', canvasData: string | null = null): void {
    if (!this.container) return;
    if (coords) this.currentCoords = coords;
    this.currentCategory = category;
    this.canvasData = canvasData;
    
    this.isVisible = true;
    this.render();
    this.container.classList.remove('hidden');
    
    setTimeout(() => {
      this.container?.querySelector('input')?.focus();
    }, 100);
  }

  public hide(): void {
    this.isVisible = false;
    this.container?.classList.add('hidden');
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="creator-header">
          <div class="header-main">
            <span class="category-indicator">${this.currentCategory}</span>
            <div class="coord-badge" id="kzm-memo-coords">
              📍 ${this.currentCoords.lat.toFixed(5)}, ${this.currentCoords.lng.toFixed(5)}
            </div>
          </div>
          <button class="btn-banana-cancel" id="kzm-memo-close">CLOSE</button>
      </div>
      <input type="text" class="creator-title-input" id="kzm-memo-title" placeholder="Give it a name..." value="${this.currentCategory === 'DRAWING' ? 'New Sketch' : ''}" />
      ${this.currentCategory === 'DRAWING' ? `
        <div class="drawing-preview-box" style="height:120px; background:rgba(255,255,255,0.03); border-radius:12px; margin:12px 0; overflow:hidden; border:1px solid rgba(255,255,255,0.05);">
            <svg width="100%" height="100%" viewBox="0 0 400 300" style="opacity:0.6;">${this.canvasData || ''}</svg>
        </div>
      ` : `
        <textarea class="creator-body-input" id="kzm-memo-content" placeholder="Share the core of this memory..."></textarea>
      `}
      <div class="creator-actions">
          <button class="btn-banana-main" id="kzm-memo-save">CREATE PACKET</button>
      </div>
    `;
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'kzm-memo-close') this.hide();
      if (target.id === 'kzm-memo-save') await this.handleSave();
    });

    $broker.on('UI_MAP_START_MEMORY', (data: any) => this.show(data.latlng));
    $broker.on('UI_CANVAS_SAVE_REQUEST', (data: any) => {
      this.show($map.getCenter(), 'DRAWING', data.svgData);
    });
    $broker.on('UI_GLOBAL_DISMISS', () => this.hide());
  }

  private async handleSave(): Promise<void> {
    const titleEl = this.container?.querySelector('#kzm-memo-title') as HTMLInputElement;
    const contentEl = this.container?.querySelector('#kzm-memo-content') as HTMLTextAreaElement;

    if (!titleEl) return;

    try {
      // 🚀 [SOVEREIGN-CONTENT-ARCHIVE]
      // content 필드에 category가 DRAWING이면 canvasData(SVG)를, 아니면 일반 텍스트를 담아 저장합니다.
      const finalContent = this.currentCategory === 'DRAWING' ? (this.canvasData || '') : contentEl?.value || '';

      await $packetKuzmo.savePacket({
        title: titleEl.value,
        content: finalContent,
        geoCoord: { geoLat: this.currentCoords.lat, geoLng: this.currentCoords.lng },
        category: this.currentCategory,
        tags: this.currentCategory === 'DRAWING' ? ['@Sketch', '@Art'] : ['@Manual', '@Memory']
      });
      this.hide();
    } catch (e) {
      $log.log('ERROR', 'CREATOR', 'Failed to persist packet.');
    }
  }
}
