import './style.css';
import { KzmIndexedDB } from './modules/persistence/kzm_indexeddb';
import { $store } from './modules/store/kzm_store';
import { $ui } from './modules/ui/kzm_ui_orchestrator';
import { $sync } from './modules/sync/kzm_sync_engine';

/**
 * 🚀 Kzm Bootstrap (v4.0)
 * ===========================
 * Orchestrating the Clean Start.
 */
async function bootstrap() {
    console.log("🎬 Kuzmo Platform - Clean Architecture v4.0 started...");
    try {
        const records = await KzmIndexedDB.getAllRecords();
        $store.bulkUpdate(records);
        await $sync.initSync();
        const appElement = document.querySelector<HTMLElement>('#app');
        $ui.init(appElement);
        console.log("✅ Kzm Core Engine fully operational.");
    } catch (err) {
        console.error("❌ Critical Failure:", err);
    }
}

bootstrap();
