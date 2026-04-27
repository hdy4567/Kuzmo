import { Kzm } from '@kzm/modules/memo/db/kzm_memo_entities';
import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';

/**
 * [SOVEREIGN-MEMORY] KzmSovereignMemory (v12.9 - Additive Normalized)
 * ========================================================
 * Role: Unified Central Repository for all spatial records and UI state.
 * Fix: Generated all missing fields to satisfy Kzm.Record interface.
 */
class KzmSovereignMemory {
  private static instance: KzmSovereignMemory;
  public isReady = false;

  public records: Kzm.Record[] = [
    {
      id: "KZM-SEED-01",
      title: "First Memory - Seoul Tower",
      content: "The beginning of the Kuzmo journey at the heart of the city.",
      geoCoord: { geoLat: 37.5512, geoLng: 126.9882 },
      geohash: "wydm6ez9",
      geoRegion: "Seoul, KR",
      category: "MEMO",
      tags: ["SEOUL", "START"],
      createdAt: 1713500000000,
      updatedAt: 1713500000000,
      isPacket: true,
      version: "1.0",
      encryptionLevel: "NONE",
      syncStatus: "SYNCED",
      metadata: { timestamp: 1713500000000 }
    },
    {
      id: "KZM-SEED-02",
      title: "Blue Wave - Han River",
      content: "Watching the sunset near the bridge. Calm and soulful.",
      geoCoord: { geoLat: 37.5112, geoLng: 126.9412 },
      geohash: "wydm0y7j",
      geoRegion: "Seoul, KR",
      category: "MEMO",
      tags: ["RIVER", "NIGHT"],
      createdAt: 1713500000000,
      updatedAt: 1713500000000,
      isPacket: true,
      version: "1.0",
      encryptionLevel: "NONE",
      syncStatus: "SYNCED",
      metadata: { timestamp: 1713500000000 }
    },
    {
      id: "KZM-SEED-03",
      title: "Neon Forest - Gangnam",
      content: "The pulse of the city never sleeps. High energy vibe.",
      geoCoord: { geoLat: 37.4979, geoLng: 127.0276 },
      geohash: "wydm2g9b",
      geoRegion: "Seoul, KR",
      category: "MEMO",
      tags: ["CITY", "NEON"],
      createdAt: 1713500000000,
      updatedAt: 1713500000000,
      isPacket: true,
      version: "1.0",
      encryptionLevel: "NONE",
      syncStatus: "SYNCED",
      metadata: { timestamp: 1713500000000 }
    },
    {
      id: "KZM-SEED-04",
      title: "Autumn Breeze - Palace",
      content: "Maple leaves falling between the traditional walls.",
      geoCoord: { geoLat: 37.5796, geoLng: 126.9770 },
      geohash: "wydm7p6r",
      geoRegion: "Seoul, KR",
      category: "MEMO",
      tags: ["PALACE", "AUTUMN"],
      createdAt: 1713500000000,
      updatedAt: 1713500000000,
      isPacket: true,
      version: "1.0",
      encryptionLevel: "NONE",
      syncStatus: "SYNCED",
      metadata: { timestamp: 1713500000000 }
    },
    {
      id: "KZM-SEED-05",
      title: "Quiet Library - Reading",
      content: "Whispered stories in the corner of the wood-scented room.",
      geoCoord: { geoLat: 37.5218, geoLng: 127.0423 },
      geohash: "wydm3m8u",
      geoRegion: "Seoul, KR",
      category: "MEMO",
      tags: ["BOOK", "SILENCE"],
      createdAt: 1713500000000,
      updatedAt: 1713500000000,
      isPacket: true,
      version: "1.0",
      encryptionLevel: "NONE",
      syncStatus: "SYNCED",
      metadata: { timestamp: 1713500000000 }
    }
  ];

  public selectedIds: Set<string> = new Set();
  public customFolders: string[] = ['Personal', 'Travel', 'Work'];
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {
    this.initializeStore();
  }

  private async initializeStore(): Promise<void> {
    $log.log('INFO', 'STORE', 'Checking persistent spatial vault...');
    try {
      const { KzmIndexedDB } = await import('../../memo/db/kzm_indexeddb');
      const dbRecords = await KzmIndexedDB.getAllRecords();
      if (dbRecords && dbRecords.length > 0) {
        const seedIds = new Set(this.records.map(r => r.id));
        const newFromDb = dbRecords.filter(r => !seedIds.has(r.id));
        this.records.push(...newFromDb);
      }
    } catch (e) {
      $log.log('ERROR', 'STORE', 'Database connection failed.');
    }
    this.isReady = true;
    this.notify('STORE_READY');
  }

  public static getInstance(): KzmSovereignMemory {
    if (!KzmSovereignMemory.instance) KzmSovereignMemory.instance = new KzmSovereignMemory();
    return KzmSovereignMemory.instance;
  }

  public async createRecord(record: Partial<Kzm.Record>): Promise<string> {
    const newRecord: Kzm.Record = {
      id: `rec_${Date.now()}`,
      isPacket: true,
      version: '1.0',
      title: record.title || 'Untitled',
      geohash: record.geohash || 'MAP_UNSPECIFIED',
      geoRegion: record.geoRegion || 'Unknown',
      geoCoord: record.geoCoord || { geoLat: 0, geoLng: 0 },
      tags: record.tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      category: record.category || 'NOTE',
      syncStatus: 'PENDING',
      content: record.content || '',
      metadata: record.metadata || { timestamp: Date.now() },
      encryptionLevel: 'NONE'
    } as Kzm.Record;

    this.records.push(newRecord);
    this.notify('RECORD_ADDED', newRecord);
    return newRecord.id;
  }

  public _insertRecord(record: Kzm.Record): string {
    this.records.push(record);
    this.notify('RECORD_ADDED', record);
    return record.id;
  }

  public clearSelection(): void {
    this.selectedIds.clear();
    this.notify('SELECTION_CHANGED', []);
  }

  public createFolder(name: string): void {
    if (!this.customFolders.includes(name)) {
      this.customFolders.push(name);
      this.notify('FOLDER_ADDED', name);
    }
  }

  public getRecordById(id: string): Kzm.Record | undefined {
    return this.records.find(r => r.id === id);
  }

  public getUniqueTags(): string[] {
    return [...new Set(this.records.flatMap(r => r.tags || []))];
  }

  public updateRecord(id: string, updates: Partial<Kzm.Record>): void {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.records[idx] = { ...this.records[idx], ...updates };
      this.notify('RECORD_UPDATED', this.records[idx]);
    }
  }

  public deleteRecords(ids: string[]): void {
    this.records = this.records.filter(r => !ids.includes(r.id));
    this.notify('RECORD_DELETED', ids);
  }

  public subscribe(event: string, callback: (data?: any) => void): void;
  public subscribe(callback: (event: string, data?: any) => void): void;
  public subscribe(eventOrCallback: string | Function, callback?: Function): void {
    if (typeof eventOrCallback === 'function') {
      if (!this.listeners.has('*')) this.listeners.set('*', []);
      this.listeners.get('*')?.push(eventOrCallback);
    } else if (callback) {
      if (!this.listeners.has(eventOrCallback)) this.listeners.set(eventOrCallback, []);
      this.listeners.get(eventOrCallback)?.push(callback);
    }
  }

  public notify(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
    this.listeners.get('*')?.forEach(cb => cb(event, data));
  }
}

export const $store = KzmSovereignMemory.getInstance();
