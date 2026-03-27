import RBush from 'rbush';
import { EventDB } from './db.js';

export const CONFIG = {
  apiKey: (import.meta.env.VITE_GOOGLE_API_KEY || "").trim(),
  clientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim(),
  discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
  scopes: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file",
  appId: (import.meta.env.VITE_GOOGLE_APP_ID || "").trim()
};

console.log("🛠️ Google Config Verified:", { 
  keyPrefix: CONFIG.apiKey.substring(0, 7) + "...",
  clientIdPrefix: CONFIG.clientId.substring(0, 10) + "...",
  appId: CONFIG.appId,
  origin: window.location.origin
});

export const REGION_COORDS = {
  "서울": [37.5665, 126.9780], "경기도": [37.2752, 127.0095], "강원도": [37.8228, 128.1555],
  "충남": [36.6588, 126.6728], "충북": [36.6350, 127.4912], "제주도": [33.4996, 126.5312],
  "도쿄": [35.6762, 139.6503], "오사카": [34.6937, 135.5023], "후쿠오카": [33.5902, 130.4017],
  "나고야": [35.1815, 136.9066], "니가타": [37.9162, 139.0364], "홋카이도": [43.0642, 141.3469], "오키나와": [26.2124, 127.6809]
};

// 📦 [LEGACY] Key for one-time localStorage migration
export const DB_KEY = 'kuzmo_events_db';

export const state = {
  map: null,
  clusterGroup: null,
  markers: new Map(),
  spatialIndex: new RBush(), // 🌳 [SOTA] R-Tree Spatial Index (O(log N))
  theme: localStorage.getItem('app_theme') || 'dark',
  searchQuery: "",
  currentCountry: "Korea",
  currentSubFilter: "전체",
  isAiActive: false,
  showTourist: true, // 📡 [FILTER] 관광류 마커 표시 여부
  showMemory: true,  // 📝 [FILTER] 추억류 마커 표시 여부
  lastRequestId: 0,
  activeFilterTaskId: 0, // 🛰️ [CANCELLATION-TOKEN] 중복 필터링 방지 테스크 ID
  isLockerSynced: localStorage.getItem('is_locker_synced') === 'true',
  lockerFolderName: localStorage.getItem('locker_folder_name'),
  lockerFolderId: localStorage.getItem('locker_folder_id'),
  lockerMode: localStorage.getItem('locker_view_mode') || 'grid', // 'grid' | 'linear'
  isServerConnected: false, // 🚀 [NEW] Tracking backend availability
  isAiInitialized: false, // 🧠 [v25.5] Lazy Loading Flag
  autoLabelingEnabled: false,
  labelingLogs: [],
  monitorFilter: 'ALL',
  socket: null,
  selectedIds: new Set(),
  selectionStart: null,
  isSelecting: false,
  learningBrain: JSON.parse(localStorage.getItem('ai_learning_brain')) || {
    "@서울": { keywords: ["서울", "강남", "종로", "seoul"], weight: 1.5 },
    "@도쿄": { keywords: ["도쿄", "시부야", "tokyo"], weight: 1.5 },
    "#맛집": { keywords: ["맛집", "먹은", "식당", "푸드"], weight: 1.0 },
    "#기록": { keywords: ["메모", "기록", "노트", "memo", "글"], weight: 1.2 }
  },
  conversationHistory: [], // 🧠 AI 단기 기억 저장소 (최근 5개)
  currentDetailData: null,
  eventStore: [], // 🚀 [UNIFIED-STORE]
  folders: [],    // 📁 [v30.0] Virtual Folder List
  currentFolderId: 'all', // 'all' | folderId
  
  // ⚡ [PERFORMANCE-MONITORING] (v22.40)
  currentFPS: 60,
  perfMode: 'ULTRA', // 'ULTRA' | 'STABLE' | 'LOW_POWER' | 'CRITICAL'
  clusterAggression: 1.0, // Multiplier for clustering radii/eps
  
  eventMap: new Map(), // 🚀 [O(1) OPTIMIZATION] Spatial-to-Object quick lookup
  existingIds: new Set(), // 🚀 [PERF] Persistent O(1) lookup set for duplicates
  lastActiveEventId: localStorage.getItem('last_active_event_id'), // 🔖 [CACHING] 마지막 확인한 파일 ID
  
  // 📊 [GRAPH-SOTA] Obsidian-style linkage storage
  graphLinks: [], 
  graphEdges: new Map(), // nodeId -> [{target, strength, type}]
  graphConfigs: {
      radiusThreshold: 0.1, // 100m (in KM)
      similarityThreshold: 0.85,
      decayHysteresis: 1.2,
      maxLinksPerNode: 5
  },
  sideApps: JSON.parse(localStorage.getItem('kuzmo_side_apps')) || [
    { icon: "📡", title: "지식 실시간 수혈", action: "Kuzmo.requestKnowledgeFill()" },
    { icon: "🧹", title: "데이터 정리", action: "Kuzmo.pruneData(1000)" },
    { icon: "⛔", title: "수집 중단", action: "Kuzmo.stopKnowledgeFill()" },
    { icon: "🚀", title: "시스템 재부팅", action: "Kuzmo.rebootSystem()" }
  ]
};

