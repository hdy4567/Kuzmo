import { state, saveToDB } from '../core/state.js';
import { updateSelectionBar, showToast } from '../view/ui/ui_base.js';
import { filterMarkers } from './search.js';
import { syncToLocalFilesystem } from '../core/utils.js';
import { VisualizerCenter } from '../view/map/visualizer_center.js';


/**
 * 🎯 Selection & Batch Action Service (v25.0)
 * 팩트체크: 본 아키텍처는 전담 서버 없이 [IndexedDB <-> Google Drive] 간 직접 통신으로 작동합니다.
 */
export function setupSelectionLogic() {
    // 🚩 [MOD-SHIT-KILL] 기본 쉬프트 박스줌 로직 제거
    if (state.map.boxZoom) state.map.boxZoom.disable();
    VisualizerCenter.init();


    // ⌨️ [ESC-CANCEL] ESC 키 입력 또는 탭 전환 시 모든 선택/드래그 취소
    const handleCancel = (e) => {
        if (e.type === 'keydown' && e.key !== 'Escape') return;
        cancelSelection();
    };
    window.addEventListener('keydown', handleCancel);
    window.addEventListener('blur', handleCancel); // 탭 전환 시 드래그 박스 박제 방지
    document.addEventListener('visibilitychange', () => { if (document.hidden) handleCancel({}); });

    state.map.on('mousedown', (e) => {
        if (!e.originalEvent.altKey) return;
        document.body.classList.add('is-selecting'); // 🚫 글자 긁힘 방지
        state.isSelecting = true;
        state.selectionStart = e.containerPoint;
        state.map.dragging.disable();
    });

    state.map.on('mousemove', (e) => {
        if (!state.isSelecting) return;
        VisualizerCenter.renderSelectionBox(state.selectionStart, e.containerPoint);
    });

    state.map.on('mouseup', (e) => {
        if (state.isSelecting) {
            document.body.classList.remove('is-selecting');
            VisualizerCenter.hideSelectionBox();
            finishSelection(e.originalEvent);
        }
    });
}


export function cancelSelection() {
    state.isSelecting = false;
    state.map.dragging.enable();
    document.body.classList.remove('is-selecting');
    VisualizerCenter.hideSelectionBox();

    state.selectedIds.clear();
    VisualizerCenter.syncSelectionUI();
    
    updateSelectionBar();
    showToast("모든 선택 및 드래그가 취소되었습니다.", "info");
}


/** 📄 [COPY-SYNC] 클립보드 복사 및 로컬 브릿지/OS 싱크 */
export async function syncSelectedEvents() {
    if (state.selectedIds.size === 0) return;

    const selectedItems = state.eventStore.filter(ev => state.selectedIds.has(String(ev.id)));
    if (selectedItems.length === 0) return;

    // 1. [KZM-BRIDGE] PC 로컬 폴더로 .kzm 파일들 내보내기 (v2.0)
    const result = await syncToLocalFilesystem(selectedItems);
    if (result) {
        showToast(`✅ ${result.count}개의 추억을 로컬/브릿지에 싱크함`, "success");
    }

    // 2. [CLIPBOARD] 텍스트 ID 목록 복사 (Legacy 지원)
    const idsText = Array.from(state.selectedIds).join(',');
    await navigator.clipboard.writeText(idsText).catch(() => {});
}

/** 🏷️ [BATCH-TAG] 태그 일괄 적용 (handlers.js의 applyBatchTags 대응) */
export async function applyBatchTags() {
    if (state.selectedIds.size === 0) return;

    const input = document.getElementById('batch-tag-input');
    const newTag = input?.value.trim();
    if (!newTag) return;

    let count = 0;
    const ids = Array.from(state.selectedIds);
    
    for (const id of ids) {
        const ev = state.eventStore.find(e => String(e.id) === String(id));
        if (ev) {
            if (!ev.tags) ev.tags = [];
            if (!ev.tags.includes(newTag)) {
                ev.tags.push(newTag);
                count++;
            }
        }
    }

    if (count > 0) {
        saveToDB();
        filterMarkers();
        showToast(`✅ ${count}개 항목에 '${newTag}' 적용 완료`, "success");
        if (input) input.value = "";
    }
}

