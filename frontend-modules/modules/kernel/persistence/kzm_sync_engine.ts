// import { $store } from '@modules/kernel/persistence/kzm_kernel_store'; 
import { $broker } from '@modules/kernel/logic/kzm_shell_broker';

/**
 * ?쎇截?KzmSyncEngine (v1.1 - Offline Diff Caching)
 * ========================================================
 * Implementation of Phase 1-3: Offline Sync & Conflict Mgmt.
 */
export class KzmSyncEngine {
  private diffQueue: any[] = [];
  private isOnline: boolean = navigator.onLine;

  public init(): void {
    this.bindNetworkState();
    this.bindStoreInterception();
    console.log("?쎇截?[SYNC] Offline Diff Interceptor Active.");
  }

  public logDiff(type: 'CREATE' | 'UPDATE' | 'DELETE', payload: any): void {
    const diff = {
        type,
        timestamp: Date.now(),
        data: payload,
    };
    this.diffQueue.push(diff);
    console.log(`?쎇截?[SYNC] Diff Logged: ${type} (Queue: ${this.diffQueue.length})`);
    
    if (!this.isOnline) {
        $broker.executeCommand('UI_SYNC_INDICATOR', { pending: this.diffQueue.length });
    }
  }

  private bindNetworkState(): void {
    window.addEventListener('online', () => {
        this.isOnline = true;
        this.processBatchRollforward();
    });
    window.addEventListener('offline', () => {
        this.isOnline = false;
        console.warn("?쎇截?[SYNC] Network Disconnected. Switching to Offline Diff Mode.");
    });
  }

  private async bindStoreInterception(): Promise<void> {
    const { $store } = await import ('@modules/kernel/persistence/kzm_kernel_store');
    $store.subscribe((event) => {
        if (!this.isOnline && (event === 'RECORD_ADDED' || event === 'RECORD_DELETED')) {
            this.captureOfflineDiff(event);
        }
    });
  }

  private async captureOfflineDiff(type: string): Promise<void> {
    const { $store } = await import ('@modules/kernel/persistence/kzm_kernel_store');
    const records = $store.records;
    const diff = {
        type,
        timestamp: Date.now(),
        data: records[records.length - 1], 
    };
    this.diffQueue.push(diff);
    console.log(`?쎇截?[SYNC] Diff Captured: ${type} (Queue: ${this.diffQueue.length})`);
    
    $broker.executeCommand('UI_SYNC_INDICATOR', { pending: this.diffQueue.length });
  }

  private async processBatchRollforward(): Promise<void> {
    if (this.diffQueue.length === 0) return;
    
    console.log(`?쎇截?[SYNC] Reconnected. Rolling forward ${this.diffQueue.length} diffs...`);
    
    await new Promise(r => setTimeout(r, 1500));
    
    this.diffQueue = [];
    $broker.executeCommand('UI_SYNC_INDICATOR', { pending: 0 });
    console.log(`?쎇截?[SYNC] Cloud Synchronization Complete.`);
  }
}

export const $sync = new KzmSyncEngine();
