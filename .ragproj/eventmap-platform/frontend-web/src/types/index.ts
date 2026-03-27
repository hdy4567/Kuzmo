/**
 * 📦 Kuzmo Core Type Definitions (v31.0)
 */

export interface EventItem {
    id: string;
    title: string;
    lat: number;
    lng: number;
    region?: string;
    address?: string;
    tags?: string[];
    type?: string;
    category?: string;
    timestamp: number;
    last_modified?: number;
    content?: string;
    description?: string;
    summary?: string;
    imageUrl?: string | null;
    audioUrl?: string | null;
    sketch_ai?: SketchData | null;
    extraData?: {
        aiSuggestion?: string;
    };
    packetDriveId?: string | null;
    localKzmPath?: string | null;
    syncFingerprint?: string | null;
    sync_status?: 'synced' | 'pending' | 'conflict';
    _kzmPacket?: KzmPacket;
}

export interface SketchData {
    svg: string;
    semantic: string;
    strokes?: number[][]; // [x, y, pressure, time, cid][]
}

export interface KzmPacket {
    _kzm: string;
    manifest: {
        id: string;
        title: string;
        lat: number;
        lng: number;
        region: string;
        tags: string[];
        category: string;
        timestamp: number;
        snippet: string;
        sketch: SketchData | null;
        mediaMap: Record<string, string>;
    };
    files: Record<string, string>; // filename -> base64
}

export interface DriveFolder {
    id: string;
    name: string;
}
