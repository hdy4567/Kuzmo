import { $store } from '../store/kzm_store';
import { Kzm } from '../domain/kzm_entities';

/**
 * 🛰️ KzmSyncEngine (v1.1)
 * ===========================
 * P2P & Cloud Sync Interface.
 */
export class KzmSyncEngine {
  private static instance: KzmSyncEngine;
  private peerId: string | null = null;
  private isConnected: boolean = false;

  private constructor() {
    console.log("🎬 Sync Engine Initialized.");
  }

  static get(): KzmSyncEngine {
    if (!KzmSyncEngine.instance) KzmSyncEngine.instance = new KzmSyncEngine();
    return KzmSyncEngine.instance;
  }

  public async initSync(): Promise<void> {
    this.peerId = `kzm_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🌐 Connected as Node: ${this.peerId}`);
    this.isConnected = true;

    try {
      const resp = await fetch('http://localhost:3000/api/v1/kuzmo-records');
      if (resp.ok) {
        const records = await resp.json();
        $store.bulkUpdate(records);
        return;
      }
    } catch (e) {
      console.warn("⚠️ Local Intelligence Mock Active.");
    }

    setTimeout(() => { this.simulateIncomingData(); }, 2000);
    return Promise.resolve();
  }

  private simulateIncomingData(): void {
    const mockRecords: Kzm.Record[] = [
      {
        id: 'rec_001',
        title: '오키나와 비치',
        coord: { lat: 26.65, lng: 128.15 },
        region: 'Okinawa',
        category: 'IMAGE',
        tags: ['BEACH', 'FAMILY'],
        createdAt: Date.now(),
        syncStatus: 'SYNCED',
        content: '# 오키나와 비치\n푸른 바다입니다.',
        snippet: '오키나와 비치... 정말 푸른 바다...',
      },
      {
        id: 'rec_002',
        title: '나하 국제거리 스테이크',
        coord: { lat: 26.21, lng: 127.68 },
        region: 'Okinawa',
        category: 'SCAN',
        tags: ['FOOD', 'STREET'],
        createdAt: Date.now(),
        syncStatus: 'SYNCED',
        content: '# 국제거리 맛집\n가성비 최고의 스테이크.',
        snippet: '국제거리 스테이크 맛집 후기',
      }
    ];

    $store.bulkUpdate(mockRecords);
  }

  public async pushChange(id: string): Promise<void> {
    if (!this.isConnected) return;
    console.log(`📡 Pushing: ${id}`);
  }
}

export const $sync = KzmSyncEngine.get();
