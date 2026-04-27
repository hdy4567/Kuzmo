import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { BLESSED_LIST, KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';

/**
 * 🕵️ KzmOrchestraMonitor (v11.7 - Repaired Charset Integrity)
 * ========================================================
 * Role: Real-time system monitor for UI Registry health.
 * Fix: Restored from encoding corruption caused by powershell.
 */
export class KzmOrchestraMonitor implements KzmModule {
  public id = 'orchestra-monitor';
  public isSyncMode = true;
  public isVisible = false;

  private container: HTMLElement | null = null;
  private updateInterval: any = null;

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'orchestra-monitor';
    this.container.className = 'fast-render hidden';

    $broker.registerSync('orchestra-monitor' as any, 'TOAST', this.container);
    parent.appendChild(this.container);
    this.render();
    this.bindEvents();
  }

  public show(): void {
    this.isVisible = true;
    this.container?.classList.remove('hidden');
    this.container?.classList.add('visible');
    this.startAutoUpdate();
  }

  public hide(): void {
    this.isVisible = false;
    this.container?.classList.remove('visible');
    this.container?.classList.add('hidden');
    this.stopAutoUpdate();
  }

  private startAutoUpdate(): void {
    this.stopAutoUpdate();
    this.updateInterval = setInterval(() => this.render(), 1000);
  }

  private stopAutoUpdate(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
  }

  private render(): void {
    if (!this.container) return;

    // Use internal registry from broker for auditing
    const registry = ($broker as any).uiRegistry;
    
    let rows = '';
    if (registry) {
        rows = BLESSED_LIST.map(id => {
            const item = registry.get(id);
            const statusIcon = item ? 'YES' : 'NO'; // Using text instead of emojis to avoid future encoding mangling
            const healthColor = item ? (item.visualHealth === 'SUCCESS' ? '#00ff88' : '#ff4b2b') : '#555';
            const layerType = item ? item.type : 'NULL';
            const healthStatus = item ? item.visualHealth : 'MISSING';

            return `
                <div class="monitor-row">
                    <div class="row-main">
                        <span class="status-icon" style="color: ${item ? '#00ff88' : '#ff4b2b'}">${statusIcon}</span>
                        <span class="module-id">${id}</span>
                    </div>
                    <div class="row-sub">
                        <span class="layer-tag">${layerType}</span>
                        <span class="health-tag" style="color: ${healthColor}">${healthStatus}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    this.container.innerHTML = `
      <div class="monitor-wrapper">
          <div class="monitor-header">
              <span>KERNEL AUDIT CORE</span>
              <span id="kzm-ghost-count">GHOSTS: 0</span>
          </div>
          <div class="monitor-list">
              ${rows || '<div class="monitor-empty">Registry Offline</div>'}
          </div>
      </div>
    `;

    this.updateGhostCount();
  }

  private updateGhostCount(): void {
    const ghostEl = this.container?.querySelector('#kzm-ghost-count') as HTMLElement;
    if (!ghostEl) return;
    const ghosts = $broker.detectGhosts(document.body);
    ghostEl.innerHTML = `GHOSTS: ${ghosts.length}`;
    ghostEl.style.color = ghosts.length > 0 ? '#ff4b2b' : '#00ff88';
  }

  private bindEvents(): void {
    if (!this.container) return;

    $broker.on('UI_MONITOR_TOGGLE', () => {
      if (this.isVisible) this.hide();
      else this.show();
    });

    $broker.on('UI_GLOBAL_DISMISS', () => this.hide());
  }
}
