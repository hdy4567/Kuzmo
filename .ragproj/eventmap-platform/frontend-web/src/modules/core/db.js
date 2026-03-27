/**
 * 🗄️ EventDB v2 - Slim Cache Schema
 * ===================================
 * IndexedDB에는 마커 로드에 필요한 최소 정보만 저장.
 * 전체 콘텐츠/미디어는 .kzm 패킷에서 언패킹.
 *
 * Schema v2 Fields:
 *   id, title, lat, lng, region, tags, timestamp,
 *   snippet, thumbnailBlob, packetDriveId, localKzmPath, type
 */

const DB_NAME    = 'EventMapDB';
const STORE_NAME = 'events';
const HANDLE_STORE = 'handles';
const LINKS_STORE  = 'links';
const FOLDERS_STORE = 'folders';
const DB_VERSION = 6; // ⬆️ v5 → v6 (Virtual Folder Support)

export class EventDB {
    static async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // events store (v5: sync indexing)
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('region', 'region', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('sync_status', 'sync_status', { unique: false });
                } else {
                    const store = e.currentTarget.transaction.objectStore(STORE_NAME);
                    if (!store.indexNames.contains('sync_status')) {
                        store.createIndex('sync_status', 'sync_status', { unique: false });
                    }
                }

                // handles store (v3)
                if (!db.objectStoreNames.contains(HANDLE_STORE)) {
                    db.createObjectStore(HANDLE_STORE);
                }

                // links store (v4)
                if (!db.objectStoreNames.contains(LINKS_STORE)) {
                    const ls = db.createObjectStore(LINKS_STORE, { keyPath: 'id' });
                    ls.createIndex('source', 'source', { unique: false });
                    ls.createIndex('target', 'target', { unique: false });
                }

                // folders store (v6)
                if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
                    const fs = db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
                    fs.createIndex('order', 'order', { unique: false });
                    fs.createIndex('parentId', 'parentId', { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror   = () => reject(request.error);
        });
    }

    /** 📁 Folder Management Accessors (v6) */
    static async getAllFolders() {
        const db = await this.open();
        return new Promise(r => {
            const tx = db.transaction(FOLDERS_STORE, 'readonly');
            tx.objectStore(FOLDERS_STORE).getAll().onsuccess = (e) => r(e.target.result);
        });
    }

    static async putFolder(folder) {
        const db = await this.open();
        const tx = db.transaction(FOLDERS_STORE, 'readwrite');
        if (!folder.id) folder.id = `fld_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
        tx.objectStore(FOLDERS_STORE).put(folder);
        return new Promise(r => tx.oncomplete = () => r(folder.id));
    }

    static async deleteFolder(id) {
        const db = await this.open();
        const tx = db.transaction(FOLDERS_STORE, 'readwrite');
        tx.objectStore(FOLDERS_STORE).delete(id);
    }

    /** 📊 Graph Linkage Accessors (v4) */
    static async getAllLinks() {
        const db = await this.open();
        return new Promise(r => {
            const tx = db.transaction(LINKS_STORE, 'readonly');
            tx.objectStore(LINKS_STORE).getAll().onsuccess = (e) => r(e.target.result);
        });
    }

    static async putLink(link) {
        const db = await this.open();
        const tx = db.transaction(LINKS_STORE, 'readwrite');
        tx.objectStore(LINKS_STORE).put(link);
    }

    static async clearLinks() {
        const db = await this.open();
        const tx = db.transaction(LINKS_STORE, 'readwrite');
        tx.objectStore(LINKS_STORE).clear();
    }

    /** Handle Caching Accessors (v3) */
    static async setHandle(key, handle) {
        const db = await this.open();
        const tx = db.transaction(HANDLE_STORE, 'readwrite');
        tx.objectStore(HANDLE_STORE).put(handle, key);
        return new Promise(r => tx.oncomplete = () => r(true));
    }
    static async getHandle(key) {
        const db = await this.open();
        return new Promise(r => {
            db.transaction(HANDLE_STORE, 'readonly').objectStore(HANDLE_STORE).get(key).onsuccess = (e) => r(e.target.result);
        });
    }

    /** 단일 레코드 조회 */
    static async get(id) {
        const db = await this.open();
        return new Promise((resolve) => {
            db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id).onsuccess = (e) => resolve(e.target.result);
        });
    }

    /** 전체 슬림 레코드 조회 (지도 초기 로드) */
    static async getAll() {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx    = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            store.getAll().onsuccess = (e) => resolve(e.target.result);
        });
    }

    /** 단일 레코드 삽입/갱신 */
    static async put(record) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx    = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            if (!record.id) record.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
            if (!record.sync_status) record.sync_status = 'dirty';
            store.put(record);
            tx.oncomplete = () => resolve(record.id);
            tx.onerror    = () => reject(tx.error);
        });
    }

    /** 배치 삽입 (고성능) */
    static async putMany(records) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx    = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            for (const r of records) {
                if (!r.id) r.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
                if (!r.sync_status) r.sync_status = 'dirty';
                store.put(r);
            }
            tx.oncomplete = resolve;
            tx.onerror    = () => reject(tx.error);
        });
    }

    /** 전체 교체 저장 */
    static async saveAll(records) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx    = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.clear();
            for (const r of records) {
                if (!r.id) r.id = `evt_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
                if (!r.sync_status) r.sync_status = 'synced'; // Batch reload usually means synced or bulk init
                store.put(r);
            }
            tx.oncomplete = resolve;
            tx.onerror    = () => reject(tx.error);
        });
    }

    /** 단일 레코드 삭제 */
    static async delete(id) {
        const db = await this.open();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
    }

    /** packetDriveId 존재 여부 확인 (중복 차단) */
    static async hasDriveId(driveId) {
        const all = await this.getAll();
        return all.some(r => r.packetDriveId === driveId);
    }
}
