import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { BLESSED_LIST, KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';
import { $middleware } from './kzm_middleware_kuzmo';
import { KzmOrchestraMonitor } from '@modules/kernel/logic/kzm_orchestra_monitor';
import { KzmMapEngine } from '@modules/map/kzm_map_engine';
import { KzmTopFilterRenderer } from '@modules/filter/kzm_top_filter_renderer';
import { KzmNavigator } from '@modules/view-capsual-nav/kzm_navigator';
import { KzmMemoryCreator } from '@modules/map/memo_creator/kzm_memory_creator';
import { KzmArchiveKuzmo } from '@modules/archive/kzm_archive_kuzmo';
import { KzmDetailSheet } from '@modules/archive/components/kzm_detail_sheet';
import { KzmActionBar } from '@modules/action/kzm_action_bar';
import { KzmSideDock } from '@modules/dock/kzm_side_dock';
import { KzmBrainGovernor } from '@modules/kernel/intelligence/kzm_brain_governor';
import { $clipboardEngine } from '@modules/memo/logic/kzm_clipboard_engine';
import { KzmMemoCanvas } from '@modules/memo/ui/kzm_memo_canvas';

/**
 * 🛰️ KzmUIOrchestrator (v11.0 - Aliased Core Sovereignty)
 * ========================================================
 * Role: Platform Bootstrapper & Lifecycle Controller.
 * Pattern: SBO - Orchestrator with Absolute Path Aliases.
 */
export class KzmUIOrchestrator {
  private static instance: KzmUIOrchestrator;
  private root: HTMLElement | null = null;
  private allModules: KzmModule[] = [];
  private currentMode: 'MAP' | 'ARCHIVE' = 'MAP';

  // Core Modules (Sovereign instances)
  private orchestraMonitor = new KzmOrchestraMonitor();
  private topFilter = new KzmTopFilterRenderer();
  private navigator = new KzmNavigator();
  private memoryCreator = new KzmMemoryCreator();
  private archiveMain = new KzmArchiveKuzmo();
  private detailSheet = new KzmDetailSheet();
  private actionBar = new KzmActionBar();
  private sideDock = new KzmSideDock();
  private aiAssistant = KzmBrainGovernor.get();

  private constructor() { }

  public static get(): KzmUIOrchestrator {
    if (!KzmUIOrchestrator.instance) KzmUIOrchestrator.instance = new KzmUIOrchestrator();
    return KzmUIOrchestrator.instance;
  }

  private currentGestureOwner: string | null = null;

  public boot(target: HTMLElement): void {
    this.root = target;
    $log.log('INFO', 'ORCHESTRATOR', 'Initiating Kuzmo Boot Sequence...');

    // 📋 Enable Kuzmo Clipboard Engine & Middleware
    $clipboardEngine;
    $middleware;

    this.authorizeModules();
    this.mountModules();
    this.auditSystem();

    // 🧪 [STRESS-TEST] Only run manually via console if needed
    // this.runParityLoadTest(); 

    this.bindGlobalInputs();
    this.initHistoryLink();
  }

  private initHistoryLink(): void {
    window.addEventListener('popstate', (e) => {
      if (e.state?.mode) {
        this.switchMode(e.state.mode, false); // Don't push state again on pop
      } else {
        this.switchMode('MAP', false);
      }
    });
  }

  private async runParityLoadTest(): Promise<void> {
    const { $packetKuzmo } = await import('@modules/memo/db/kzm_packet_kuzmo');
    $log.log('INFO', 'TEST', 'Starting Parity Load Test: Generating 100 Packets...');

    const startLat = 37.5665;
    const startLng = 126.9780;

    for (let i = 0; i < 100; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      await $packetKuzmo.savePacket({
        id: `TEST_PAC_${Date.now()}_${i}`,
        title: `Unique Memory [Row:${row} Col:${col}]`,
        content: `Validated parity buffer ${i}.`,
        geoCoord: {
          geoLat: startLat + (row * 0.007), // 🚀 Increased spacing 
          geoLng: startLng + (col * 0.007)
        },
        tags: ['STRESS_MODE', `ROW_${row}`, `COL_${col}`],
        category: 'MEMO'
      });
    }

    $log.log('INFO', 'TEST', '100 Packets Generated. Check Parity Counter in Archive.');
  }

  private bindGlobalInputs(): void {
    if (!this.root) return;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.currentMode === 'ARCHIVE') {
          this.switchMode('MAP');
          $log.log('INFO', 'ORCHESTRATOR', 'ESC: Exiting Archive Fragment.');
        } else {
          $broker.emit('UI_GLOBAL_DISMISS', null);
        }
      }
    });

    /**
     * 🛡️ [GESTURE-SOVEREIGNTY] Pulse Engine
     * Responsibility: Prevent cross-module event pollution by assigning one owner per gesture.
     */
    this.root.addEventListener('pointerdown', (e) => {
      const path = e.composedPath() as HTMLElement[];
      const targetModule = path.find(el => el.id && this.allModules.some(m => m.id === el.id));

      if (targetModule) {
        this.currentGestureOwner = targetModule.id;
        $broker.emit('GESTURE_SOVEREIGNTY_ACQUIRED', { ownerId: this.currentGestureOwner, originalEvent: e });
        $log.log('INFO', 'ORCHESTRATOR', `Gesture Sovereignty Acquired by: ${this.currentGestureOwner}`);
      }
    }, { capture: true });

    window.addEventListener('pointerup', () => {
      if (this.currentGestureOwner) {
        $broker.emit('GESTURE_SOVEREIGNTY_RELEASED', { ownerId: this.currentGestureOwner });
        this.currentGestureOwner = null;
      }
    });
  }

  private authorizeModules(): void {
    const modulesToPermit = [
      'map-canvas-root', 'top-filter-shelf', 'island-navigator',
      'ai-assistant-v1', 'kuzmo-archive', 'memory-creator-v1',
      'orchestra-monitor', 'kzm-action-bar-v3', 'kzm-side-dock',
      'kzm-detail-sheet', 'intelligence-core'
    ];
    modulesToPermit.forEach(id => $broker.permit(id));
  }

  private mountModules(): void {
    if (!this.root) return;

    this.allModules = [
      KzmMapEngine.get() as any,
      this.topFilter,
      this.navigator,
      this.memoryCreator,
      this.archiveMain,
      this.detailSheet,
      this.actionBar,
      this.orchestraMonitor,
      this.sideDock,
      this.aiAssistant
    ];

    this.allModules.forEach(mod => {
      try {
        mod.mount(this.root!);
        $log.log('INFO', 'ORCHESTRATOR', `Module Mounted: ${mod.id}`);

        // 🚀 [VISIBILITY-LOCK] Force show essential UI layers
        const coreIds = ['map-canvas-root', 'island-navigator', 'kzm-side-dock', 'top-filter-shelf'];
        if (coreIds.includes(mod.id)) {
          $log.log('INFO', 'ORCHESTRATOR', `Triggering Auto-Show for ${mod.id}`);
          if ((mod as any).show) (mod as any).show();
        }
      } catch (e) {
        $log.log('FATAL', 'ORCHESTRATOR', `Mount Failure: ${mod.id}`, { error: e });
      }
    });

    // 🚔 [UI-POLICE] Hard-sync Map visibility & System Audit
    setTimeout(() => {
      KzmMapEngine.get().show();
      this.runAddressInspector();
      $log.log('INFO', 'ORCHESTRATOR', 'Visibility Sync Sequence Complete.');
    }, 500);

    // 🚔 [UI-POLICE] Resolve Layer Conflicts dynamically
    $broker.on('UI_LAYER_REORDER', (data: any) => {
      const navigator = document.getElementById('island-navigator');
      if (!navigator) return;

      if (data.id === 'kuzmo-archive' && (data.state === 'PEEK' || data.state === 'FULL')) {
        this.currentMode = 'ARCHIVE';
        navigator.classList.add('kzm-pushed');
      } else {
        this.currentMode = 'MAP';
        navigator.classList.remove('kzm-pushed');
      }
    });

    $broker.on('UI_MODE_CHANGE', (mode: any) => this.switchMode(mode));
  }

  private switchMode(mode: 'MAP' | 'ARCHIVE', pushState = true): void {
    if (this.currentMode === mode) return;

    this.currentMode = mode;
    $broker.emit('UI_MODE_CHANGE', mode);
    $log.log('INFO', 'ORCHESTRATOR', `Mode Switched: ${mode}`);

    if (pushState) {
      window.history.pushState({ mode }, `Kuzmo - ${mode}`, `#${mode.toLowerCase()}`);
    }

    // 🚔 [VISIBILITY-SYNC] Explicit recovery for Core Engines
    if (mode === 'MAP') {
      KzmMapEngine.get().show();
      this.archiveMain.hide();
      // 📡 [DOM-ALIVE] Force Leaflet to recalculate viewport
      setTimeout(() => KzmMapEngine.get().invalidateSize(), 100);
    } else {
      KzmMapEngine.get().hide();
      this.archiveMain.open(true);
    }
  }

  /**
   * 🔍 [INSPECTOR-PROTOCOL] Track UI Addresses & Visibility in one go
   */
  private runAddressInspector(): void {
    console.group('%c 🛰️ KUZMO SOVEREIGN UI INSPECTOR ', 'background: #7D5536; color: #fff; padding: 4px; border-radius: 4px;');
    this.allModules.forEach(mod => {
      const el = document.getElementById(mod.id);
      const status = el ? (el.classList.contains('hidden') ? '🔴 HIDDEN' : '🟢 VISIBLE') : '❌ NOT_FOUND';
      const zIndex = el ? window.getComputedStyle(el).zIndex : 'N/A';
      console.log(`[${mod.id}] Address: ${status} | Z-Index: ${zIndex}`);
    });
    console.groupEnd();
  }

  private auditSystem(): void {
    const ghosts = $broker.detectGhosts(this.root!);
    if (ghosts.length > 0) {
      $log.log('WARN', 'ORCHESTRATOR', `Ghost Detection Audit Failed: ${ghosts.length} nodes found.`);
      ghosts.forEach(g => g.el.remove());
    }
  }
}

export const $ui = KzmUIOrchestrator.get();
