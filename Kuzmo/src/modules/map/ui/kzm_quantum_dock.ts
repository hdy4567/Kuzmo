import { $map } from '../kzm_map_engine';


/**
 * 🍏 KzmQuantumDock (v2.0 - Mac Style)
 * =====================================
 * Right-centered floating hover dock with Mac magnification logic.
 * Features Layer Checkboxes and Shortcut Grid.
 */
export class KzmQuantumDock {
  private container: HTMLElement | null = null;
  private isTouristVisible: boolean = true;
  private isMemoryVisible: boolean = true;

  // Utilities (Layers handled via checkboxes, these are extra tools)
  private shortcuts: { id: number, label: string, link: string }[] = [
    { id: 1, label: 'KZM', link: 'https://kuzmo.io' },
    { id: 3, label: 'ADD', link: '+' },
  ];

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'kzm-quantum-dock';
    this.container.className = 'quantum-dock-wrapper';
    parent.appendChild(this.container);
    this.render();
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="dock-trigger-area"></div>
      <div class="dock-content glass-lux">
        <!-- 🏛️ Layer Checklist -->
        <div class="dock-section">
            <div class="section-title">LAYERS</div>
            <label class="check-item ${this.isTouristVisible ? 'active' : ''}">
                <input type="checkbox" id="chk-tourist" ${this.isTouristVisible ? 'checked' : ''}>
                <span class="check-box"></span>
                🏛️ Tourist
            </label>
            <label class="check-item ${this.isMemoryVisible ? 'active' : ''}">
                <input type="checkbox" id="chk-memory" ${this.isMemoryVisible ? 'checked' : ''}>
                <span class="check-box"></span>
                📌 Memory
            </label>
        </div>

        <div class="dock-divider"></div>

        <!-- 🧩 Grid Shortcuts (Mac Magnification Style) -->
        <div class="dock-grid">
            ${this.shortcuts.map(s => `
                <div class="grid-square" data-id="${s.id}" title="${s.label}">
                    <span class="square-label">${s.label}</span>
                </div>
            `).join('')}
            <div class="grid-square add-square" title="Add Shortcut">+</div>
        </div>
      </div>
    `;
    this.setupEvents();
  }

  private setupEvents(): void {
    const chkTourist = document.getElementById('chk-tourist') as HTMLInputElement;
    const chkMemory = document.getElementById('chk-memory') as HTMLInputElement;

    if (chkTourist) chkTourist.onchange = () => {
      this.isTouristVisible = chkTourist.checked;
      this.updateMapVisibility();
      this.render();
    };

    if (chkMemory) chkMemory.onchange = () => {
      this.isMemoryVisible = chkMemory.checked;
      this.updateMapVisibility();
      this.render();
    };

    // Shortcut Grid Events
    this.container?.querySelectorAll('.grid-square').forEach(sq => {
      (sq as HTMLElement).onclick = () => {
        if (sq.classList.contains('add-square')) {
           const link = prompt("Enter Shortcut Link (URL or .exe path):");
           if (link) {
              this.shortcuts.push({ id: Date.now(), label: 'NEW', link });
              this.render();
           }
        } else {
           const id = (sq as HTMLElement).dataset.id;
           const s = this.shortcuts.find(item => item.id.toString() === id);
           if (s && s.link !== '#') window.open(s.link, '_blank');
        }
      };
    });
  }

  private updateMapVisibility(): void {
    $map.filterVisibility({
      showTourist: this.isTouristVisible,
      showMemory: this.isMemoryVisible
    });
    console.log(`🗺️ Map Layers Updated: Tourist=${this.isTouristVisible}, Memory=${this.isMemoryVisible}`);
  }
}
