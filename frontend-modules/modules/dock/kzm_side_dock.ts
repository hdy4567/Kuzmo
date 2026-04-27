import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';

/**
 * 🛰️ KzmSideDock (v4.8 - Sovereign Elastic Launcher)
 * ========================================================
 * Role: System application dock with Non-linear Spring Physics.
 * Logic: Achieves the "Chewy" (쫀득함) feel via power-law damping and snap-back.
 */
export class KzmSideDock implements KzmModule {
  private static readonly STORAGE_KEY = 'KZM_DOCK_SOVEREIGN_CONFIG';
  public id = 'kzm-side-dock';
  public isSyncMode = true;
  public isVisible = false;

  private container: HTMLElement | null = null;
  private apps: any[] = [
    {
      id: '1',
      label: 'Google',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0 -6 0"></path></svg>`,
      path: 'https://google.com',
      type: 'URL'
    },
    {
      id: '2',
      label: 'Youtube',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><path d="M10 9l5 3-5 3z"></path></svg>`,
      path: 'https://youtube.com',
      type: 'URL'
    },
    {
      id: '4',
      label: 'System',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><path d="M9 22V12h6v10M2 12h20"></path></svg>`,
      path: 'C:/Windows/System32/calc.exe',
      type: 'EXE'
    }
  ];

  // 🧪 [ENGINE-POLISH] Elastic Physics State
  private scrollY: number = 0;
  private isDragging: number = 0;
  private startY: number = 0;
  private velocity: number = 0;
  private railHeight: number = 0;
  private portHeight: number = 0;

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = this.id;
    this.container.className = 'fast-render hidden';

    $broker.registerSync('kzm-side-dock', 'DOCK', this.container, '@modules/dock/kzm_dock.css');
    parent.appendChild(this.container);

    // 🚀 [RESTORE] Load saved apps (if any) before rendering
    this.restoreConfig();

