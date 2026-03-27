import { $store } from '../../store/kzm_store';
import './kzm_locker_styles.css';

/**
 * 🗃️ KzmLocker (v3.1 - Premium Archive)
 * =====================================
 * High-fidelity Masonry Grid with KEEP-style cards.
 * Includes Dynamic Fit-Logic for space optimization.
 */
export class KzmLocker {
  private container: HTMLElement | null = null;
  private state: 'HIDDEN' | 'PEEK' | 'FULL' = 'HIDDEN';
  private isSidebarVisible: boolean = true;
  private isSynced: boolean = true;
  private activeFolder: string = 'ALL';
  private layoutMode: 'GRID' | 'LIST' = 'GRID';
  private visibleCount: number = 50;

  get isOpen(): boolean { return this.state !== 'HIDDEN'; }

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'kuzmo-locker';
    this.container.className = 'locker-overlay hidden';
    this.state = 'HIDDEN';
    parent.appendChild(this.container);

    $store.subscribe((e: string) => {
      if (['RECORD_ADDED', 'RECORD_UPDATED', 'SELECTION_CHANGED', 'BULK_LOADED'].includes(e)) {
        this.render();
      }
    });

    this.render();
    this.setupGlobalListeners();
  }

  public toggle(): void {
    this.state = (this.state === 'HIDDEN') ? 'PEEK' : 'HIDDEN';
    this.applyState();
  }

  public open(mode: 'PEEK' | 'FULL' = 'PEEK'): void {
    this.state = mode;
    this.applyState();
  }

  public close(): void {
    this.state = 'HIDDEN';
    this.applyState();
  }

  private applyState(): void {
    if (!this.container) return;
    this.container.classList.remove('hidden', 'peek', 'full');
    this.container.classList.add(this.state.toLowerCase());
    
    // Notify Orchestrator to hide Bottom Dock if FULL
    window.dispatchEvent(new CustomEvent('kzm-locker-state', { detail: { state: this.state } }));
  }

  private render(): void {
    if (!this.container) return;

    if (!this.isSynced) {
      this.renderSyncScreen();
      return;
    }

    this.container.innerHTML = `
      <div class="sheet-handle"><div class="handle-bar"></div></div>
      <div class="locker-layout ${this.isSidebarVisible ? '' : 'collapsed'}">
        <div class="locker-sidebar">
            <div class="sidebar-header">COLLECTIONS</div>
            <div class="folder-list">
                <div class="folder-item ${this.activeFolder === 'ALL' ? 'active' : ''}" data-folder="ALL">📂 Everything</div>
                <div class="folder-item ${this.activeFolder === 'TRAVEL' ? 'active' : ''}" data-folder="TRAVEL">🗾 Map Explorations</div>
                <div class="folder-item ${this.activeFolder === 'MEMO' ? 'active' : ''}" data-folder="MEMO">📝 Quick Pins</div>
            </div>
            <div class="sidebar-footer">
               <button id="locker-sync-btn" class="sync-action-btn">🔄 CLOUD SYNC</button>
            </div>
        </div>

        <div class="locker-main">
            <div class="locker-header">
                <div class="header-left">
                    <button id="sidebar-toggle" class="sidebar-burger" title="Toggle Sidebar">☰</button>
                    <div class="locker-title-group">
                      <h1 class="path-label">MEMORY VAULT</h1>
                      <span class="path-subtitle">/ ${this.activeFolder}</span>
                    </div>
                </div>
                <div class="locker-actions">
                    <div class="layout-controls">
                        <button class="layout-toggle-btn ${this.layoutMode === 'GRID' ? 'active' : ''}" data-layout="GRID" title="Tiles (⊞)">⊞</button>
                        <button class="layout-toggle-btn ${this.layoutMode === 'LIST' ? 'active' : ''}" data-layout="LIST" title="List (☰)">☰</button>
                    </div>
                    <button id="locker-full-btn" class="kzm-btn-circle" title="Full Screen">⛶</button>
                    <button id="locker-close-btn" class="kzm-btn-circle" title="Close">✕</button>
                </div>
            </div>
            
            <div class="asset-grid no-scrollbar ${this.layoutMode === 'LIST' ? 'list-view' : ''}" id="asset-grid">
                ${this.renderAssetCards()}
            </div>
        </div>
      </div>
    `;
    this.setupEvents();
    if (this.layoutMode === 'GRID') this.updateLayout();
  }

  /**
   * 📐 [FIT-LOGIC] Dynamic Masonry Layout
   * Calculates card height and assigns grid-row spans.
   */
  private updateLayout(): void {
    const grid = document.getElementById('asset-grid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.asset-card');
    cards.forEach(card => {
      const contentHeight = (card as HTMLElement).offsetHeight;
      const span = Math.ceil(contentHeight / 10) + 1; // 10px grid unit
      (card as HTMLElement).style.gridRowEnd = `span ${span}`;
    });
  }

  private renderSyncScreen(): void {
    this.container!.innerHTML = `
      <div class="sheet-handle"><div class="handle-bar"></div></div>
      <div class="sync-init-view">
         <div class="sync-illustration">☁️</div>
         <h2 class="neon-pulse">KUZMO PREMIUM SYNC</h2>
         <p>Connect to Google Drive to restore your encrypted memories.</p>
         <div class="sync-btn-group">
            <button id="auth-sync-btn" class="kzm-btn large neon-pulse">RESTORE FROM CLOUD</button>
            <button id="cancel-sync-btn" class="kzm-btn-secondary large">GO BACK TO LOCAL</button>
         </div>
      </div>
    `;
    
    document.getElementById('auth-sync-btn')!.onclick = () => {
      this.isSynced = true;
      this.render();
      console.log("☁️ Cloud Sync Auth initiated...");
    };

    document.getElementById('cancel-sync-btn')!.onclick = () => {
      this.isSynced = true; 
      this.render();
    };
  }

  private renderAssetCards(): string {
    let records = $store.records;
    
    // 📁 Folder Filtering Logic
    if (this.activeFolder !== 'ALL') {
      if (this.activeFolder === 'MEMO') records = records.filter(r => r.category === 'MEMO');
      else records = records.filter(r => r.tags.some(t => t.toUpperCase() === this.activeFolder));
    }

    if (records.length === 0) return '<div class="empty-msg">No entries found in this collection.</div>';

    // 🚀 Infinite Scroll: Only render visibleCount
    const visibleRecords = records.slice(0, this.visibleCount);

    return visibleRecords.map(r => {
      let keepColor = 'card-default';
      if (r.tags.includes('Travel')) keepColor = 'card-blue';
      if (r.category === 'MEMO') keepColor = 'card-orange';

      const isSelected = $store.selectedIds.has(r.id);
      return `
        <div class="asset-card keep-vibe ${keepColor} ${isSelected ? 'selected' : ''}" data-id="${r.id}" draggable="true">
          <div class="card-pin">📌</div>
          <div class="card-body">
            <h3 class="card-title">${r.title || 'Untitled'}</h3>
            <p class="card-snippet">${r.snippet || r.content.substring(0, 100)}</p>
            <div class="card-tags">
                ${r.tags.map((t: string) => `<span class="mini-tag">${t}</span>`).join('')}
            </div>
          </div>
          <div class="card-footer">
            <span class="card-meta">${r.region} • ${new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  private setupEvents(): void {
    const grid = document.getElementById('asset-grid');
    if (!grid) return;

    grid.querySelectorAll('.asset-card').forEach(card => {
      (card as HTMLElement).onclick = (e) => {
        const id = (card as HTMLElement).dataset.id;
        if (!id) return;
        if (e.altKey) $store.toggleSelection(id);
        else window.dispatchEvent(new CustomEvent('kzm-view-detail', { detail: { id } }));
      };
    });

    this.container?.querySelectorAll('.folder-item').forEach(item => {
      (item as HTMLElement).onclick = () => {
        this.activeFolder = (item as HTMLElement).dataset.folder || 'ALL';
        this.render();
      };
    });

    const syncBtn = document.getElementById('locker-sync-btn');
    if (syncBtn) {
      syncBtn.onclick = () => {
         this.isSynced = false; // Toggle to sync screen
         this.renderSyncScreen();
      };
    }

    this.container?.querySelectorAll('.layout-toggle-btn').forEach(btn => {
      (btn as HTMLElement).onclick = () => {
        const mode = (btn as HTMLElement).dataset.layout as 'GRID' | 'LIST';
        this.layoutMode = mode;
        this.visibleCount = 50; // Reset scroll
        this.render();
      };
    });

    // 🚀 Infinite Scroll Event
    const gridEl = document.getElementById('asset-grid');
    if (gridEl) {
      gridEl.onscroll = () => {
        const threshold = gridEl.scrollHeight - gridEl.clientHeight - 200;
        if (gridEl.scrollTop > threshold) {
          const totalRecords = $store.records.length;
          if (this.visibleCount < totalRecords) {
            this.visibleCount += 50;
            this.render();
          }
        }
      };
    }

    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.onclick = () => {
            this.isSidebarVisible = !this.isSidebarVisible;
            this.render();
        };
    }

    const fullBtn = document.getElementById('locker-full-btn');
    const closeBtn = document.getElementById('locker-close-btn');

    if (fullBtn) fullBtn.onclick = () => {
      this.state = (this.state === 'FULL') ? 'PEEK' : 'FULL';
      this.applyState();
    };
    if (closeBtn) closeBtn.onclick = () => this.close();

    // 🚀 [SHEET-DRAG] Modern Bottom Sheet Logic
    const handle = this.container!.querySelector('.sheet-handle') as HTMLElement;
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    if (handle) {
      handle.onmousedown = (e) => {
        startY = e.clientY;
        isDragging = true;
        this.container!.style.transition = 'none'; // Snap to mouse
      };

      window.onmousemove = (e) => {
        if (!isDragging) return;
        currentY = e.clientY;
        const diff = startY - currentY;
        
        // Visual Feedback (Lift effect)
        if (diff > 50 && this.state !== 'FULL') {
            this.state = 'FULL';
            this.applyState();
            isDragging = false; // Reset after snap
        } else if (diff < -150) {
            this.close();
            isDragging = false;
        } else if (diff < -50 && this.state === 'FULL') {
            this.state = 'PEEK';
            this.applyState();
            isDragging = false;
        }
      };

      window.onmouseup = () => {
        isDragging = false;
        if (this.container) this.container.style.transition = '';
      };
    }
  }

  private setupGlobalListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'l') this.toggle();
      if (e.key === 'Escape' && this.state !== 'HIDDEN') this.close();
    });
  }
}
