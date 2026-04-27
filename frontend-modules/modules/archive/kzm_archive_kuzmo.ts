import { $store } from '@modules/kernel/persistence/kzm_kernel_store';
import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';
import { $clipboardEngine } from '@modules/memo/logic/kzm_clipboard_engine';
import { $packetKuzmo } from '@modules/memo/db/kzm_packet_kuzmo';
import { $archive } from './services/kzm_archive_service';
import { KzmDetailSheet } from './components/kzm_detail_sheet';
import { Kzm } from '@kzm/modules/memo/db/kzm_memo_entities';
import { $lasso } from '@modules/ui/logic/kzm_lasso_engine';


/**
 * 🛰️ KzmArchiveKuzmo (v19.0 - Branding Update)
 * ========================================================
 * Role: Principal UI for Kuzmo Memorial Packet Management.
 * Refactored from Sovereign to Kuzmo as per service naming directive.
 */
export class KzmArchiveKuzmo implements KzmModule {
    public id = 'kuzmo-archive';
    public isSyncMode = true;
    public isVisible = false;
    private container: HTMLElement | null = null;
    private state: 'HIDDEN' | 'PEEK' | 'FULL' = 'HIDDEN';

    public mount(parent: HTMLElement): void {
        this.container = document.createElement('div');
        this.container.id = this.id;
        this.container.className = 'archive-overlay archive-hidden';
        $broker.registerSync(this.id as any, 'MODAL', this.container);
        parent.appendChild(this.container);
        this.bindGlobalEvents();
    }

    public open(forceFull = false): void {
        this.state = forceFull ? 'FULL' : 'PEEK';
        this.render();
        this.applyState();
        // 🛰️ [MIDDLEWARE-SYNC] Trigger sync with current global state
        this.syncArchiveContent();
    }

    public show(): void { this.open(); }
    public hide(): void { this.state = 'HIDDEN'; this.applyState(); }

    private applyState(): void {
        if (!this.container) return;
        this.container.classList.remove('peek', 'full', 'archive-hidden');
        const stateClass = this.state === 'HIDDEN' ? 'archive-hidden' : this.state.toLowerCase();
        this.container.classList.add(stateClass);
        $broker.emit('UI_LAYER_REORDER', { id: this.id, state: this.state });
    }

