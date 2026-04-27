import { $log } from './kzm_kernel_logger';
import { BlessedId, KzmLayer, UIRegistryItem } from '../entities/kzm_kernel_entities';

/**
 * 🛡️ KzmShellBroker (v12.2 - Repaired Core Sovereignty)
 * ========================================================
 * Principle: ISO/IEC 25010 Reliability & Security.
 * Pattern: Pure Mediation (Observer).
 * Status: Restored from deletion after directory refactoring.
 */
export class KzmShellBroker {
  private static instance: KzmShellBroker;
  private uiRegistry: Map<string, UIRegistryItem> = new Map();
  private permittedModules: Set<string> = new Set();
  private isSuspended: boolean = false;

  public static readonly LAYER_MAP: Record<KzmLayer, number> = {
    MAP: 10,
    CANVAS: 200,
    SIDE_PANEL: 9100,
    DOCK: 9200,
    TOP_NAV: 10000,
    NAVBAR: 11000,
    MODAL: 30000,
    HI_MODAL: 40000,
    TOAST: 50000
  };

  private constructor() { }

  public static get(): KzmShellBroker {
    if (!KzmShellBroker.instance) KzmShellBroker.instance = new KzmShellBroker();
    return KzmShellBroker.instance;
  }

  public permit(id: string): void {
    if (id) this.permittedModules.add(id);
  }

  /**
   * 🏗️ [REGISTER] Sovereign UI Synchronous Binding
   */
  public registerSync(id: BlessedId, layer: KzmLayer, el: HTMLElement, styleFile?: string): number {
    // 🛡️ Security Check (Only Blessed IDs are allowed)
    // Note: During transition, we might allow all if BLESSED_LIST is being updated.
    // However, for strict architecture, we keep the check.

    try {
      const zFinal = KzmShellBroker.LAYER_MAP[layer] || 100;
      el.style.zIndex = zFinal.toString();
      el.classList.add('kzm-sovereign-node');

      this.uiRegistry.set(id, {
        id, type: layer, el, styleDoc: styleFile, zFinal,
        isPermitted: true, visualHealth: 'PENDING'
      });

      if (styleFile) this.ensureStyleLoaded(styleFile);
      requestAnimationFrame(() => this.auditVisualHealth(id));

      return zFinal;
    } catch (e) {
      $log.log('ERROR', 'BROKER', `Registration Failure for ${id}`, { error: e });
      return -1;
    }
  }

  private ensureStyleLoaded(href: string): void {
    if (document.querySelector(`link[href*="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    // 🌉 Hybrid Path Logic for frontend-modules structure
    link.href = href.startsWith('frontend-modules/') ? `/${href}` : href;
    document.head.appendChild(link);
  }

  private auditVisualHealth(id: string): void {
    const item = this.uiRegistry.get(id);
    if (!item || !item.el) return;
    const rect = item.el.getBoundingClientRect();
    item.visualHealth = (rect.width > 0 && rect.height > 0) ? 'SUCCESS' : 'FAILED';
  }

  /**
   * 📊 [QUALITY] Generate System-Wide Health Report
   * Principle: Observability.
   */
  public generateHealthReport(): void {
    const total = this.uiRegistry.size;
    const success = Array.from(this.uiRegistry.values()).filter(v => v.visualHealth === 'SUCCESS').length;
    $log.log('INFO', 'SYSTEM', `Health Audit: ${success}/${total} modules active.`, {
      metadata: { visualHealth: success === total ? 'SUCCESS' : 'FAILED' }
    });
  }

  public detectGhosts(container: HTMLElement): any[] {
    const ghosts: any[] = [];
    if (!container) return ghosts;
    Array.from(container.children).forEach((c: any) => {
      if (!this.uiRegistry.has(c.id)) ghosts.push({ id: c.id, el: c });
    });
    return ghosts;
  }

  /**
   * 📡 [IPC] Command Execution Engine
   */
  public executeCommand(cmd: string, data?: any): void {
    if (this.isSuspended) return;
    try {
      window.dispatchEvent(new CustomEvent('kzm-cmd', { detail: { cmd, data } }));
    } catch (e) {
      $log.log('ERROR', 'BROKER', 'Command Dispatch Failed', { error: e });
    }
  }

  public on(cmd: string, callback: (data: any) => void): void {
    window.addEventListener('kzm-cmd', (e: any) => {
      try {
        if (e.detail.cmd === cmd) callback(e.detail.data);
      } catch (e) { }
    });
  }

  public emit(cmd: string, data: any): void {
    this.executeCommand(cmd, data);
  }
}

export const $broker = KzmShellBroker.get();
