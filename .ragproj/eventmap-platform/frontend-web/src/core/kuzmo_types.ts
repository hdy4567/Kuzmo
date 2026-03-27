/**
 * 🏷️ Kuzmo Core Types (v31.0)
 * ===========================
 * Centralized type definitions for the Premium Refactoring.
 */

export type SyncStatus = 'dirty' | 'synced' | 'pending';
export type KuzmoEventType = 'pin' | 'tourist' | 'memory' | 'image' | 'document' | 'audio';
export type PerfMode = 'ULTRA' | 'STABLE' | 'LOW_POWER' | 'CRITICAL';

/**
 * 📦 KzmEvent (Slim Record)
 * Minimum information required for map markers and list views.
 */
export interface KzmEvent {
    id: string;
    title: string;
    lat: number;
    lng: number;
    region: string;
    tags: string[];
    timestamp: number;
    snippet?: string;
    thumbnailBlob?: string; // Base64 or Blob URL
    packetDriveId?: string; // GDrive reference
    localKzmPath?: string;  // Local FS reference
    type: KuzmoEventType;
    sync_status: SyncStatus;
}

/**
 * 📁 Virtual Folder
 * Hierarchical categorization for event cards.
 */
export interface KzmFolder {
    id: string;
    name: string;
    color: string;
    order: number;
    parentId?: string;
    icon?: string;
}

/**
 * 📊 Graph Link
 * Obsidian-style link between two events.
 */
export interface KzmLink {
    id: string;
    source: string; // Event ID
    target: string; // Event ID
    strength: number; // 0.0 to 1.0
    type: 'spatial' | 'semantic' | 'manual';
    label?: string;
}

/**
 * 🧠 AI Brain Model
 * Weights and keywords for regional/tag prioritization.
 */
export interface KzmBrainNode {
    keywords: string[];
    weight: number;
}

export interface KzmBrain {
    [key: string]: KzmBrainNode;
}

/**
 * 🌐 Application State
 * Reactive state for the entire platform.
 */
export interface KzmState {
    eventStore: KzmEvent[];
    eventMap: Map<string, KzmEvent>;
    existingIds: Set<string>;
    folders: KzmFolder[];
    graphLinks: KzmLink[];
    
    currentCountry: string;
    currentSubFilter: string;
    currentFolderId: string;
    
    isAiActive: boolean;
    isAiInitialized: boolean;
    autoLabelingEnabled: boolean;
    
    isLockerSynced: boolean;
    lockerFolderId?: string;
    lockerFolderName?: string;
    
    theme: 'dark' | 'light';
    perfMode: PerfMode;
    currentFPS: number;
}

export interface KzmConfig {
    apiKey: string;
    clientId: string;
    discoveryDocs: string[];
    scopes: string;
    appId: string;
}