/**
 * 🚀 [SMART FACTORY] Load data from IndexedDB
 */
export async function loadStore() {
  try {
    const data = await EventDB.getAll();
    if (data && data.length > 0) {
      state.eventStore = data;
      state.eventStore.forEach(ev => state.existingIds.add(String(ev.id)));
      rebuildSpatialIndex();
      console.log(`📦 [DB] Loaded ${state.eventStore.length} items from IndexedDB. Index built.`);
    }

    // 📊 Load Graph Links (v4)
    const links = await EventDB.getAllLinks?.();
    if (links) {
        state.graphLinks = links;
        state.graphLinks.forEach(l => {
            if (!state.graphEdges.has(l.source)) state.graphEdges.set(l.source, []);
            state.graphEdges.get(l.source).push(l);
        });
        console.log(`📊 [DB] Restored ${state.graphLinks.length} graph links.`);
    }

    // 📁 Load Folders (v30.0)
    const folders = await EventDB.getAllFolders();
    if (folders && folders.length > 0) {
      state.folders = folders.sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log(`📁 [DB] Loaded ${state.folders.length} Virtual Folders.`);
    } else {
      // Create Default System Folders
      const defaultFolders = [
        { name: "📌 중요", color: "#FF4B2B", order: 1 },
        { name: "🍱 맛집", color: "#FFB000", order: 2 },
        { name: "✈️ 여행", color: "#00E5FF", order: 3 }
      ];
      for (const f of defaultFolders) {
        await EventDB.putFolder(f);
      }
      state.folders = await EventDB.getAllFolders();
      console.log(`📁 [DB] Initialized ${state.folders.length} Default Folders.`);
    }
  } catch (err) {
    console.error("❌ [DB LOAD ERROR]", err);
  }
}

let saveTimeout = null;
let lastSaveTime = 0;

export function saveToDB(force = false, modifiedId = null) {
  const now = Date.now();
  const COOLDOWN = 2000; // 2초 쿨다운

  // 🚀 [PERF] 실시간 수혈 중 과도한 I/O 방지를 위한 쓰로틀링
  if (!force && (now - lastSaveTime < COOLDOWN)) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveToDB(true, modifiedId), COOLDOWN);
    return;
  }

  lastSaveTime = now;
  if (saveTimeout) clearTimeout(saveTimeout);

  try {
    // 🚀 [KZM-STABILITY] 전체 삭제(clear) 대신 putMany로 안전하게 덮어쓰기 (v26.8)
    import('./services/kzm.ts').then(async ({ buildSlimRecord }) => {
        // 비정상적인 데이터(ID 미비 등) 유입 차단
        const validStore = state.eventStore.filter(ev => ev && ev.id);
        const slimRecords = await Promise.all(validStore.map(ev => buildSlimRecord(ev)));
        
        // 데이터가 있는데 DB를 날리는 불상사 방지 (안전 장치)
        if (slimRecords.length > 0) {
            await EventDB.saveAll(slimRecords);
            console.log(`📡 [DB] Successfully synced ${slimRecords.length} records to IndexedDB.`);
        }
    });
  } catch (err) {
    console.error("❌ [DB SAVE ERROR]", err);
  }

  // ☁️ [CLOUD REAL-TIME SYNC] (v26.5)
  if (state.isLockerSynced && state.lockerFolderId) {
    if (modifiedId) {
      import('../infra/sync_engine.js').then(m => m.SyncEngine.pushChange(modifiedId));
    } else {
      // Fallback: Heavy Sync (Manifest-based)
      import('./services/auth.ts').then(m => m.syncEventsToDrive());
    }
  }
}

/**
 * 🌳 [SOTA] Rebuilds the R-Tree spatial index for O(log N) queries
 */
export function rebuildSpatialIndex() {
    if (!state.spatialIndex) state.spatialIndex = new RBush();
    state.spatialIndex.clear();
    state.eventMap.clear();
    
    const items = state.eventStore.map(ev => {
        state.eventMap.set(ev.id, ev);
        return {
            minX: ev.lng,
            minY: ev.lat,
            maxX: ev.lng,
            maxY: ev.lat,
            id: ev.id
        };
    });
    
    state.spatialIndex.load(items);
}

