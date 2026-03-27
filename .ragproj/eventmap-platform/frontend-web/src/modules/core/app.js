import { state, saveToDB, loadStore } from './state.js';
import { initMap } from '../view/map/index.js';
import { setupSelectionLogic } from '../features/selector.js';
import { requestKnowledgeFill } from '../engine/ai.js';
import { showToast, renderSubTabs, toggleAiChat, setupFilterHandlers, renderSideApps, addSideAppPrompt, switchMode } from '../view/ui/ui_base.js';
import { showDetailSheet, addNewTagPrompt, removeTag, setupQuickNoteHandlers, openQuickNote } from '../view/ui/ui_sheet.js';
import { renderLockerSlots, setupLockerHandlers, resizeGridItem, refreshFolderList } from '../view/ui/ui_locker.js';
import { updateMonitorVitals, filterMonitor } from '../view/ui/ui_monitor.js';
import { initWorker } from '../infra/worker_bridge.js';
import { initGoogleAuth, handleAuthClick, createArchiveFolderAuto } from './services/auth.ts';
import { setupEventListeners, resetAllInteractions } from '../view/ui/handlers.js';
import { switchCountry, setSubFilter, filterByTag } from '../features/navigation.js';
import { perfGuardian } from '../engine/performance_guardian.js';

export async function startApp() {
    console.log("🎬 Booting Intelligent Map Engine...");


    try {
        // [SMART FACTORY] Load DB first
        await loadStore();

        // 1.5 [RESTORE] Cloud & Local FS Handle Restore
        if (state.isLockerSynced) {
            import('./services/auth.ts').then(m => m.initGoogleAuth());
        }

        // 0. Global API Exposure (Sync first!)
        exposeGlobals();

        // 0.5 [EMERGENCY PRUNE] 기하급수적으로 불어난 데이터 강제 다이어트 (v11.5)
        if (state.eventStore.length > 5000) {
            console.warn(`[EMERGENCY] Oversized DB (${state.eventStore.length}). Pruning based on regional capacity...`);
            import('../engine/ai.js').then(m => m.pruneData(1000));
        }

        // 1. Initialize Core Services
        initMap();
        await initGoogleAuth();


        // 1.2 AI 셀프 힐링 가동 (과거 데이터 자동 라벨링)
        // (Initial repair logic handled by ensureAiInitialized on first use)


        // 1.5 Cloud Restore (이미 연동된 경우 자동 복구)
        if (state.isLockerSynced && state.lockerFolderId) {
            import('./services/auth.ts').then(m => m.loadEventsFromDrive());
        }

        // 🚪 [AUTO-SYNC-EXIT] 웹 종료 또는 앱 백그라운드 전환 시 자동 싱크 트리거 (v25.0)
        const onExitAutoSync = () => {
            if (state.isLockerSynced && state.lockerFolderId) {
                import('./services/auth.ts').then(m => m.syncEventsToDrive());
            }
        };
        window.addEventListener('pagehide', () => {
            onExitAutoSync();
            perfGuardian.stop(); // 🔋 Battery save on background
        });
        if (window.Capacitor && window.Capacitor.Plugins.App) {
            window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
                if (!isActive) {
                    onExitAutoSync();
                    perfGuardian.stop();
                } else {
                    perfGuardian.start();
                }
            });
        }

        // 2. Setup Logic & Handlers
        setupSelectionLogic();
        setupEventListeners();
        perfGuardian.start();

        // 3. Initial Rendering
        renderSubTabs();
        renderLockerSlots();
        renderSideApps();
        setupLockerHandlers();
        setupQuickNoteHandlers();
        setupFilterHandlers();

        // 4. Update UI Badge
        const badge = document.getElementById('total-count-badge');
        if (badge) {
            badge.innerText = state.eventStore.length;
            updateMonitorVitals();
        }

        // 5. Auto-open AI Chat on Startup
        setTimeout(() => toggleAiChat(true), 1500);

        // 6. Termination Handler (Lifecycle)
        window.addEventListener('beforeunload', () => {
            console.log("🔌 Terminating AI Services before exit...");
            import('../engine/ai.js').then(m => m.terminateAiBridge());
            import('../infra/worker_bridge.js').then(m => m.terminateWorker());
        });

        showToast("시스템 복구 및 모듈화 완료", "success");
    } catch (err) {
        console.error("Critical Failure in startApp:", err);
        throw err; // Re-throw to main.js handler
    }
}

function exposeGlobals() {
    window.Kuzmo = Object.assign(window.Kuzmo || {}, {
        state,
        eventStore: () => state.eventStore, // Live Ref via Getter
        showToast,
        saveToDB,
        switchCountry,
        setSubFilter,
        filterByTag,
        resetAllInteractions,
        showDetailSheet,
        addNewTagPrompt,
        removeTag,
        handleAuthClick,
        requestKnowledgeFill,
        stopKnowledgeFill: () => import('../engine/ai.js').then(m => m.stopKnowledgeFill()),
        wipeRegion: (r) => import('../engine/ai.js').then(m => m.wipeRegion(r)),
        pruneData: (l) => import('../engine/ai.js').then(m => m.pruneData(l)),
        auditAllData: () => import('../engine/ai.js').then(m => m.auditAllData()),
        deepSyncAudit: () => import('./services/auth.ts').then(m => m.deepSyncAudit()),
        toggleAiChat,
        createArchiveFolderAuto,
        refreshFolderList: () => import('../view/ui/ui_locker.js').then(m => m.refreshFolderList()),
        selectLockerFolder: (name, id) => import('./services/auth.ts').then(m => m.selectLockerFolder(name, id)),
        rebootSystem: () => import('../engine/ai.js').then(m => m.rebootSystem()),
        filterMonitor: (t) => filterMonitor(t),
        switchMode: (mode) => switchMode(mode),
        resizeGridItem: (el) => resizeGridItem(el),

        exportToLocalFS: () => import('../features/selector.js').then(m => m.exportToLocalFS()),
        syncAllToLocalFS: () => import('../features/selector.js').then(m => m.syncAllToLocalFS()),

        deleteEvent: async (id) => {
            const { deleteEvent } = await import('../features/selector.js');
            if (confirm(`항목 '${id}'을 삭제할까요?`)) deleteEvent(id);
        },
        deleteSelectedEvents: () => import('../features/selector.js').then(m => m.deleteSelectedEvents()),
        clearSelection: () => import('../features/selector.js').then(m => m.clearSelection()),

        openQuickNote: () => import('../view/ui/ui_sheet.js').then(m => m.openQuickNote()),
        createMemoAtCenter: () => import('../view/ui/ui_base.js').then(m => m.createMemoAtCenter()),
        addSideAppPrompt: () => import('../view/ui/ui_base.js').then(m => m.addSideAppPrompt()),
        saveNewSideApp: () => import('../view/ui/ui_base.js').then(m => m.saveNewSideApp()),
        clusterEvents: () => import('../engine/spatial_analytics.js').then(m => m.clusterEventsSpatial()),
        deleteEventFromMonitor: (id, el) => import('../view/ui/ui_monitor.js').then(m => m.deleteEventFromMonitor(id, el))
    });

    // [LEGACY-UNIFICATION] Standardize on window.Kuzmo, keep essential globals only
    window.handleAuthClick = handleAuthClick;
    window.switchCountry = switchCountry;
    window.setSubFilter = setSubFilter;
    window.toggleAiChat = toggleAiChat;
}
