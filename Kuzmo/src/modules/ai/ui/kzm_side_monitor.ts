import { $store } from '../../store/kzm_store';

/**
 * 📊 KzmSideMonitor (v1.1)
 * ========================
 * Compact AI Performance Monitoring Panel.
 */
export class KzmSideMonitor {
  private container: HTMLElement | null = null;
  private fadeTimer: any = null;

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'monitor-panel';
    this.container.className = 'side-panel glass active';
    parent.appendChild(this.container);
    this.render();
    this.setupListeners();
    this.ping();
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="panel-header">
        <span>AI MONITOR</span>
        <div class="live-status"><span class="pulse-dot"></span>LIVE</div>
      </div>
      <div class="vitals">
        <div class="vital-row">
          <span class="vital-label">DATA TRAFFIC</span>
          <div class="vital-track"><div id="flow-bar" class="vital-fill" style="width: 65%;"></div></div>
        </div>
        <div class="vital-row">
          <span class="vital-label">CORE SYNC</span>
          <div class="vital-track"><div id="sync-bar" class="vital-fill" style="width: 85%;"></div></div>
        </div>
      </div>
      <button id="kzm-login-btn" class="sync-login-btn">CLOUD SYNC</button>
    `;
  }

  private setupListeners(): void {
     const loginBtn = this.container?.querySelector('#kzm-login-btn') as HTMLElement;
     if (loginBtn) {
        loginBtn.onclick = () => {
          console.log("🎬 Starting Cloud Auth...");
          alert("Restore data from Google Drive / S3?");
        };
     }

     $store.subscribe(() => {
        this.ping();
     });
  }

  public ping(): void {
    if (!this.container) return;
    this.container.classList.remove('faded');
    this.container.style.display = 'block';
    if (this.fadeTimer) clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(() => {
        this.container?.classList.add('faded');
        setTimeout(() => { if (this.container?.classList.contains('faded')) this.container.style.display = 'none'; }, 650);
    }, 8000);
  }
}

