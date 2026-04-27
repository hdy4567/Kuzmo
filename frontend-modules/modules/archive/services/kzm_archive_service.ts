import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $store } from '@modules/kernel/persistence/kzm_kernel_store';

/**
 * 📂 KzmArchiveService (v17.0 - The Unified Nexus Service)
 * ========================================================
 * Role: Single Source of Truth for Archive state and metadata processing.
 * Logic: Merged Lasso, Batch Delete, Lazy Loading, and Tier-based Styling.
 */
export class KzmArchiveService {
    private static instance: KzmArchiveService;
    public currentFolder: string = 'ALL';
    public currentFilter: string = 'LATEST';
    public currentTagFilter: string = '';
    public currentView: string = 'grid';
    
    private constructor() { this.initialize(); }

    public static getInstance(): KzmArchiveService {
        if (!this.instance) this.instance = new KzmArchiveService();
        return this.instance;
    }

    private initialize(): void {
        $broker.on('UI_GLOBAL_DISMISS', () => $store.clearSelection());
    }

    /**
     * 🌌 [LASSO] Multi-select logic for grid assets
     */
    public updateSelectionByLasso(lassoRect: DOMRect, gridRoot: HTMLElement): void {
        const cards = gridRoot.querySelectorAll('.keep-vibe');
        cards.forEach((card: any) => {
            const cardRect = card.getBoundingClientRect();
            const isIntersecting = !(
                cardRect.right < lassoRect.left || 
                cardRect.left > lassoRect.right || 
                cardRect.bottom < lassoRect.top || 
                cardRect.top > lassoRect.bottom
            );
            if (isIntersecting) $store.selectedIds.add(card.dataset.id);
            else $store.selectedIds.delete(card.dataset.id);
        });
        $broker.emit('ARCHIVE_SELECTION_UPDATED', Array.from($store.selectedIds));
    }

    /**
     * ⚡ Batch Action: Purge selected memories from kernel
     */
    public async deleteSelected(): Promise<void> {
        if ($store.selectedIds.size === 0) return;
        const count = $store.selectedIds.size;
        
        $store.deleteRecords(Array.from($store.selectedIds));
        
        $broker.emit('MEMO_DATA_CHANGED', { type: 'BATCH_PURGE' });
        $broker.emit('UI_TOAST', { message: `Purged ${count} memories from the void.` });
    }

    public clearSelection(): void {
        $store.clearSelection();
        $broker.emit('ARCHIVE_SELECTION_UPDATED', []);
    }

    /**
     * 🖼️ Performance: Intersection-based Lazy Loading (60FPS)
     */
    public setupLazyLoading(container: HTMLElement): void {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target.querySelector('img');
                    if (img && img.dataset.src) { 
                        img.src = img.dataset.src; 
                        img.removeAttribute('data-src'); 
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        container.querySelectorAll('.keep-vibe').forEach(card => observer.observe(card));
    }

    /**
     * 🎨 [VISUAL-TIER] Determine UX Priority
     */
    public getKeepStyleClass(record: any): string {
        if (record.importance > 8 || record.tags?.includes('FAV')) return 'card-priority';
        if (record.isPrivate) return 'card-private';
        if (record.category === 'MEDIA' || record.category === 'TRAVEL') return 'card-visual';
        return 'card-default';
    }

    /**
     * 🛰️ [RENDER-UNIFICATION] Generate card HTML using SSOT logic
     */
    public renderCard(r: any, isSelected: boolean): string {
        return `
            <div class="keep-vibe ${this.getKeepStyleClass(r)} ${isSelected ? 'selected' : ''}" 
                 data-id="${r.id}" draggable="true">
                <div class="card-media-preview">
                    <img data-src="https://picsum.photos/seed/${r.id}/400/250" class="lazy-load" />
                    <div class="media-type-badge">${r.category || 'MEMORY'}</div>
                </div>
                <div class="card-body">
                    <div class="card-title">${r.title || 'Untitled Packet'}</div>
                    <div class="card-snippet">${(r.content || '').substring(0, 80)}${r.content?.length > 80 ? '...' : ''}</div>
                    <div class="card-footer">
                        <span class="region-chip" data-region="${r.geoRegion}">📍 ${r.geoRegion || 'Unknown'}</span>
                        <span class="date-chip">${new Date(r.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

export const $archive = KzmArchiveService.getInstance();