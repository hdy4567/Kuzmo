/**
 * 🗺️ KzmNavigator (v1.2)
 * =======================
 * App Navigation & Mode Switch Controller.
 * Handles Bottom Tabs, Mode Transitions, and Memory FAB.
 */
export class KzmNavigator {
  private container: HTMLElement | null = null;
  private onModeChange: ((mode: string) => void) | null = null;

  public mount(parent: HTMLElement, callback: (mode: string) => void): void {
    this.container = document.createElement('div');
    this.container.className = 'navigator-controls';
    this.onModeChange = callback;
    parent.appendChild(this.container);
    this.render();
    this.setupListeners();
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <!-- Telegram-style 'Sausage' Switcher -->
      <div class="mode-switcher">
        <div class="mode-tab active" data-mode="MAP">MAP</div>
        <div class="mode-tab" data-mode="LOCKER">ARCHIVE</div>
      </div>

      <!-- Quick Action FAB -->
      <button id="locker-fab" class="locker-fab" title="Quick Add (Alt+N)"></button>
    `;
  }

  private setupListeners(): void {
    if (!this.container) return;
    const tabs = this.container.querySelectorAll('.mode-tab');
    const fab = this.container.querySelector('#locker-fab') as HTMLElement;

    tabs.forEach((el: Element) => {
      (el as HTMLElement).onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        if (this.onModeChange) this.onModeChange((el as HTMLElement).dataset.mode || 'MAP');
      };
    });

    if (fab) {
       fab.onclick = () => {
         if (this.onModeChange) this.onModeChange('LOCKER');
       };
    }
  }

  public setMode(mode: string): void {
    if (!this.container) return;
    const tabs = this.container.querySelectorAll('.mode-tab');
    tabs.forEach(t => {
      const tabMode = (t as HTMLElement).dataset.mode;
      if (tabMode === mode) t.classList.add('active');
      else t.classList.remove('active');
    });
  }
}
