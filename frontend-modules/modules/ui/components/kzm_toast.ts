import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $store } from '@modules/kernel/persistence/kzm_kernel_store';

/**
 * ?뜛 KzmToast (v1.0 - Neon Alert System)
 * =======================================
 * High-performance global toast system with premium glass visuals.
 * Position: Top Center (Z-50000).
 */
export class KzmToast {
  private static instance: KzmToast;
  private container: HTMLElement | null = null;

  public static get(): KzmToast {
    if (!KzmToast.instance) KzmToast.instance = new KzmToast();
    return KzmToast.instance;
  }

  public async mount(parent: HTMLElement): Promise<void> {
    this.container = document.createElement('div');
    this.container.id = 'kzm-toast-system';
    this.container.style.position = 'fixed';
    this.container.style.pointerEvents = 'none';
    parent.appendChild(this.container);

    await $broker.executeCommand('UI_REGISTER', { id: 'toast_system', type: 'TOAST', el: this.container });
    
    // Subscribe to global events
    $store.subscribe('RECORD_ADDED', () => this.show("🌠 NEW MEMORY SYNCED"));
    $store.subscribe('SYNC_COMPLETED', () => this.show("🛰️ CLOUD HYDRATION COMPLETE"));
    $store.subscribe('RECORD_UPDATED', () => this.show("📜 MEMORY PACKET MERGED"));

    $broker.on('UI_TOAST_OPEN', (data: any) => {
        this.show(data.message, data.duration || 3000);
    });
  }

  public show(message: string, duration: number = 3000): void {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = 'kzm-toast luxe-glass neon-pulse';
    toast.innerText = message;
    
    this.container.appendChild(toast);
    console.log(`?뜛 [TOAST] ${message}`);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, -20px)';
      setTimeout(() => toast.remove(), 500);
    }, duration);
  }
}

export const $toast = KzmToast.get();
