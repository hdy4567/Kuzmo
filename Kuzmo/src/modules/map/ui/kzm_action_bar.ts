import { $store } from '../../store/kzm_store';

/**
 * ⚡ KzmActionBar (v1.1)
 * =======================
 * Map-Centric Batch Operation Bar.
 * Handles Selection Counts, Bulk Tagging, and Cancellation.
 */
export class KzmActionBar {
  private container: HTMLElement | null = null;

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'selection-bar';
    this.container.className = 'selection-bar glass-vibrant';
    this.container.style.display = 'none';
    parent.appendChild(this.container);
    this.render();
    this.setupListeners();
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="sel-info">
        <span class="sel-count">0 Selected</span>
      </div>
      <div class="batch-actions">
        <input type="text" id="batch-tag-input" placeholder="Tag selected... (e.g. #Family)">
        <button id="selection-apply-btn" class="kzm-btn">APPLY</button>
        <button id="selection-cancel-btn" class="kzm-btn-secondary">CANCEL</button>
      </div>
    `;
  }

  private setupListeners(): void {
    const applyBtn = this.container?.querySelector('#selection-apply-btn') as HTMLElement;
    const cancelBtn = this.container?.querySelector('#selection-cancel-btn') as HTMLElement;

    if (applyBtn) applyBtn.onclick = () => this.applyBatchTags();
    if (cancelBtn) cancelBtn.onclick = () => $store.clearSelection();

    $store.subscribe((event: string) => {
      if (event === 'SELECTION_CHANGED') this.updateSelectionBar();
    });
  }

  private updateSelectionBar(): void {
    const count = $store.selectedIds.size;
    const label = this.container?.querySelector('.sel-count');

    if (this.container) {
      if (count > 0) {
        this.container.style.display = 'flex';
        if (label) label.textContent = `${count} Items Selected`;
      } else {
        this.container.style.display = 'none';
      }
    }
  }

  private applyBatchTags(): void {
    const input = this.container?.querySelector('#batch-tag-input') as HTMLInputElement;
    const tag = input?.value.trim();
    if (!tag) return;

    const selectedIds = Array.from($store.selectedIds);
    selectedIds.forEach(id => {
      const r = $store.records.find(n => n.id === id);
      if (r) {
        const newTags = Array.from(new Set([...r.tags, tag.startsWith('#') || tag.startsWith('@') ? tag : `#${tag}`]));
        $store.updateRecord(r.id, { tags: newTags });
      }
    });

    $store.clearSelection();
    input.value = '';
    console.log(`🌀 [BATCH] Applied tag: ${tag}`);
  }
}
