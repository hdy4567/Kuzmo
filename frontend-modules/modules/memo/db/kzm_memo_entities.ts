/**
 * 🏛️ KzmMemoEntities (v1.0 - Domain Specific Sovereignty)
 * ========================================================
 */

export namespace Kzm {
  export type Guid = string;
  export type Category = 'VOICE' | 'PIN' | 'PHOTO' | 'VIDEO' | 'NOTE' | 'MEMO' | 'DRAWING';
  export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

  export interface RecordMetadata {
    timestamp: number;
    duration?: number; // 🛑 MAX 10s for VOICE/AUDIO
    thumbnail?: string; // PHOTO only
    isClustered?: boolean;
    clusterCount?: number;
    canvasData?: string; // 🎨 AI-Readable Vector SVG Storage
  }

  export interface GeoCoord {
    geoLat: number;
    geoLng: number;
  }

  export interface MediaItem {
    type: 'IMAGE' | 'VIDEO' | 'AUDIO';
    url: string;
    caption?: string;
  }

  export interface Record {
    // 🛡️ [HEADER] Identifiers & Sovereignty
    id: Guid;
    isPacket: true; // Unified Signature for the Sovereign Engine
    version: '1.0'; // Schema Versioning

    // 🗺️ [SPATIAL] Localization & Warp Points
    geohash: string;
    geoRegion: string;
    geoCoord: GeoCoord;
    location?: string;

    // 📝 [CONTENT] The Core Memory Body
    title: string;
    content: string; // Markdown / Base64 Content
    category: Category;
    tags: string[];

    // 🔐 [SECURITY] Privacy & Access Control
    isPrivate?: boolean;
    encryptionLevel?: 'NONE' | 'AES256' | 'SOVEREIGN';

    // 📦 [PAYLOAD] Multimedia & Attachments
    mediaItems?: MediaItem[];
    heroImage?: string;

    // 🛰️ [METADATA] Lifecycle & Sync Nexus
    createdAt: number;
    updatedAt: number;
    syncStatus: 'DIRTY' | 'PENDING' | 'SYNCED' | 'FAILED';
    metadata: RecordMetadata;
  }

  // 메모 생성 위치에 따라 자동으로 지역 설정하는 함수
  export function detectRegion(lat: number, lng: number): string {
    // 🇰🇷 [CORE-KOREA-BOUNDS]
    if (lat > 37.4 && lat < 37.7 && lng > 126.7 && lng < 127.2) return 'Seoul';
    if (lat > 35.0 && lat < 35.4 && lng > 128.7 && lng < 129.4) return 'Busan';
    if (lat > 33.2 && lat < 33.6 && lng > 126.2 && lng < 127.0) return 'Jeju';
    if (lat > 37.3 && lat < 37.7 && lng > 126.4 && lng < 126.9) return 'Incheon';
    if (lat > 35.7 && lat < 36.1 && lng > 128.3 && lng < 128.9) return 'Daegu';

    // Country Fallbacks
    if (lat > 33 && lat < 39 && lng > 124 && lng < 132) return 'KR';
    if (lat > 30 && lat < 46 && lng > 122 && lng < 154) return 'JP';
    return 'UNKNOWN';
  }

  export function classifyRegion(lat: number, lng: number): string {
    return detectRegion(lat, lng);
  }
}
