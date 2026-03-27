export namespace Kzm {
  export type Guid = string;
  export type SyncState = 'DIRTY' | 'SYNCED' | 'PUSHING';
  export type MediaCategory = 'IMAGE' | 'VOICE' | 'DOC' | 'SCAN' | 'MEMO';
  export interface Coord { lat: number; lng: number; }
  
  export interface Record {
    id: Guid; 
    title: string; 
    coord: Coord; 
    region: string; 
    tags: string[];
    createdAt: number; 
    category: MediaCategory; 
    syncStatus: SyncState;
    content: string; 
    snippet: string;
    // 🎨 Multi-modal Assets
    mediaUrl?: string;
    mediaType?: MediaCategory;
    mediaItems?: { type: MediaCategory, url: string }[];
    // 🧠 Intelligence Metadata
    adjacencies?: Guid[];
    vector?: number[]; 
    score?: number; // Runtime score for Ranking
  }

  export type RelationType = 'GEO' | 'SEMANTIC' | 'PART_OF' | 'TEMPORAL';
  
  export interface Edge { 
    id: Guid; 
    source: Guid; 
    target: Guid; 
    weight: number; 
    type: RelationType;
    bondStrength?: number; // 0.0 to 1.0 (for Visual Decay)
  }

  export interface KnowledgeGraph { nodes: Record[]; edges: Edge[]; }
  
  export interface SyncTransaction { 
    id: Guid; 
    op: 'CREATE' | 'UPDATE' | 'DELETE'; 
    table: 'RECORDS' | 'FOLDERS' | 'LINKS'; 
    payload: any; 
    timestamp: number; 
    attempts: number; 
  }

  // 💎 Multi-Tier Scorer Set
  export type ScorerType = 'SEARCH' | 'MAP' | 'AI' | 'GRAPH';
}
