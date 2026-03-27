import { KzmIndexedDB } from '../../persistence/kzm_indexeddb';
import { KzmSliderLogic } from './kzm_slider_logic';

/**
 * 💻 KzmSideDock (v1.2 - Modularized)
 * =====================================
 * Right-center vertical dock for URLs and Shortcuts.
 * Features: 3-Sector Sliding (Shortcuts, Themes, Map Controls).
 * Capacity: 50.
 */
export class KzmSideDock {
  private container: HTMLElement | null = null;
  private shortcuts: any[] = [];
  private tags: string[] = ['@핀', '@여행', '@추억', '@메모', '@맛집', '@서울', '@부산'];

  public async mount(parent: HTMLElement): Promise<void> {
    this.container = document.createElement('div');
    this.container.id = 'kzm-side-dock';
    this.container.className = 'dock-container';
    parent.appendChild(this.container);

    await this.loadShortcuts();
    this.render();
  }

  private async loadShortcuts(): Promise<void> {
    this.shortcuts = await KzmIndexedDB.getShortcuts();
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="dock-glow-zone"></div>
      <div class="dock-bar glass-lux">
          
          <!-- 1️⃣ [SECTION] Shortcuts -->
          <div class="dock-sliding-list no-scrollbar" id="dock-shortcuts-list"></div>
          <div class="dock-item dock-add" id="dock-add-btn" title="Add Shortcut">+</div>
          
          <div class="dock-divider"></div>
          
          <!-- 2️⃣ [SECTION] Themes (3rd Filter) -->
          <div class="sidebar-header small-text" style="font-size: 8px; opacity: 0.5; text-align: center; letter-spacing: 0.2em;">THEMES</div>
          <div class="dock-sliding-list no-scrollbar" id="dock-tags-list"></div>
          
          <div class="dock-divider"></div>
          
          <!-- 3️⃣ [SECTION] Map Controls -->
          <div class="dock-controls">
              <label class="dock-checkbox" title="Show Tourist Pins">
                  <input type="checkbox" id="dock-show-tourist" checked>
                  <span class="cb-icon">🏛️</span>
              </label>
              <label class="dock-checkbox" title="Show Memory Pins">
                  <input type="checkbox" id="dock-show-memory" checked>
                  <span class="cb-icon">🧠</span>
              </label>
          </div>
      </div>
    `;

    this.refreshShortcuts(); 
    this.refreshTags();
    this.setupEvents();
  }

  private refreshShortcuts(): void {
    const list = document.getElementById('dock-shortcuts-list');
    if (list) {
        KzmSliderLogic.renderList(list, this.shortcuts, { max: 50 });
    }
  }

  private refreshTags(): void {
    const list = document.getElementById('dock-tags-list');
    if (list) {
        const tagItems = this.tags.map(t => ({ id: t, title: t }));
        KzmSliderLogic.renderList(list, tagItems, { 
            max: 50,
            onRender: (el, data) => {
                el.innerHTML = `<div class="dock-icon">🏷️</div>`;
                el.classList.add('tag-dock-item');
                el.onclick = () => {
                    import('../kzm_ui_orchestrator').then(({ KzmUIOrchestrator }) => {
                        KzmUIOrchestrator.get().highlightTagLinkage(data.id);
                    });
                };
            }
        });
    }
  }

  private setupEvents(): void {
    const addBtn = document.getElementById('dock-add-btn');
    if (addBtn) {
      addBtn.onclick = async () => {
        const title = prompt('Enter Name:');
        const url = prompt('Enter URL or Path:');
        if (title && url) {
          const newLink = { 
            id: `link_${Date.now()}`, 
            title, 
            url, 
            icon: url.includes('github') ? '🐙' : '🌐' 
          };
          await KzmIndexedDB.saveShortcut(newLink);
          this.shortcuts.push(newLink);
          this.refreshShortcuts(); 
          this.setupEvents();
        }
      };
    }

    // Shortcut events (exclude tags)
    const shortcutItems = document.getElementById('dock-shortcuts-list')?.querySelectorAll('.dock-item');
    shortcutItems?.forEach(item => {
      (item as HTMLElement).onclick = () => {
        const id = (item as HTMLElement).dataset.id;
        const shortcut = this.shortcuts.find(s => s.id === id);
        if (shortcut) {
            if (shortcut.url.startsWith('http')) window.open(shortcut.url, '_blank');
            else alert(`🚀 Execute local path: ${shortcut.url}`);
        }
      };

      (item as HTMLElement).oncontextmenu = async (e) => {
        e.preventDefault();
        const id = (item as HTMLElement).dataset.id;
        if (confirm('Delete this shortcut?')) {
            await KzmIndexedDB.deleteShortcut(id!);
            this.shortcuts = this.shortcuts.filter(s => s.id !== id);
            this.refreshShortcuts();
            this.setupEvents();
        }
      };
    });

    // 🗺️ Visibility Controls
    const touristCheck = document.getElementById('dock-show-tourist') as HTMLInputElement;
    const memoryCheck = document.getElementById('dock-show-memory') as HTMLInputElement;

    const updateMap = () => {
      import('../../map/kzm_map_engine').then(({ $map }) => {
        $map.filterVisibility({ showTourist: touristCheck.checked, showMemory: memoryCheck.checked });
      });
    };

    if (touristCheck) touristCheck.onchange = updateMap;
    if (memoryCheck) memoryCheck.onchange = updateMap;
  }
}
