import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $packetKuzmo } from '@modules/memo/db/kzm_packet_kuzmo';
import { $archive } from '@modules/archive/services/kzm_archive_service';
import { $log } from './kzm_kernel_logger';

/**
 * 🛰️ KzmMiddlewareKuzmo (v2.0 - The Kuzmo Bridge)
 * ========================================================
 * Role: Unified stream controller for Map & Archive synchronization.
 * Pattern: Hub & Spoke Middleware.
 * Logic: Merges multiple storage/filter events into a single Kuzmo Discovery Stream.
 * Refactored from Sovereign to Kuzmo.
 */
export class KzmMiddlewareKuzmo {
  private static instance: KzmMiddlewareKuzmo;

  private constructor() {
    this.initStream();
  }

  public static get(): KzmMiddlewareKuzmo {
    if (!this.instance) this.instance = new KzmMiddlewareKuzmo();
    return this.instance;
  }

  /**
   * 🌊 [KUZMO-STREAM-NEXUS]
   * Centralizes all disparate data events into one authoritative tick.
   */
  private initStream(): void {
    // 🚀 [INITIAL-HEARTBEAT] Trigger initial render for late-mounted observers
    setTimeout(() => this.broadcastTick('BOOT_INIT'), 500);

    const triggers = [
      'MEMO_DATA_CHANGED',
      'MEMORY_CREATED',
      'STORAGE_UPDATED',
      'FILTER_CHANGED'
    ];

    triggers.forEach(event => {
      $broker.on(event, (data: any) => {
        // 🏷️ Intercept and sync internal filter states if needed
        if (event === 'FILTER_CHANGED') {
            $archive.currentTagFilter = data.tag || '';
        }

        this.broadcastTick(event, data);
      });
    });

    $log.log('INFO', 'MIDDLEWARE', 'Kuzmo Memory Stream Middleware ONLINE.');
  }

  private activeCategory: string = 'KR';

  private broadcastTick(source: string, payload?: any): void {
    if (source === 'FILTER_CHANGED' && payload?.region) {
        this.activeCategory = payload.region;
        $archive.currentFolder = this.activeCategory; // ✨ ASSIMILATE Category to Archive Folder
    }
    
    $broker.emit('DISCOVERY_STREAM_UPDATE', {
        source,
        payload,
        timestamp: Date.now(),
        activeTag: $archive.currentTagFilter,
        activeCategory: this.activeCategory,
        strategy: payload?.strategy // Forward the strategy object
    });
  }
}

export const $middleware = KzmMiddlewareKuzmo.get();