    this.render();
    this.bindEvents();
    this.cacheDimensions();
  }

  private cacheDimensions(): void {
    const port = this.container?.querySelector('#dock-view-port') as HTMLElement;
    const rail = this.container?.querySelector('#dock-rail') as HTMLElement;
    if (port && rail) {
      this.portHeight = port.offsetHeight || 480;
      this.railHeight = rail.offsetHeight || 300;
    }
  }

  public show(): void {
    if (!this.container) return;
    this.isVisible = true;
    this.container.classList.remove('hidden');
    this.container.classList.add('visible');
    this.cacheDimensions();
  }

  public hide(): void {
    if (!this.container) return;
    this.isVisible = false;
    this.container.classList.remove('visible');
    this.container.classList.add('hidden');
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="dock-bar">
          <div class="dock-handle-peek"></div>
          <div class="dock-header">SYSTEM</div>
          
          <div class="dock-view-port" id="dock-view-port">
              <div class="dock-rail" id="dock-rail">
                  ${this.apps.map(app => `
                      <div class="dock-item" data-id="${app.id}" title="${app.label}">
                          <span class="dock-icon">${app.icon}</span>
                      </div>
                  `).join('')}
                  <div class="dock-item add" id="dock-add-btn">+</div>
              </div>
          </div>

          <div class="dock-divider"></div>

          <div class="dock-controls">
              <label class="dock-checkbox" title="Toggle Tourism">
                  <input type="checkbox" id="check-tour" checked>
                  <span class="cb-icon">🏝️</span>
              </label>
              <label class="dock-checkbox" title="Toggle Memories">
                  <input type="checkbox" id="check-memo" checked>
                  <span class="cb-icon">🧠</span>
              </label>
              <label class="dock-checkbox" title="Toggle Constellations">
                  <input type="checkbox" id="check-const">
                  <span class="cb-icon">✨</span>
              </label>
          </div>

          <div class="dock-glow-zone"></div>
      </div>
    `;
    requestAnimationFrame(() => this.cacheDimensions());
  }

  private updateRail(): void {
    const rail = this.container?.querySelector('#dock-rail') as HTMLElement;
    if (rail) {
      rail.style.transform = `translate3d(0, ${this.scrollY}px, 0)`;
    }
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.dock-view-port')) {
        this.isDragging = 1;
        this.startY = e.pageY - this.scrollY;
        this.velocity = 0;
        this.cacheDimensions();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging === 0) return;
      this.isDragging = 2;
      const targetY = e.pageY - this.startY;

      // 🚀 [SPRING-DAMPING-FORMULA] 쫀득한 저항감 구현
      const limit = Math.min(0, this.portHeight - this.railHeight);
      let finalY = targetY;

      if (targetY > 0) {
        // Elastic Pull (Square root resistance)
        finalY = Math.pow(targetY, 0.7) * 2.5;
      } else if (targetY < limit) {
        const over = targetY - limit;
        finalY = limit - (Math.pow(Math.abs(over), 0.7) * 2.5);
      }

      this.velocity = (finalY - this.scrollY) * 0.5; // Smooth Velocity Capture
      this.scrollY = finalY;
      this.updateRail();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging === 2) {
        this.applyInertia();
      }
      this.isDragging = 0;
    });

    this.container.addEventListener('click', (e) => {
      if (this.isDragging === 2) return;
      const item = (e.target as HTMLElement).closest('.dock-item');
      if (!item) return;

      if (item.id === 'dock-add-btn') {
        this.addAppPrompt();
        return;
      }

      const id = item.getAttribute('data-id');
      const app = this.apps.find(a => a.id === id);
      if (app) {
        $broker.emit('DOCK_APP_LAUNCH', app);
        if (app.type === 'URL') window.open(app.path, '_blank');
      }
    });

    this.container.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.id === 'check-tour') $broker.emit('MAP_LAYER_TOGGLE', { type: 'TOUR', visible: target.checked });
      if (target.id === 'check-memo') $broker.emit('MAP_LAYER_TOGGLE', { type: 'MEMO', visible: target.checked });
      if (target.id === 'check-const') $broker.emit('MAP_LAYER_TOGGLE', { type: 'CONSTELLATION', visible: target.checked });
    });

    // 🎡 [SCROLL-INTERACTION] Premium Momentum Wheel Engine (Vertical)
    this.container.addEventListener('wheel', (e) => {
      if (this.isDragging !== 0) return;
      e.preventDefault();

      this.velocity += e.deltaY * -0.2; // Momentum Accumulation
      this.updateRail();

      if (!this.isAnimating) {
        this.isAnimating = true;
        this.applyInertia();
      }
    }, { passive: false });
  }

  private isAnimating = false;

  private applyInertia(): void {
    const limit = Math.min(0, this.portHeight - this.railHeight);

    // 🎡 [ELASTIC-SNAP] Out of bounds recovery
    if (this.scrollY > 0 || this.scrollY < limit) {
      const target = this.scrollY > 0 ? 0 : limit;
      this.scrollY += (target - this.scrollY) * 0.12; // Snap constant
      this.velocity = 0;
      this.updateRail();

      if (Math.abs(target - this.scrollY) > 0.5) {
        requestAnimationFrame(() => this.applyInertia());
      } else {
        this.isAnimating = false;
      }
      return;
    }

    if (Math.abs(this.velocity) < 0.2) {
      this.isAnimating = false;
      this.velocity = 0;
      return;
    }

    this.scrollY += this.velocity;
    this.velocity *= 0.88; // Premium drift friction

    this.updateRail();
    requestAnimationFrame(() => this.applyInertia());
  }

  private addAppPrompt(): void {
    const name = prompt('App Name:');
    const path = prompt('URL/Path:');
    if (name && path) {
      const isExe = path.endsWith('.exe') || path.startsWith('C:');
      const newApp = {
        id: Date.now().toString(),
        label: name.substring(0, 1).toUpperCase(),
        icon: isExe ? '🛸' : '🌐',
        path,
        type: isExe ? 'EXE' : 'URL'
      };

      // 🚀 [TX-ACTION] Transactional commit
      const candidateList = [...this.apps, newApp];
      if (this.commitConfig(candidateList)) {
        this.render();
      } else {
        alert('Failed to save app configuration. Storage may be full.');
      }
    }
  }

  /**
   * 🛡️ [TRANSACTION-COMMIT] 
   * Store config using JSON payload. Revert if fails.
   */
  private commitConfig(nextApps: any[]): boolean {
    const backup = [...this.apps];
    try {
      const jsonString = JSON.stringify(nextApps);
      localStorage.setItem(KzmSideDock.STORAGE_KEY, jsonString);
      this.apps = nextApps;
      return true;
    } catch (error) {
      console.error('[DOCK_TX_ERROR] Commit failed, rolling back...', error);
      this.apps = backup;
      return false;
    }
  }

  /**
   * 🛰️ [RESTORE] Restore JSON config
   */
  private restoreConfig(): void {
    try {
      const raw = localStorage.getItem(KzmSideDock.STORAGE_KEY);
      if (raw) {
        this.apps = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[DOCK_RESTORE] Failed to parse JSON config, using defaults.');
    }
  }
}
