import { Kzm } from './kzm_memo_entities';

/**
 * 📦 KzmInitialData (v1.0 - Seed Authority)
 * ========================================
 * Role: Master repository for initial memory records.
 * Location: Moved from kernel_store to memo/db for modular sovereignty.
 */
export const KZM_INITIAL_RECORDS: Kzm.Record[] = [
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
