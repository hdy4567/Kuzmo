import { state, saveToDB } from '../core/state.js';
import { showToast } from '../view/ui/ui_base.js';

/**
 * 💼 Locker Business Logic Service
 * Clean Architecture approach: Decouple UI events from business logic.
 */

export async function handleKzmImport(files) {
    const { unpackKzm } = await import('../core/services/kzm.ts');
    let successCount = 0;
    let skippedCount = 0;

    for (const file of files) {
        try {
            const ev = await unpackKzm(file);
            if (ev) {
                // 📍 [LOC-CENTER] Fallback to map center if coordinates are missing
                if (!ev.lat || !ev.lng) {
                    const center = state.map.getCenter();
                    ev.lat = ev.lat || center.lat;
                    ev.lng = ev.lng || center.lng;
                }
                
                if (!state.existingIds.has(String(ev.id))) {
                    state.eventStore.unshift(ev);
                    state.existingIds.add(String(ev.id));
                    successCount++;
                    state.lastActiveEventId = ev.id;
                } else {
                    skippedCount++;
                }
            }
        } catch (err) { 
            console.error("Unpack Error:", err); 
        }
    }

    if (successCount > 0) {
        saveToDB(true);
        localStorage.setItem('last_active_event_id', state.lastActiveEventId);
        showToast(`${successCount}개 항목 가져오기 완료!`, "success");
        return true;
    } else if (skippedCount > 0) {
        showToast(`이미 존재하거나 잘못된 파일입니다. (${skippedCount}개 제외)`, "warning");
    }
    return false;
}

export async function syncCloudAndLocal() {
    try {
        const { loadEventsFromDrive, syncEventsToDrive } = await import('../core/services/auth.ts');
        
        // 1. [PULL] Google Drive -> IndexedDB
        await loadEventsFromDrive();
        
        // 2. [PUSH] IndexedDB -> Google Drive
        await syncEventsToDrive();
        
        showToast(`✅ 전 기기 클라우드 동기화 완료`, 'success');
        return true;
    } catch (err) {
        console.error('[SYNC-ALL]', err);
        showToast('동기화 중 오류 발생', 'error');
        return false;
    }
}

export async function connectLocalFolder() {
    // 🧪 Check C# Bridge status
    let bridgeActive = false;
    try {
        const resp = await fetch('http://localhost:9091/api/sync/status', { method: 'GET', mode: 'cors' });
        if (resp.ok) bridgeActive = true;
    } catch (e) {}

    if (bridgeActive) {
        fetch('http://localhost:9091/api/sync/open-folder', { method: 'POST', mode: 'cors' }).catch(() => {});
    } else {
        showToast("ℹ️ 브릿지 서버(C#)가 꺼져 있어 탐색기를 직접 열 수 없습니다.", "warning");
    }

    try {
        const { EventDB } = await import('../core/db.js');
        let handle = await EventDB.getHandle('last_export_dir');
        
        // Verify handle
        try {
            if (handle) {
                const perm = await handle.queryPermission({ mode: 'read' });
                if (perm !== 'granted') {
                    const newPerm = await handle.requestPermission({ mode: 'read' });
                    if (newPerm !== 'granted') handle = null; 
                }
            }
        } catch (e) {
            handle = null;
        }

        if (!handle) {
            showToast("로컬 보관용 폴더를 선택해 주세요.", "info");
            handle = await window.showDirectoryPicker();
            await EventDB.setHandle('last_export_dir', handle);
        }

        if (handle) {
            showToast(`✅ 로컬 폴더 연동됨: "${handle.name}"`, "info");
            
            let filesToProcess = [];
            for await (const entry of handle.values()) {
                if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.kzm')) {
                    filesToProcess.push(await entry.getFile());
                }
            }

            if (filesToProcess.length > 0) {
                await handleKzmImport(filesToProcess);
                return true;
            } else {
                showToast(`ℹ️ "${handle.name}" 폴더 내에 읽어올 파일이 없습니다.`, "info");
            }
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            showToast(`로컬 폴더를 다시 지정해 주세요.`, "warning");
            import('../core/db.js').then(m => m.EventDB.setHandle('last_export_dir', null));
        }
    }
    return false;
}
