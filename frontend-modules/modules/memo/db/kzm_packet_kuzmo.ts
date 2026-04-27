import { $store } from '@modules/kernel/persistence/kzm_kernel_store';
import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { Kzm } from '@kzm/modules/memo/db/kzm_memo_entities';

import { KzmIndexedDB } from '@modules/memo/db/kzm_indexeddb';


/**
 * 💎 KzmPacketKuzmo (v12.0 - Unified Data Gateway & Kuzmo Memory Master)
 * ========================================================
 * Role: Handles persistence and retrieval for all Kuzmo Memories (Packets).
 * Refactored from Sovereign to Kuzmo as per Branding Directive.
 */
export class KzmPacketKuzmo {
    private static instance: KzmPacketKuzmo;
    private static readonly MERGE_THRESHOLD_METERS = 100;

    private constructor() {
        this.initializeKuzmoData();
    }

    public static getInstance(): KzmPacketKuzmo {
        if (!this.instance) this.instance = new KzmPacketKuzmo();
        return this.instance;
    }

    private initializeKuzmoData(): void {
        $store.subscribe('RECORD_ADDED', () => $broker.emit('STORAGE_UPDATED', { type: 'ADDED' }));
        $store.subscribe('RECORD_UPDATED', () => $broker.emit('STORAGE_UPDATED', { type: 'UPDATED' }));
        $log.log('INFO', 'KUZMO_DATA', 'Kuzmo Memory Persistence Logic Active.');
    }

    public async savePacket(data: Partial<Kzm.Record>): Promise<string> {
        if (!data.title?.trim()) {
            $broker.emit('UI_TOAST', { message: 'Packet Title Required.', type: 'ERROR' });
            throw new Error('VALIDATION_FAILED: Title missing');
        }

        let coords: Kzm.GeoCoord = data.geoCoord!;
        if (!coords) {
            const { $map } = await import('@modules/map/kzm_map_engine');
            const center = $map.getCenter();
            coords = { geoLat: center.lat, geoLng: center.lng };
        }

        const existingPacket = this.findNearbyPacket(coords.geoLat, coords.geoLng);

        if (existingPacket) {
            return this.mergePacket(existingPacket, data);
        }

        const record: Kzm.Record = {
            id: data.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            isPacket: true,
            version: '1.0',
            title: data.title.trim(),
            content: data.content?.trim() || '',
            geoCoord: coords,
            geohash: data.geohash || this.generateGeohash(coords.geoLat, coords.geoLng),
            geoRegion: data.geoRegion || Kzm.classifyRegion(coords.geoLat, coords.geoLng),
            category: data.category || 'MEMO',
            tags: data.tags || [],
            createdAt: data.createdAt || Date.now(),
            updatedAt: Date.now(),
            syncStatus: 'DIRTY',
            metadata: {
                timestamp: data.metadata?.timestamp || Date.now(),
                ...data.metadata
            },
            heroImage: data.heroImage || this.extractFirstThumbnail(data.mediaItems),
            mediaItems: data.mediaItems || [],
            isPrivate: data.isPrivate || false,
            encryptionLevel: data.encryptionLevel || 'NONE',
            ...data
        } as Kzm.Record;

        try {
            const id = await $store._insertRecord(record);
            await KzmIndexedDB.saveRecord(record);
            $broker.emit('MEMO_DATA_CHANGED', { type: 'PERSISTED', id });
            $broker.emit('STORAGE_UPDATED', { type: 'PERSISTED', id });
            $log.log('INFO', 'KUZMO_DATA', `Packet Optimized & Persisted: [${record.title}]`);
            return id;
        } catch (error) {
            throw error;
        }
    }

    public getPacketList(folder: string = 'ALL', filter: string = 'LATEST', tag: string = ''): Kzm.Record[] {
        // 🛰️ [DATA-LOOSENING] Allow all records with valid coordinates to be mapped
        let records = $store.records.filter(r => r.geoCoord && r.geoCoord.geoLat && r.geoCoord.geoLng);

        if (folder === 'FAVORITES') {
            records = records.filter(r => r.tags?.some((t: string) => t.includes('FAV')));
        } else if (folder === 'PRIVATE') {
            records = records.filter(r => (r as any).isPrivate);
        } else if (folder !== 'ALL') {
            // 📁 [CUSTOM-FOLDER] Match by specific folderId or tag membership
            records = records.filter(r => (r as any).folderId === folder || r.tags?.includes(folder));
        }

        if (tag && tag !== 'ALL') {
            const lowTag = tag.toLowerCase();
            records = records.filter(r =>
                r.geoRegion?.toLowerCase() === lowTag ||
                r.tags?.some(t => t.toLowerCase().includes(lowTag))
            );
        }

        if (filter === 'LATEST') {
            records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }

        return records;
    }

    public async deletePacket(id: string): Promise<void> {
        try {
            await KzmIndexedDB.deleteRecord(id);
            $store.deleteRecords([id]);
            $broker.emit('STORAGE_UPDATED', { type: 'DELETED', id });
        } catch (error) {
            $log.log('ERROR', 'KUZMO_DATA', 'Deletion Failure', { error });
        }
    }

    private findNearbyPacket(lat: number, lng: number): Kzm.Record | null {
        return $store.records.find((r: Kzm.Record) => {
            if (!r.isPacket && r.category !== 'MEMO') return false;
            const dist = this.calculateDistance(lat, lng, r.geoCoord.geoLat, r.geoCoord.geoLng);
            return dist < KzmPacketKuzmo.MERGE_THRESHOLD_METERS;
        }) || null;
    }

    private findTagPacket(tags: string[]): Kzm.Record | null {
        if (tags.length === 0) return null;
        return $store.records.find((r: Kzm.Record) => (r.isPacket || r.category === 'MEMO') && r.tags.some(t => tags.includes(t))) || null;
    }

    private async mergePacket(base: Kzm.Record, incoming: Partial<Kzm.Record>): Promise<string> {
        const updatedContent = `${base.content}\n\n--- [MERGED ${new Date().toLocaleDateString()}] ---\n${incoming.content || ''}`;
        const comboTags = [...new Set([...base.tags, ...(incoming.tags || [])])];
        const incomingMedia = incoming.mediaItems || [];

        if (incoming.heroImage) {
            incomingMedia.push({ type: 'IMAGE', url: incoming.heroImage } as Kzm.MediaItem);
        }

        const updates = {
            content: updatedContent,
            tags: comboTags,
            mediaItems: [...(base.mediaItems || []), ...incomingMedia],
            syncStatus: 'DIRTY' as Kzm.SyncStatus
        };

        $store.updateRecord(base.id, updates);
        const fullRecord = { ...base, ...updates };
        await KzmIndexedDB.saveRecord(fullRecord);
        $broker.emit('STORAGE_UPDATED', { type: 'MERGED', id: base.id });

        return base.id;
    }

    private extractFirstThumbnail(media: Kzm.MediaItem[] = []): string | undefined {
        const item = media.find(m => m.type === 'IMAGE' || m.type === 'VIDEO');
        return item?.url;
    }

    private generateGeohash(lat: number, lng: number): string {
        return `gh_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3;
        const phi1 = lat1 * Math.PI / 180;
        const phi2 = lat2 * Math.PI / 180;
        const deltaPhi = (lat2 - lat1) * Math.PI / 180;
        const deltaLambda = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

export const $packetKuzmo = KzmPacketKuzmo.getInstance();
export const $memoLogic = $packetKuzmo;
export const $packetEngine = $packetKuzmo;
export const $packetSovereign = $packetKuzmo; // Aliased for legacy compatibility
