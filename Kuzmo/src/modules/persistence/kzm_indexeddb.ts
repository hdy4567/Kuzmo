import { Kzm } from '../domain/kzm_entities';

/**
 * 🗄️ KzmIndexedDB (v1.0)
 * =============================
 * IndexedDB persistence layer for Kuzmo platform.
 */
export class KzmIndexedDB {
  private static readonly DB_NAME = 'KuzmoVault';
  private static readonly DB_VERSION = 10;
  private static readonly STORES = { RECORDS: 'records', FOLDERS: 'folders', LINKS: 'links' };
  private static db: IDBDatabase | null = null;
  static async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORES.RECORDS)) db.createObjectStore(this.STORES.RECORDS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(this.STORES.FOLDERS)) db.createObjectStore(this.STORES.FOLDERS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(this.STORES.LINKS)) db.createObjectStore(this.STORES.LINKS, { keyPath: 'id' });
      };
      request.onsuccess = () => { this.db = request.result; resolve(this.db); };
      request.onerror = () => reject(request.error);
    });
  }
  static async saveRecord(r: Kzm.Record): Promise<void> {
    const db = await this.init();
    const tx = db.transaction(this.STORES.RECORDS, 'readwrite');
    tx.objectStore(this.STORES.RECORDS).put(r);
    return new Promise(res => tx.oncomplete = () => res());
  }
  static async getRecord(id: string): Promise<Kzm.Record | null> {
    const db = await this.init();
    const tx = db.transaction(this.STORES.RECORDS, 'readonly');
    return new Promise(res => { tx.objectStore(this.STORES.RECORDS).get(id).onsuccess = (e: any) => res(e.target.result || null); });
  }
  static async getAllRecords(): Promise<Kzm.Record[]> {
    const db = await this.init();
    const tx = db.transaction(this.STORES.RECORDS, 'readonly');
    return new Promise(res => { const req = tx.objectStore(this.STORES.RECORDS).getAll(); req.onsuccess = () => res(req.result); });
  }
  static async saveShortcut(link: { id: string, title: string, url: string, icon?: string }): Promise<void> {
    const db = await this.init();
    const tx = db.transaction(this.STORES.LINKS, 'readwrite');
    tx.objectStore(this.STORES.LINKS).put(link);
    return new Promise(res => tx.oncomplete = () => res());
  }
  static async getShortcuts(): Promise<any[]> {
    const db = await this.init();
    const tx = db.transaction(this.STORES.LINKS, 'readonly');
    return new Promise(res => { const req = tx.objectStore(this.STORES.LINKS).getAll(); req.onsuccess = () => res(req.result); });
  }
  static async deleteShortcut(id: string): Promise<void> {
    const db = await this.init();
    const tx = db.transaction(this.STORES.LINKS, 'readwrite');
    tx.objectStore(this.STORES.LINKS).delete(id);
    return new Promise(res => tx.oncomplete = () => res());
  }
  static async clearAll(): Promise<void> {
    const db = await this.init();
    const tx = db.transaction(this.STORES.RECORDS, 'readwrite');
    tx.objectStore(this.STORES.RECORDS).clear();
    return new Promise(res => tx.oncomplete = () => res());
  }

}
