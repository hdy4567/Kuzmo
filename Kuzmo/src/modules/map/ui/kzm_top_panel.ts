import { $store } from '../../store/kzm_store';
import { $map } from '../kzm_map_engine';
import { $ui } from '../../ui/kzm_ui_orchestrator';

/**
 * 🛰️ KzmTopPanel (v1.2 - Stellar Integrated)
 * =========================================
 * Encapsulated 3-Tier Filter UI.
 * Handles Identity, Core Categories, and Dynamic Constellation Tags.
 */
export class KzmTopPanel {
  private container: HTMLElement | null = null;
  private currentCat: string = 'ALL';
  private scrollX: number = 0;

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.className = 'top-panel-container';
    parent.appendChild(this.container);
    this.render();
    this.setupListeners();
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <!-- Tier 1: Identity & Search -->
      <div class="tier-1 glass">
        <div class="k-logo neon-pulse">K</div>
        <div class="search-input-wrap">
          <input type="text" id="kzm-search" class="search-input" placeholder="Search memories, locations, or dates...">
          <span class="search-icon">🔍</span>
        </div>
        <div class="record-badge" id="record-count">0</div>
      </div>

      <!-- Tier 2: Core Categories -->
      <div class="tier-2 glass-vibrant" id="cat-tabs">
        <div class="cat-tab active" data-cat="ALL">GLOBAL</div>
        <div class="cat-tab" data-cat="KR">KOREA</div>
        <div class="cat-tab" data-cat="JP">JAPAN</div>
        <div class="cat-tab" data-cat="MEMO">PIN</div>
      </div>

      <!-- Tier 3: Dynamic Tags -->
      <div class="tier-3 no-scrollbar" id="dynamic-tags"></div>
    `;
    this.refreshTags();
  }

  private setupListeners(): void {
    const searchInput = this.container?.querySelector('#kzm-search') as HTMLInputElement;
    const catTabs = this.container?.querySelectorAll('.cat-tab');

    if (searchInput) {
      searchInput.oninput = (e: Event) => {
        const val = (e.target as HTMLInputElement).value;
        $map.filter({ search: val, category: this.currentCat });
      };
    }

    catTabs?.forEach((el: any) => {
      el.onclick = () => {
        catTabs.forEach(t => (t as HTMLElement).classList.remove('active'));
        (el as HTMLElement).classList.add('active');
        this.currentCat = el.dataset.cat;
        $map.filter({ category: this.currentCat });
        this.refreshTags();
        // Reset effects on cat change
        if ($ui && $ui.highlightTagLinkage) $ui.highlightTagLinkage(null);
      };
    });

    const tier3 = this.container?.querySelector('#dynamic-tags');
    if (tier3) {
      tier3.addEventListener('wheel', (e: any) => {
        e.preventDefault();
        this.scrollX += e.deltaY;
        tier3.scrollLeft = this.scrollX;
      }, { passive: false });
    }

    $store.subscribe(() => {
      this.updateStats();
      this.refreshTags();
    });
  }

  private updateStats(): void {
    const badge = this.container?.querySelector('#record-count');
    if (badge) badge.textContent = `${$store.records.length}`;
  }

  private refreshTags(): void {
    const tagContainer = this.container?.querySelector('#dynamic-tags');
    if (!tagContainer) return;

    tagContainer.innerHTML = '';
    const tags = $store.allTags;

    tags.forEach((t: string) => {
      const chip = document.createElement('div');
      chip.className = 'tag-chip';
      chip.innerText = t.startsWith('@') || t.startsWith('#') ? t : `#${t}`;
      chip.onclick = () => {
        chip.classList.toggle('active');
        
        const activeChips = Array.from(tagContainer.querySelectorAll('.tag-chip.active'));
        const activeFullTags = activeChips.map((el: any) => el.textContent || '');
        const activeRawTags = activeFullTags.map(tag => tag.replace('#', '').replace('@', ''));
        
        // 🧩 Map Filtering (Filter by the most recently clicked/active tag)
        $map.filter({ 
           tag: activeRawTags.length > 0 ? activeRawTags[activeRawTags.length - 1] : undefined 
        });

        // 🌌 [STELLAR-EDGE] Trigger Constellation
        if ($ui && $ui.highlightTagLinkage) {
          $ui.highlightTagLinkage(activeFullTags.length > 0 ? activeFullTags[activeFullTags.length - 1] : null);
        }
      };
      tagContainer.appendChild(chip);
    });
  }
}
