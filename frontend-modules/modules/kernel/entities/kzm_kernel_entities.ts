/**
 * 🏛️ KzmKernelEntities (v11.5 - Sovereign Integrity Unified)
 * ========================================================
 * Patterns: SBO (Shell-Broker-Orchestrator) Core Contracts.
 * Role: Unified Source of Truth for the Kernel Layer.
 */

// 🛡️ [LIST] Authorized Module IDs
export const BLESSED_LIST = [
  'map-canvas-root', 
  'top-filter-shelf', 
  'island-navigator', 
  'ai-assistant-v1', 
  'kuzmo-archive', 
  'memory-creator-v1', 
  'orchestra-monitor', 
  'kzm-action-bar-v3',
  'kzm-side-dock',
  'kzm-detail-sheet',
  'intelligence-core',
  'kzm-memo-canvas-v1'
] as const;

export type BlessedId = typeof BLESSED_LIST[number];
export type KzmLayer = 'MAP' | 'CANVAS' | 'SIDE_PANEL' | 'DOCK' | 'TOP_NAV' | 'NAVBAR' | 'MODAL' | 'HI_MODAL' | 'TOAST';

/**
 * 🛡️ [INTERFACE] KzmModule
 */
export interface KzmModule {
  id: string;
  isSyncMode: boolean;
  isVisible: boolean;
  mount(parent: HTMLElement): void;
  show(): void;
  hide(): void;
  unmount?(): void;
  open?(...args: any[]): void;
  close?(): void;
}

/**
 * 🛰️ [INTERFACE] UIRegistryItem
 */
export interface UIRegistryItem {
  id: BlessedId;
  type: KzmLayer;
  el: HTMLElement;
  styleDoc?: string;
  zFinal: number;
  isPermitted: boolean;
  visualHealth: 'PENDING' | 'SUCCESS' | 'FAILED';
}

/**
 * 🛑 [EXCEPTION] Sovereign Custom Exceptions
 */
export class DatabaseException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseException';
  }
}