    private render(): void {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="shelf-layout">
                <div class="archive-sidebar">
                    <div class="sidebar-header">KUZMO VAULT</div>
                    <div class="parity-counter" style="font-size: 9px; color: var(--kzm-text-dim); margin-bottom: 20px;">
                        ${$store.records.length} Memories discovered
                    </div>
                    <div class="folder-list">
                        <div class="folder-item ${$archive.currentFolder === 'ALL' ? 'active' : ''}" data-folder="ALL">ALL MEMORIES</div>
                        <div class="folder-item ${$archive.currentFolder === 'FAVORITES' ? 'active' : ''}" data-folder="FAVORITES">FAVORITES</div>
                        ${$store.customFolders.map(f => `
                            <div class="folder-item ${$archive.currentFolder === f ? 'active' : ''}" data-folder="${f}">📂 ${f}</div>
                        `).join('')}
                    </div>
                    <div class="sidebar-footer">
                        <button class="sync-action-btn" id="archive-folder-add-btn">+ NEW FOLDER</button>
                        <button class="sync-action-btn" id="archive-sync-btn">SYNC CLOUD</button>
                    </div>
                </div>
                <div class="archive-main">
                    <div class="archive-header-actions">
                        <div class="view-controls">
                            <button class="view-btn ${$archive.currentView === 'grid' ? 'active' : ''}" data-view="grid">GRID</button>
                            <button class="view-btn ${$archive.currentView === 'linear' ? 'active' : ''}" data-view="linear">LIST</button>
                        </div>
                        <button class="batch-purge-hidden" id="batch-purge-btn">PURGE</button>
                    </div>
                    <div class="asset-grid ${$archive.currentView === 'linear' ? 'linear-mode' : ''}" id="archive-list-root"></div>
                    <div id="archive-drag-zone" class="drag-handle-bar"></div>
                    <button class="memo-plus-btn" id="archive-memo-plus">+</button>
                </div>
            </div>
        `;
        this.bindInteractiveEvents();
        this.bindGestureEvents();
    }

    private bindInteractiveEvents(): void {
        this.container?.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                $archive.currentFolder = (e.currentTarget as HTMLElement).dataset.folder || 'ALL';
                this.render(); this.syncArchiveContent();
            });
        });

        this.container?.querySelector('#batch-purge-btn')?.addEventListener('click', () => {
            $archive.deleteSelected();
            this.syncArchiveContent();
        });

        this.container?.querySelector('#archive-sync-btn')?.addEventListener('click', () => {
            $broker.emit('UI_TOAST', { message: 'Synchronizing Kuzmo vault with Cloud Drive...' });
        });

        this.container?.querySelector('#archive-folder-add-btn')?.addEventListener('click', () => {
            const name = prompt('Enter new folder name:');
            if (name) $broker.emit('UI_FOLDER_CREATE', name);
        });

        this.container?.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const viewType = (e.currentTarget as HTMLElement).dataset.view || 'grid';
                $archive.currentView = viewType;
                this.render(); this.syncArchiveContent();
            });
        });

        this.container?.querySelector('#archive-memo-plus')?.addEventListener('click', () => {
            import('@modules/map/kzm_map_engine').then(({ $map }) => {
                $map.handleQuickCreate();
            });
        });
    }

    private bindGestureEvents(): void {
        const dragZone = this.container?.querySelector('#archive-drag-zone') as HTMLElement;
        if (!dragZone) return;

        let startY = 0, currentY = 0, isDragging = false;
        dragZone.onmousedown = (e) => {
            isDragging = true; startY = e.pageY;
            this.container!.style.transition = 'none';
        };

        window.onmousemove = (e) => {
            if (!isDragging) return;
            const delta = e.pageY - startY;
            currentY = delta;
            let drawY = delta;
            if (delta < -50) drawY = -50 + Math.pow(Math.abs(delta + 50), 0.7) * -1;
            this.container!.style.transform = `translate3d(0, ${drawY}px, 0)`;
        };

        window.onmouseup = () => {
            if (!isDragging) return;
            isDragging = false;
            this.container!.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            if (currentY > 300) this.hide();
            else if (currentY > 100) this.state = 'PEEK';
            else this.state = 'FULL';
            this.applyState();
            this.container!.style.transform = '';
        };
    }

    private bindGlobalEvents(): void {
        $broker.on('UI_ARCHIVE_OPEN', () => this.open());
        $broker.on('UI_GLOBAL_DISMISS', () => this.hide());

        // 🌊 [STREAM-NEXUS] Primary data sync from Middleware
        $broker.on('DISCOVERY_STREAM_UPDATE', (data: any) => {
            this.syncArchiveContent(data);
        });

        $broker.on('UI_MODE_CHANGE', (mode: string) => {
            if (mode === 'ARCHIVE') this.open(true);
            else this.hide();
        });
        $broker.on('PACKET_FOCUSED', (record: any) => {
            // Logic handled by Detached DetailSheet
        });

        $broker.on('UI_FOLDER_CREATE', (name: string) => {
            $store.createFolder(name);
            this.render();
        });
    }

    public syncArchiveContent(streamData?: any): void {
        const listRoot = this.container?.querySelector('#archive-list-root') as HTMLElement;
        const purgeBtn = this.container?.querySelector('#batch-purge-btn') as HTMLElement;
        if (!listRoot) return;

        // 🧬 [DATA-PARITY-LOGIC] Prioritize Middleware stream values over stale local state
        const activeTag = streamData?.activeTag ?? $archive.currentTagFilter;
        const activeCategory = streamData?.activeCategory ?? 'ALL';

        // 🪐 Fetch records with strict parity across Category & Tag
        const records = $packetKuzmo.getPacketList(
            activeCategory,
            $archive.currentFilter,
            activeTag
        );

        if (purgeBtn) {
            if ($store.selectedIds.size > 0) {
                purgeBtn.style.display = 'block';
                purgeBtn.textContent = `PURGE ${$store.selectedIds.size}`;
            } else {
                purgeBtn.style.display = 'none';
            }
        }

        if (records.length === 0) {
            listRoot.innerHTML = `
                <div class="archive-empty-state">
                    <div class="empty-icon">🕳️</div>
                    <div class="empty-text">No memories discovered in the void [${$archive.currentTagFilter || 'ALL'}].</div>
                    <button class="empty-action-btn" onclick="javascript:document.getElementById('archive-memo-plus').click()">CREATE FIRST PACKET</button>
                </div>
            `;
            return;
        }

        listRoot.innerHTML = records.map((r: any) => $archive.renderCard(r, $store.selectedIds.has(r.id))).join('');

        $archive.setupLazyLoading(listRoot);
        this.bindCardDragEvents(listRoot);

        $lasso.attach(listRoot, (rect) => {
            $archive.updateSelectionByLasso(rect, listRoot);
            this.syncArchiveContent();
        });

        listRoot.querySelectorAll('.keep-vibe').forEach(card => {
            card.addEventListener('click', (e: any) => {
                if ($lasso.isActive) return;

                if (e.target.classList.contains('region-chip')) {
                    const region = e.target.dataset.region;
                    $broker.emit('FILTER_CHANGED', { region: region, tag: region });
                    return;
                }

                const id = (e.currentTarget as HTMLElement).dataset.id;
                const record = $store.records.find((r: any) => r.id === id);
                if (record) $broker.emit('PACKET_FOCUSED', record);
            });
        });
    }

    private bindCardDragEvents(listRoot: HTMLElement): void {
        listRoot.querySelectorAll('.keep-vibe').forEach(card => {
            card.addEventListener('dragstart', (e: any) => {
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (!id) return;

                if (!$store.selectedIds.has(id)) {
                    $store.selectedIds.clear();
                    $store.selectedIds.add(id);
                    this.syncArchiveContent();
                }

                const records = Array.from($store.selectedIds)
                    .map(sid => $store.getRecordById(sid))
                    .filter(r => r !== undefined) as Kzm.Record[];

                const serialized = $clipboardEngine.serializePackets(records);

                e.dataTransfer.setData('text/plain', serialized);
                e.dataTransfer.effectAllowed = 'copyMove';

                // Optional: Notify user of copy via engine
                // $clipboardEngine.copyToClipboard(serialized, records.length); 

            });
        });
    }
}
