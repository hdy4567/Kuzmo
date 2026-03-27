import { $store } from '../store/kzm_store';
import { $map } from '../map/kzm_map_engine';
import { KzmLocker } from '../locker/ui/kzm_locker';
import { KzmDetailSheet } from '../locker/ui/kzm_detail_sheet';
import { KzmQuantumDock } from '../map/ui/kzm_quantum_dock';

// 🏗️ Feature-Centric Components
import { KzmTopPanel } from '../map/ui/kzm_top_panel';
import { KzmSideMonitor } from '../ai/ui/kzm_side_monitor';
import { KzmNavigator } from './components/kzm_navigator';
import { KzmActionBar } from '../map/ui/kzm_action_bar';
import { KzmSideDock } from './components/kzm_side_dock';
import { Kzm } from '../domain/kzm_entities';

import './kzm_ui_styles.css';

/**
 * 🎨 KzmUIOrchestrator (v4.0)
 * ========================
 * Lean Orchestrator for the Clean Architecture.
 * Manages Global Navigation, Selection Bar, and Side Panel.
 */
export class KzmUIOrchestrator {
  private static instance: KzmUIOrchestrator;
  private container: HTMLElement | null = null;

  private locker: KzmLocker = new KzmLocker();
  private detailSheet: KzmDetailSheet = new KzmDetailSheet();
  private quantumDock: KzmQuantumDock = new KzmQuantumDock();
  private topPanel: KzmTopPanel = new KzmTopPanel();
  private navigator: KzmNavigator = new KzmNavigator();
  private actionBar: KzmActionBar = new KzmActionBar();
  private sideMonitor: KzmSideMonitor = new KzmSideMonitor();
  private sideDock: KzmSideDock = new KzmSideDock();



  static get(): KzmUIOrchestrator {
    if (!KzmUIOrchestrator.instance) KzmUIOrchestrator.instance = new KzmUIOrchestrator();
    return KzmUIOrchestrator.instance;
  }

  public init(parent: HTMLElement | null): void {
    if (!parent) return;
    this.container = parent;

    // 🌊 [DYNAMIC-PLATFORM] Scale Selection
    const isWider = window.innerWidth > 1024;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isWider && !isTouch) {
      document.body.classList.add('kzm-platform-web');
      console.log("🌐 Kuzmo: WEB-PRIME (Fit Mode) Engaged.");
    } else {
      document.body.classList.add('kzm-platform-android');
      console.log("📱 Kuzmo: ANDROID-PRIME (Vibe Mode) Engaged.");
    }

    this.container.innerHTML = `<div id="kuzmo-dashboard" class="dashboard-root"></div>`;
    const dash = document.getElementById('kuzmo-dashboard')!;

    const mapContainer = document.createElement('div');
    mapContainer.id = 'map-container';
    dash.appendChild(mapContainer);

    // 🗺️ Map Engine Init
    $map.init('map-container');

    // 🏗️ Core Module Mounting
    this.topPanel.mount(dash);
    this.actionBar.mount(dash);
    this.sideMonitor.mount(dash);
    this.locker.mount(dash);
    this.detailSheet.mount(dash);
    this.quantumDock.mount(dash);
    this.sideDock.mount(dash);
    this.navigator.mount(dash, (mode: string) => this.handleModeChange(mode));

    this.setupGlobalEvents();
    console.log("🚀 Dashboard UI Bootstrap - SUCCESS.");
  }

  private handleModeChange(mode: string): void {
    if (mode === 'LOCKER') {
      this.locker.open('FULL');
      this.clearStellarEffects();
    } else if (mode === 'MAP') {
      this.locker.close();
    }
  }

  /**
   * 🌌 [STELLAR-EDGE] Highlight Constellation by Tag
   */
  public highlightTagLinkage(tag: string | null): void {
    const dash = document.getElementById('kuzmo-dashboard');
    if (!dash) return;

    if (!tag || tag === 'ALL') {
      this.clearStellarEffects();
      return;
    }

    dash.classList.add('graph-dimmed');
    
    // Highlight relevant markers & edges
    const records = $store.records;
    const targetNodes = records.filter(r => r.tags.includes(tag));
    
    records.forEach(r => {
      const el = $map.getMarkerElement(r.id);
      if (el) {
        if (r.tags.includes(tag)) el.classList.add('highlighted');
        else el.classList.remove('highlighted');
      }
    });

    // 🌌 [ACTION] Draw the Stellar-Edge Constellation
    $map.drawConstellation(targetNodes);

    console.log(`🌌 Stellar-Edge engaged for tag: ${tag}`);
  }

  private clearStellarEffects(): void {
    const dash = document.getElementById('kuzmo-dashboard');
    if (dash) dash.classList.remove('graph-dimmed');
    
    $store.records.forEach(r => {
       const el = $map.getMarkerElement(r.id);
       if (el) el.classList.remove('highlighted');
    });

    $map.drawConstellation([]); // Clear constellation lines
  }


  private setupGlobalEvents(): void {
    window.addEventListener('kzm-view-detail', (e: any) => {
      const id = e.detail.id;
      const record = $store.records.find(r => r.id === id);
      if (record) this.detailSheet.open(record);
    });

    window.addEventListener('kzm-locker-state', (e: any) => {
      const state = e.detail.state;
      if (state === 'HIDDEN') this.navigator.setMode('MAP');
      else if (state === 'FULL' || state === 'PEEK') this.navigator.setMode('LOCKER');
    });

    $store.subscribe((event: string) => {
      if (event === 'SYNC_STARTED') this.showGlobalSync(true);
      else if (event === 'SYNC_COMPLETED') this.showGlobalSync(false);
      this.updateActivityMonitor();
    });
  }

  private showGlobalSync(active: boolean): void {
    const bar = document.getElementById('sync-progress-bar');
    if (bar) bar.style.display = active ? 'block' : 'none';
  }

  private updateActivityMonitor(): void {
    const monitor = document.getElementById('monitor-panel');
    if (monitor) {
      this.sideMonitor.ping();
    }
  }

  public getSelectedRecords(): Kzm.Record[] {
    return Array.from($store.selectedIds)
      .map(id => $store.records.find(r => r.id === id))
      .filter((r): r is Kzm.Record => !!r);
  }
}

export const $ui = KzmUIOrchestrator.get();
