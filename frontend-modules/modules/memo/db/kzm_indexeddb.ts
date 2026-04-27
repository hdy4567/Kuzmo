import { Kzm } from '@kzm/modules/memo/db/kzm_memo_entities';

/**
 * ??? KzmIndexedDB (v4.0 - Packet & SSoT Authority)
 * ==================================================
 * Features: MD Packet Storage, BLOB Media Caching, Incremental Sync.
 * Sequence: Hydrate -> Diff -> Push.
 */
export class KzmIndexedDB {
  private static readonly DB_NAME = 'EventMapDB';
  private static readonly STORE_RECORDS = 'records';
  private static readonly VERSION = 1;

  private static async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_RECORDS)) {
          db.createObjectStore(this.STORE_RECORDS, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public static async getAllRecords(): Promise<Kzm.Record[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE_RECORDS, 'readonly');
      const store = tx.objectStore(this.STORE_RECORDS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }

  public static async saveRecord(record: Kzm.Record): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(this.STORE_RECORDS, 'readwrite');
    const store = tx.objectStore(this.STORE_RECORDS);
    store.put(record);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  public static async deleteRecord(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(this.STORE_RECORDS, 'readwrite');
    const store = tx.objectStore(this.STORE_RECORDS);
    store.delete(id);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  /**
   * ?룛截?[PACKET-EXPORT] Create .kzm (ZIP Simulation as MD/JPG)
   */
  public static async exportToKzm(record: Kzm.Record): Promise<Blob> {
    const manifest = {
      title: record.title,
      tags: record.tags,
      geo: record.geoCoord,
      content: record.content,
      mediaCount: record.mediaItems?.length || 0
    };

    const content = `---
title: ${manifest.title}
geo: ${JSON.stringify(manifest.geo)}
tags: ${manifest.tags.join(', ')}
---
# ${manifest.title}
${manifest.content}`;

    return new Blob([content], { type: 'text/markdown' });
  }
}

