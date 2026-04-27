import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';

/**
 * ?㎛ KzmNavigator (v4.5 - Synchronous Island Switcher)
 * ======================================================
 * Mode switcher: MAP vs ARCHIVE. 
 * Improved: Implement Mandatory KzmModule interface (v5.5).
 */
export class KzmNavigator implements KzmModule {
  public id = 'island-navigator';
  public isSyncMode = true;
  public isVisible = true; // ?? Sovereign: Static Component

  private container: HTMLElement | null = null;
  private currentMode: 'MAP' | 'ARCHIVE' = 'MAP';
  private pendingSyncCount: number = 0;
  private onModeChange: ((mode: string) => void) | null = null;

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'island-navigator';
    this.container.className = 'navigator-controls no-select'; // ?? standard class

    $broker.registerSync('island-navigator', 'NAVBAR', this.container, '@modules/view-capsual-nav/kzm_panel_navigation.css');
    parent.appendChild(this.container);
  }

  public setCallback(fn: (mode: string) => void): void {
    this.onModeChange = fn;
  }

  public show(): void {
    if (!this.container) return;
    this.isVisible = true;
    this.render();
    this.bindEvents();
    this.container.classList.add('luxe-fade-in');
  }

  public hide(): void {
    this.isVisible = false;
    this.container?.classList.add('hidden');
  }

  public render(): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <!-- === UI BLOCK: NAVIGATOR === -->
      <div class="mode-switcher luxe-glass" id="kzm-mode-trigger">
          <button class="mode-tab ${this.currentMode === 'MAP' ? 'active' : ''}" data-mode="MAP">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; vertical-align: middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            MAP
          </button>
          <button class="mode-tab ${this.currentMode === 'ARCHIVE' ? 'active' : ''}" data-mode="ARCHIVE">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; vertical-align: middle;"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>
            ARCHIVE
          </button>
          <div class="active-indicator"></div>
          ${this.pendingSyncCount > 0 ? `<div class="sync-badge animate-pulse">${this.pendingSyncCount}</div>` : ''}
      </div>
    `;
  }

  public switchMode(mode: 'MAP' | 'ARCHIVE'): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.render();
    if (this.onModeChange) this.onModeChange(mode);
    $broker.emit('UI_MODE_CHANGE', mode);
  }

  private bindEvents(): void {
    if (!this.container) return;

    // ?? [EVENT-DELEGATION] Better performance
    this.container.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('.mode-tab') as HTMLElement;
        if (target) {
            const mode = target.dataset.mode as any;
            this.switchMode(mode);
        }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.switchMode(this.currentMode === 'MAP' ? 'ARCHIVE' : 'MAP');
      }
    });

    $broker.on('UI_SYNC_INDICATOR', (data: any) => {
      this.pendingSyncCount = data.pending || 0;
      this.render();
    });

    $broker.on('UI_MODE_CHANGE', (mode: string) => {
      if (this.currentMode !== mode) {
        this.currentMode = mode as any;
        this.render();
      }
    });
  }
}