/** 🧹 선택 해제 */
export function clearSelection() {
    state.selectedIds.clear();
    VisualizerCenter.syncSelectionUI();
    updateSelectionBar();
}


/** 🗑️ [DELETE] 개별 이벤트 삭제 */
export async function deleteEvent(id) {
    const idx = state.eventStore.findIndex(e => String(e.id) === String(id));
    if (idx === -1) return;

    state.eventStore.splice(idx, 1);
    state.existingIds.delete(String(id));
    saveToDB();

    const item = state.markers.get(id);
    if (item) {
        state.clusterGroup.removeLayer(item.marker);
        state.markers.delete(id);
    }

    const badge = document.getElementById('total-count-badge');
    if (badge) badge.innerText = state.eventStore.length;

    filterMarkers();
    
    if (document.body.classList.contains('view-locker')) {
        import('../view/ui/ui_locker.js').then(m => m.renderLockerSlots());
    }

    // [GRAPH-SYNC]
    import('../engine/graph.js').then(async m => {
        await m.auditGraphConnectivity();
        const { renderGraphLinks } = await import('../view/map/index.js');
        if (renderGraphLinks) renderGraphLinks();
    });

    showToast("항목이 삭제되었습니다.", "info");
}

/** 🗑️ [BATCH-DELETE] 선택 항목 일괄 삭제 */
export async function deleteSelectedEvents() {
    const ids = Array.from(state.selectedIds);
    if (ids.length === 0) return;

    if (!confirm(`${ids.length}개의 항목을 정말 삭제할까요?`)) return;

    for (const id of ids) {
        const idx = state.eventStore.findIndex(e => String(e.id) === String(id));
        if (idx !== -1) {
            state.eventStore.splice(idx, 1);
            state.existingIds.delete(String(id));
            
            const item = state.markers.get(id);
            if (item) {
                state.clusterGroup.removeLayer(item.marker);
                state.markers.delete(id);
            }
        }
    }

    saveToDB();
    clearSelection();
    filterMarkers();
    showToast(`✅ ${ids.length}개 항목 일괄 삭제 완료`, "success");
}

/** 🏁 선택 종료 (실제 마커 포함 여부 판별) */
export function finishSelection(nativeEvent) {
    state.isSelecting = false;
    state.map.dragging.enable();

    // 🔍 드래그 영역 내 마커 찾기
    const box = document.getElementById('selection-box');
    if (!box) return;

    const rect = box.getBoundingClientRect();

    state.markers.forEach((item, id) => {
        const markerEl = item.marker.getElement();
        if (!markerEl) return;

        const mRect = markerEl.getBoundingClientRect();
        
        // 박스 내부에 마커가 있는지 판별
        const isInside = (
            mRect.left >= rect.left &&
            mRect.right <= rect.right &&
            mRect.top >= rect.top &&
            mRect.bottom <= rect.bottom
        );

        if (isInside) {
            state.selectedIds.add(String(id));
        }
    });

    VisualizerCenter.syncSelectionUI();
    updateSelectionBar();
}


/** 📄 [BRIDGE-EXPORT] 선택 항목 내보내기 (Alias) */
export async function exportToLocalFS() {
    return await syncSelectedEvents();
}

/** 📄 [BRIDGE-SYNC-ALL] 전체 항목 싱크 */
export async function syncAllToLocalFS() {
    if (state.eventStore.length === 0) return;
    const result = await syncToLocalFilesystem(state.eventStore);
    if (result) {
        showToast(`✅ ${result.count}개의 모든 추억을 로컬/브릿지에 싱크함`, "success");
    }
}
