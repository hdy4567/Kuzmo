import { $store } from '@modules/kernel/persistence/kzm_kernel_store';
import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';
import { Kzm } from '@modules/memo/core/kzm_memo_entities';

/**
 * 🪐 KzmActionBar (v18.0 - Sovereign Action Tier)
 * ========================================================
 * Role: Unified Batch Command Shelf integrated into the Top Filter Stack.
 * Logic: Matches Tier 3 design with 0% logic loss.
 * Specs: 5 pins Selected | ( tags ) | apply | delete.
 */
export class KzmActionBar implements KzmModule {
  public id = 'kzm-action-bar-v3';
  public isSyncMode = true;
  public isVisible = false;

  private container: HTMLElement | null = null;
  private countLabel: HTMLElement | null = null;

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = this.id;
    this.container.className = 'kzm-selection-bar hidden';
    $broker.registerSync(this.id as any, 'MODAL', this.container);
    parent.appendChild(this.container);

    this.renderInitial();

    $store.subscribe((ev: string) => {
      if (ev === 'SELECTION_CHANGED') this.syncState();
    });

    $broker.on('UI_GLOBAL_DISMISS', () => this.handleCancel());
  }

  public show(): void { this.syncState(); }
  public hide(): void { this.handleCancel(); }

  private syncState(): void {
    if (!this.container) return;
    const count = $store.selectedIds.size;

    if (count > 0) {
      this.isVisible = true;
      this.container.classList.remove('hidden');
      this.container.classList.add('visible');
      this.updateCount(count);
    } else {
      this.isVisible = false;
      this.container.classList.add('hidden');
    }
  }

  private renderInitial(): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="selection-capsule-luxe">
          <div class="selection-info" id="sel-info-label">0 SELECTED</div>
          <div class="selection-divider"></div>
          <div class="selection-actions">
               <input type="text" id="kzm-batch-tag" placeholder="Tag selected..." class="selection-input" />
               <div class="selection-mini-corridor">
                   <span class="mini-pill">@Festival</span>
                   <span class="mini-pill">@Food</span>
               </div>
               <button id="sel-btn-apply" class="btn-sel-apply">APPLY</button>
               <button id="sel-btn-copy" class="btn-sel-copy">COPY</button>
               <button id="sel-btn-delete" class="btn-sel-delete">PURGE</button>
               <button id="sel-btn-cancel" class="btn-sel-cancel">✕</button>
          </div>
      </div>
    `;
    this.countLabel = this.container.querySelector('#sel-info-label');
    this.bindActionEvents();
  }

  private updateCount(count: number): void {
    if (this.countLabel) this.countLabel.textContent = `${count} SELECTED`;
  }

  private bindActionEvents(): void {
    if (!this.container) return;
    this.container.querySelector('#sel-btn-apply')?.addEventListener('click', () => {
      const input = this.container?.querySelector('#kzm-batch-tag') as HTMLInputElement;
      this.handleBatchTag(input?.value);
    });
    this.container.querySelector('#sel-btn-copy')?.addEventListener('click', () => {
      this.handleBatchCopy();
    });
    this.container.querySelector('#sel-btn-delete')?.addEventListener('click', () => {
      if (confirm(`Purge ${$store.selectedIds.size} memories and return them to the void?`)) {
        $store.deleteRecords(Array.from($store.selectedIds));
        this.handleCancel();
      }
    });
    this.container.querySelector('#sel-btn-cancel')?.addEventListener('click', () => this.handleCancel());
  }

  private handleBatchTag(tag: string): void {
    if (!tag) return;
    const cleanTag = tag.startsWith('@') ? tag : `@${tag}`;
    Array.from($store.selectedIds).forEach(id => {
      const record = $store.records.find(r => r.id === id);
      if (record && !record.tags.includes(cleanTag)) {
        $store.updateRecord(id, { tags: [...record.tags, cleanTag] });
      }
    });
    $broker.emit('UI_TOAST', { message: `Batch tagged with ${cleanTag}`, type: 'SUCCESS' });
    this.handleCancel();
  }

  private handleBatchCopy(): void {
    const selectedRecords = $store.records.filter(r => $store.selectedIds.has(r.id));
    if (selectedRecords.length === 0) return;

    import('@modules/archive/services/kzm_multimodal_service').then(({ KzmMultimodalService }) => {
      KzmMultimodalService.copyToClipboard(selectedRecords);
      $broker.emit('UI_TOAST', { message: `Packets copied [${selectedRecords.length} Files] for AI analysis.`, type: 'SUCCESS' });
      this.handleCancel();
    });
  }
  // esc 등 키보드 입력처리
  public handleCancel(): void {
    this.isVisible = false;
    this.container?.classList.add('hidden');
    $store.clearSelection();
  }
}
