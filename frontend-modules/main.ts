import './modules/ui/kzm_ui_styles.css';
import { $broker } from "@modules/kernel/logic/kzm_shell_broker";
import { $ui } from "@modules/kernel/logic/kzm_ui_orchestrator";

/**
 * 🛰️ Kuzmo Main Strategy (v9.0 - SBO Sovereign Boot)
 * ========================================================
 * Role: Platform initialization with Aliased Sovereignty.
 */
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('kzm-root');
    if (!root) {
        console.error("[FATAL] Sovereign Mount Point #kzm-root not found.");
        return;
    }

    console.log("[MAIN] SBO Core Engine Initialized. Booting UI...");
    $ui.boot(root);

    setTimeout(() => {
        if ($broker.generateHealthReport) $broker.generateHealthReport();
    }, 3000);
});
