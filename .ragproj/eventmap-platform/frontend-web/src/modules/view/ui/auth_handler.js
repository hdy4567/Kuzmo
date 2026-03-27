import { showToast } from './ui_base.js';
import { state } from '../../core/state.js';

/**
 * 🔒 Auth UI Handler
 * UI-specific updates related to Authentication and Cloud Sync.
 */

export const AuthUIHandler = {
    /**
     * 🚀 [UI-SYNC] 로그인 성공 시 UI 전환
     */
    onLoginSuccess: async () => {
        showToast("Google Drive 연동 성공", "success");
        
        const unsynced = document.getElementById('locker-unsynced');
        const folderPicker = document.getElementById('locker-folder-picker');
        const syncedContent = document.getElementById('locker-synced-content');
        
        if (unsynced) unsynced.style.display = 'none';
        
        if (state.lockerFolderId) {
            if (folderPicker) folderPicker.style.display = 'none';
            if (syncedContent) syncedContent.style.display = 'flex';
            
            const { updateLockerStatus, renderLockerSlots } = await import('./ui_locker.js');
            updateLockerStatus();
            renderLockerSlots();
        } else {
            if (folderPicker) folderPicker.style.display = 'flex';
            if (syncedContent) syncedContent.style.display = 'none';
            
            const { refreshFolderList } = await import('./ui_locker.js');
            refreshFolderList();
        }
    },

    /**
     * ☁️ [RESTORE-UPDATE] 데이터 복구 현황 UI 반영
     */
    onRestoreProgress: (count) => {
        if (count > 0) {
            showToast(`${count}건의 추억을 클라우드에서 안전하게 소환했습니다.`, "success");
            
            // 뱃지 및 보관함 갱신
            const badge = document.getElementById('total-count-badge');
            if (badge) badge.innerText = state.eventStore.length;
            
            const countEl = document.getElementById('local-db-count');
            if (countEl) countEl.innerText = state.eventStore.length;
        }
    },

    /**
     * 📂 [FOLDER-AUTO-UI] 아카이브 폴더 생성 결과 보고
     */
    onArchiveFolderCreated: (name, id, isNew = false) => {
        const msg = isNew ? `새로운 '${name}' 폴더를 생성했습니다.` : `기존 '${name}' 폴더를 발견하여 연동합니다.`;
        showToast(msg, isNew ? "success" : "info");
    },

    /**
     * ⚠️ [ERROR-UI] 에러 발생 시 토스트 처리
     */
    onError: (msg) => {
        showToast(msg, "error");
    },

    /**
     * ℹ️ [INFO-UI] 정보 알림 처리
     */
    onInfo: (msg) => {
        showToast(msg, "info");
    }
};
