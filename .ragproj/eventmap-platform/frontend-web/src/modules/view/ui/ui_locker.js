import { state, saveToDB } from '../../core/state.js';
import { switchMode, showToast, updateSelectionBar } from './ui_base.js';
import { showDetailSheet } from './ui_sheet.js';
import { selectLockerFolder } from '../../core/services/auth.ts';
import { syncToLocalFilesystem } from '../../core/utils.js';
import { buildMarkdown } from '../core/services/kzm.ts';

export function setupLockerHandlers() {
    const storageBtn = document.getElementById('storage-btn');
    const lockerPanel = document.getElementById('locker-panel');
    const closeBtn = document.getElementById('close-locker');
    const closeUnsyncedBtn = document.getElementById('close-locker-unsynced');

    if (storageBtn) {
        storageBtn.onclick = () => {
            lockerPanel.classList.toggle('active');
            updateLockerStatus();
            if (lockerPanel.classList.contains('active')) {
                renderLockerSlots();
                // ?? [AUTO-LINK] ?°ë™ ?•ë³´ ?ˆìœ¼ë©??´ë¼?°ë“œ?ì„œ ìµœì‹  ?°ì´???ë™ ?˜í˜ˆ ?œë„
                    import('../../core/services/auth.ts').then(m => m.loadEventsFromDrive());
            }
        };
    }

    // ?“¥ [IMPORT-KZM] (v25.7 - ?¤ì¤‘ ?Œì¼ ë°??œë˜ê·¸ì•¤?œë¡­ ì§€??
    const importBtn = document.getElementById('import-kzm-btn');
    const handleFiles = async (files) => {
        const { handleKzmImport } = await import('../../features/locker_service.js');
        const success = await handleKzmImport(files);
        if (success) renderLockerSlots();
    };

    if (importBtn) {
        importBtn.onclick = async () => {
            try {
                // ?“‚ [PATH-CACHING] ?´ì „ ?‘ì—… ?´ë”?ì„œ ?œì‘ ?œë„
                const { EventDB } = await import('../../core/db.js');
                let startInHandle = await EventDB.getHandle('last_export_dir');
                
                const pickerOpts = {
                    types: [{ description: 'KZM Packet', accept: { 'application/x-kzm': ['.kzm'] } }],
                    multiple: true,
                };
                if (startInHandle) {
                    try { 
                        // ê¶Œí•œ ?•ì¸ (?„ìˆ˜)
                        if (await startInHandle.queryPermission({ mode: 'read' }) === 'granted') {
                            pickerOpts.startIn = startInHandle; 
                        }
                    } catch (_) {}
                }

                const handles = await window.showOpenFilePicker(pickerOpts);
                const files = await Promise.all(handles.map(h => h.getFile()));
                await handleFiles(files);
            } catch (err) { if (err.name !== 'AbortError') console.error("Picker Fail:", err); }
        };
    }

    // ?–ï¸?[DROP-ZONE] OS?ì„œ ë³´ê??¨ìœ¼ë¡?ë°”ë¡œ ?Œì¼ ?˜ì?ê¸?    lockerPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        lockerPanel.classList.add('drag-over');
    });
    lockerPanel.addEventListener('dragleave', () => lockerPanel.classList.remove('drag-over'));
    lockerPanel.addEventListener('drop', async (e) => {
        e.preventDefault();
        lockerPanel.classList.remove('drag-over');
        
        const droppedFiles = Array.from(e.dataTransfer.files);
        const kzmFiles = droppedFiles.filter(f => f.name.endsWith('.kzm'));
        const imgFiles = droppedFiles.filter(f => f.type.startsWith('image/'));

        if (kzmFiles.length > 0) {
            showToast(`${kzmFiles.length}ê°?ì¶”ì–µ ë­‰ì¹˜ ?…ë¡œ??ì¤?..`, "info");
            await handleFiles(kzmFiles);
        }

        if (imgFiles.length > 0) {
            showToast("?“¸ ?¬ì§„?¼ë¡œ ??ì¶”ì–µ??ë§Œë“­?ˆë‹¤.", "info");
            const { openQuickNote } = await import('./ui_sheet.js');
            // ì²?ë²ˆì§¸ ?´ë?ì§€ë¥??°ì„ ?ìœ¼ë¡??µë…¸?¸ë¡œ ?°ê²°
            openQuickNote(null, imgFiles[0]);
        }
    });

    [closeBtn, closeUnsyncedBtn].forEach(btn => {
        if (btn) btn.onclick = () => lockerPanel.classList.remove('active');
    });

    // ?“ [LOCAL-DISK-PICKER] ë¡œì»¬ ?´ë” ?°ë™ ?œë‚˜ë¦¬ì˜¤ (v25.0)
    const openLocalFolderFunc = async () => {
        const { connectLocalFolder } = await import('../../features/locker_service.js');
        const success = await connectLocalFolder();
        if (success) renderLockerSlots();
    };

    // ?š© [EVENT-DELEGATION] ? ì? ?´ë¦­ ?œìŠ¤ì²?? íš¨??? ì?
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('#open-local-folder-btn');
        if (btn) {
            e.preventDefault();
            openLocalFolderFunc();
        }
    });

    window.Kuzmo = window.Kuzmo || {};
    window.Kuzmo.openLocalFolder = openLocalFolderFunc;

    // ?¯ [ALT-DRAG] ë³´ê????¤ì¤‘ ? íƒ ë°•ìŠ¤ ë¡œì§
    const slotsContainer = document.getElementById('locker-slots');
    let isSelecting = false;
    let startPos = { x: 0, y: 0 };
    let selBox = null;

    if (slotsContainer) {
        slotsContainer.onmousedown = (e) => {
            if (!e.altKey) return;
            e.preventDefault();
            isSelecting = true;
            startPos = { x: e.clientX, y: e.clientY };
            
            selBox = document.createElement('div');
            selBox.style.position = 'fixed';
            selBox.style.border = '1px solid var(--accent-purple, #9d50ff)';
            selBox.style.background = 'rgba(157, 80, 255, 0.1)';
            selBox.style.pointerEvents = 'none';
            selBox.style.zIndex = '10000';
            document.body.appendChild(selBox);
        };

        window.addEventListener('mousemove', (e) => {
            if (!isSelecting || !selBox) return;
            const left = Math.min(startPos.x, e.clientX);
            const top = Math.min(startPos.y, e.clientY);
            const width = Math.abs(startPos.x - e.clientX);
            const height = Math.abs(startPos.y - e.clientY);
            
            selBox.style.left = left + 'px';
            selBox.style.top = top + 'px';
            selBox.style.width = width + 'px';
            selBox.style.height = height + 'px';
        });

        window.addEventListener('mouseup', (e) => {
            if (!isSelecting) return;
            isSelecting = false;
            if (!selBox) return;

            const rect = selBox.getBoundingClientRect();
            document.querySelectorAll('.locker-card').forEach(card => {
                const cRect = card.getBoundingClientRect();
                const overlap = !(rect.right < cRect.left || rect.left > cRect.right || rect.bottom < cRect.top || rect.top > cRect.bottom);
                if (overlap) {
                    const id = card.getAttribute('data-id');
                    state.selectedIds.add(String(id));
                    card.classList.add('selected');
                }
            });
            updateSelectionBar();
            selBox.remove();
            selBox = null;
        });
    }

    const syncAllBtn = document.getElementById('sync-all-kzm-btn');
    if (syncAllBtn) {
        syncAllBtn.onclick = async () => {
            if (state.eventStore.length === 0) { showToast('ë³´ê??¨ì´ ë¹„ì–´?ˆìŠµ?ˆë‹¤.', 'info'); return; }

            syncAllBtn.classList.add('sync-pulsing');
            syncAllBtn.innerHTML = '<span>??/span>';
            syncAllBtn.disabled = true;
            showToast(`?´ë¼?°ë“œ ë°?ë¡œì»¬ 2-Way ?™ê¸°???œì‘...`, 'info');

            const { syncCloudAndLocal } = await import('../../features/locker_service.js');
            const success = await syncCloudAndLocal();
            
            syncAllBtn.classList.remove('sync-pulsing');
            syncAllBtn.innerHTML = '?ï¸';
            syncAllBtn.disabled = false;
            if (success) renderLockerSlots();
        };
    }

    const refreshBtn = document.getElementById('refresh-folders-btn');
    const selectBtn = document.getElementById('select-folder-btn');
    const changeBtn = document.getElementById('change-folder-btn');
    const deckSearch = document.getElementById('deck-search');

    if (refreshBtn) refreshBtn.onclick = () => import('../../core/services/auth.ts').then(m => m.refreshFolderList());
    if (selectBtn) selectBtn.onclick = async () => {
        const activeItem = document.querySelector('.folder-item.active-selection');
        if (activeItem) {
            const name = activeItem.getAttribute('data-name');
            const id = activeItem.getAttribute('data-id');
            selectLockerFolder(name, id);
        } else {
            const { showPicker } = await import('../../core/services/auth.ts');
            showPicker();
        }
    };
    if (changeBtn) changeBtn.onclick = () => {
        state.lockerFolderName = null;
        state.lockerFolderId = null;
        updateLockerStatus();
    };
    
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    if (toggleViewBtn) {
        toggleViewBtn.onclick = () => {
            state.lockerMode = state.lockerMode === 'grid' ? 'linear' : 'grid';
            localStorage.setItem('locker_view_mode', state.lockerMode);
            renderLockerSlots(); // Re-render for new layout
        };
    }

    if (deckSearch) {
        deckSearch.oninput = (e) => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.locker-card').forEach(card => {
                const text = card.innerText.toLowerCase();
                card.style.display = text.includes(query) ? 'block' : 'none';
            });
        };
    }

    const filterChips = document.querySelectorAll('.deck-filter-chip');
    filterChips.forEach(chip => {
        chip.onclick = () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const filter = chip.getAttribute('data-filter');

            // ?—ºï¸?Sync with MAP VIEW
            if (filter === 'tourist' || filter === 'memory') {
                state.showTourist = (filter === 'tourist');
                state.showMemory = (filter === 'memory');
                const tourCk = document.getElementById('filter-tourist');
                const memoCk = document.getElementById('filter-memory');
                if (tourCk) tourCk.checked = state.showTourist;
                if (memoCk) memoCk.checked = state.showMemory;
                import('../../features/search.js').then(m => m.filterMarkers());
            } else if (filter === 'all') {
                state.showTourist = true; state.showMemory = true;
                const tourCk = document.getElementById('filter-tourist');
                const memoCk = document.getElementById('filter-memory');
                if (tourCk) { tourCk.checked = true; memoCk.checked = true; }
                import('../../features/search.js').then(m => m.filterMarkers());
            }

            document.querySelectorAll('.locker-card').forEach(card => {
                const type = card.dataset.markerType || 'unknown';
                if (filter === 'all') card.style.display = 'block';
                else if (filter === 'tourist') card.style.display = type === 'tourist' ? 'block' : 'none';
                else if (filter === 'memory') card.style.display = type === 'memory' ? 'block' : 'none';
                else if (filter === 'image') card.style.display = card.querySelector('.card-media') ? 'block' : 'none';
                else if (filter === 'pin') card.style.display = card.innerText.includes('?“Œ') ? 'block' : 'none';
                else card.style.display = 'block';
            });

            setTimeout(() => {
                document.querySelectorAll('.locker-card').forEach(c => resizeGridItem(c));
            }, 100);
        };
    });

    // ?–±ï¸?Initialize Deck Drag Selection
    setupDeckSelection();
}

/**
 * ?–±ï¸?MEMOREAL (Notes Deck) Alt+Drag Selection System
 */
function setupDeckSelection() {
    let isSelecting = false;
    let startPoint = { x: 0, y: 0 };
    const box = document.getElementById('selection-box');
    const lockerSlots = document.getElementById('locker-slots');

    if (!lockerSlots || !box) return;

    lockerSlots.addEventListener('mousedown', (e) => {
        if (e.altKey && e.button === 0) { // Alt + Left Click
            isSelecting = true;
            startPoint = { x: e.clientX, y: e.clientY };
            box.style.display = 'block';
            box.style.left = startPoint.x + 'px';
            box.style.top = startPoint.y + 'px';
            box.style.width = '0px';
            box.style.height = '0px';

            // Clear previous map/deck selection
            import('../../features/selector.js').then(m => m.clearSelection());

            e.preventDefault(); // Prevent text selection
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;
        const currentX = e.clientX;
        const currentY = e.clientY;

        const x = Math.min(startPoint.x, currentX);
        const y = Math.min(startPoint.y, currentY);
        const w = Math.abs(currentX - startPoint.x);
        const h = Math.abs(currentY - startPoint.y);

        box.style.left = x + 'px';
        box.style.top = y + 'px';
        box.style.width = w + 'px';
        box.style.height = h + 'px';
    });

    // (Redundant 'copy' listener removed - handled centrally in selector.js)

    document.addEventListener('mouseup', (e) => {
        if (!isSelecting) return;
        isSelecting = false;
        box.style.display = 'none';

        const rect = {
            left: Math.min(startPoint.x, e.clientX),
            right: Math.max(startPoint.x, e.clientX),
            top: Math.min(startPoint.y, e.clientY),
            bottom: Math.max(startPoint.y, e.clientY)
        };

        // Find cards bounding rect that overlap with selection box
        const cards = document.querySelectorAll('.locker-card');
        const selectedIds = new Set();

        cards.forEach(card => {
            const r = card.getBoundingClientRect();
            const isOverlapping = !(r.right < rect.left ||
                r.left > rect.right ||
                r.bottom < rect.top ||
                r.top > rect.bottom);
            if (isOverlapping) {
                card.classList.add('selected'); // Highlight visually using CSS class
                selectedIds.add(card.dataset.id);
            }
        });

        if (selectedIds.size > 0) {
            state.selectedIds = selectedIds; // ?? Sync update to ensure dragstart catches it
            import('../../features/selector.js').then(m => {
                m.finishSelection(e); // Trigger action bar and list update
                updateSelectionBar();
            });
        }
    });
}


export function updateLockerStatus() {
    const unsyncedView = document.getElementById('locker-unsynced');
    const pickerView = document.getElementById('locker-folder-picker');
    const syncedContent = document.getElementById('locker-synced-content');
    
    if (!unsyncedView || !syncedContent || !pickerView) return;

    // ?›¡ï¸?[STATE-LOCK] ëª¨ë“  ë·?ê°•ì œ ì´ˆê¸°??(Ghost ?´ë¦­ ë°©ì?)
    unsyncedView.style.setProperty('display', 'none', 'important');
    pickerView.style.setProperty('display', 'none', 'important');
    syncedContent.style.setProperty('display', 'none', 'important');

    if (!state.isLockerSynced) {
        unsyncedView.style.setProperty('display', 'flex', 'important');
    } else if (!state.lockerFolderId) {
        pickerView.style.setProperty('display', 'flex', 'important');
        // ?´ë” ëª©ë¡ ì¦‰ì‹œ ê°±ì‹ 
        import('../../core/services/auth.ts').then(m => m.refreshFolderList());
    } else {
        syncedContent.style.setProperty('display', 'flex', 'important');
        const titleEl = document.querySelector('.locker-title');
        if (titleEl) titleEl.innerText = state.lockerFolderName?.toUpperCase() || "MEMOREAL";
        
        // ?°ì´?°ê? ?†ìœ¼ë©?ìµœì´ˆ ë¡œë“œ ?œë„
        if (state.eventStore.length === 0) {
            import('../../core/services/auth.ts').then(m => m.loadEventsFromDrive());
        }
    }
}

/**
 * ?“‚ [CLOUD] ?œë¼?´ë¸Œ ?´ë” ëª©ë¡ ?ˆë¡œê³ ì¹¨
 */
export async function refreshFolderList() {
    const container = document.getElementById('folder-list-container');
    if (!container) return;

    container.innerHTML = '<p style="font-size: 11px; opacity: 0.5; text-align:center; padding:10px;">êµ¬ê? ?œë¼?´ë¸Œ ?´ë” ëª©ë¡ ?½ëŠ” ì¤?..</p>';

    try {
        const { fetchDriveFolders } = await import('../../core/services/auth.ts');
        const folders = await fetchDriveFolders();

        if (folders.length === 0) {
            container.innerHTML = `
               <div style="padding: 30px; text-align: center;">
                 <p style="font-size: 11px; opacity: 0.5;">ë°œê²¬???´ë”ê°€ ?†ìŠµ?ˆë‹¤.</p>
               </div>
            `;
            return;
        }

        container.innerHTML = folders.map(f => `
            <div class="folder-item" data-id="${f.id}" data-name="${f.name}" 
                 style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; margin: 4px; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent;"
                 onclick="this.parentElement.querySelectorAll('.folder-item').forEach(i=>{
                     i.style.background='transparent'; 
                     i.style.borderColor='transparent';
                     i.classList.remove('active-selection');
                 }); 
                 this.style.background='rgba(157, 80, 255, 0.1)'; 
                 this.style.borderColor='rgba(157, 80, 255, 0.3)';
                 this.classList.add('active-selection');">
                <span style="font-size: 18px;">?“</span>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 12px; font-weight: 700; color: white;">${f.name}</span>
                    <span style="font-size: 9px; opacity: 0.4;">Google Drive Folder</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Failed to refresh folder list:", err);
        container.innerHTML = '<p style="font-size: 10px; color: #ff5252; text-align:center; padding: 20px;">ëª©ë¡??ê°€?¸ì˜¤ì§€ ëª»í–ˆ?µë‹ˆ??</p>';
    }
}

// ?? [PERF] Infinite Scroll State
export let lockerItems = [];
export let lockerCursor = 0;
export const LOCKER_BATCH_SIZE = 50;
export let lockerObserver = null;

export async function renderLockerSlots() {
    const grid = document.getElementById('locker-slots');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:50px; opacity:0.5; font-size:12px;">??Deck) ?°ì´?°ë? ìµœì ?”í•˜???½ì–´?¤ëŠ” ì¤?..</div>';

    const files = await fetchFilesInFolder(state.lockerFolderId);

    // ?“ [GRID-STYLING] 1??2??? ë™ ë°°ì¹˜ë¥??„í•œ 140px ?¤ì • ?ìš©
    grid.innerHTML = '<div class="locker-content-view" id="deck-grid" style="display: grid; width: 100%; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));"></div>';
    const container = document.getElementById('deck-grid');

    if (state.lockerMode === 'linear') {
        container.classList.add('view-linear');
        const toggleBtn = document.getElementById('toggle-view-btn');
        if (toggleBtn) toggleBtn.innerText = '?—‚ï¸?; // Grid Icon
    } else {
        const toggleBtn = document.getElementById('toggle-view-btn');
        if (toggleBtn) toggleBtn.innerText = '??; // Linear Icon
    }
    console.log(`?—ƒï¸?[DECK] Initializing Grid for ${state.lockerFolderId || 'LOCAL ONLY'}...`);

    const allItems = [];
    state.eventStore.forEach((ev) => {
        // ?”‘ ë§ˆì»¤ ?€?? ev.type (? ê·œ) ?ëŠ” id prefix fallback (?ˆê±°???¸í™˜)
        const evType = ev.type || (() => {
            const id = String(ev.id || '');
            if (id.startsWith('s-db-')) return 'tourist';
            if (id.startsWith('kuzmo-')) return 'memory';
            return 'unknown';
        })();

        allItems.push({
            id: ev.id,
            title: ev.title || "Untitled Memo",
            summary: ev.summary || "",
            snippet: ev.snippet || ev.summary || "", // Ensure snippet exists
            content: ev.content || "?´ìš© ?†ìŒ",
            tags: ev.tags || [],
            region: ev.region || "Unknown",
            timestamp: ev.timestamp || ev.date || Date.now(), 
            imageUrl: ev.imageUrl,
            thumbnailBlob: ev.thumbnailBlob, // Pass thumbnailBlob
            markerType: evType,
            data: ev,
            source: 'LOCAL'
        });
    });

    if (allItems.length === 0) {
        grid.innerHTML = '<div style="padding:100px 20px; text-align:center; opacity:0.3; font-size:12px;">ë³´ê??¨ì´ ë¹„ì–´?ˆìŠµ?ˆë‹¤.</div>';
        return;
    }

    lockerItems = allItems;
    lockerCursor = 0;
    
    const countEl = document.getElementById('local-db-count');
    if (countEl) countEl.innerText = allItems.length;

    console.log(`?—ƒï¸?[DECK] Total Items: ${allItems.length}`);

    if (lockerObserver) lockerObserver.disconnect();

    container.innerHTML = '';
    renderLockerBatch();
    setupLockerInfinityScroll();

    // ?¯ [UX-CACHING] ë§ˆì?ë§??•ì¸??ì¹´ë“œë¡??ë™ ?¤í¬ë¡?    if (state.lastActiveEventId) {
        setTimeout(() => {
            const lastCard = container.querySelector(`.locker-card.last-active`);
            if (lastCard) lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
    setupDragAndDrop(container);

    // ?“ [RESPONSIVE] ë§µë·° ë³´ê????„ìš© ë¦¬ì‚¬?´ì¦ˆ ?µì?ë²??œì‘
    if (state.mode !== 'MEMOREAL') {
        const ro = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                const cards = container.querySelectorAll('.locker-card');
                cards.forEach(c => resizeGridItem(c));
            });
        });
        ro.observe(grid);
    }
}

export function renderLockerBatch() {
    const container = document.getElementById('deck-grid');
    if (!container) return;

    const batch = lockerItems.slice(lockerCursor, lockerCursor + LOCKER_BATCH_SIZE);
    if (batch.length === 0) return;

    const fragment = document.createDocumentFragment();

    batch.forEach(item => {
        const card = document.createElement('div');
        const colors = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];
        const idStr = String(item.id);
        const colorIdx = Math.abs(idStr.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)) % colors.length;

        const isLastActive = String(item.id) === String(state.lastActiveEventId);
        card.className = `locker-card keep-${colors[colorIdx]} fade-in ${state.selectedIds.has(item.id) ? 'selected' : ''} ${isLastActive ? 'last-active' : ''}`;
        card.draggable = true;
        card.dataset.id = item.id;
        card.dataset.markerType = item.markerType || 'unknown'; // Tourist / Memory ë¶„ë¥˜

        const hasThumbnail = item.thumbnailBlob instanceof Blob;
        const thumbnailSrc = hasThumbnail ? URL.createObjectURL(item.thumbnailBlob) : (item.imageUrl && item.imageUrl !== 'null' ? item.imageUrl : null);
        const hasAudio = item.audioUrl || (item.data && item.data.audioUrl);
        const contentText = item.snippet || item.summary || item.content || "";

        card.innerHTML = `
            ${thumbnailSrc ? `<div class="card-media"><img src="${thumbnailSrc}" draggable="false" loading="lazy" onload="window.Kuzmo.resizeGridItem(this.closest('.locker-card'))"></div>` : ''}
            <div class="card-body">
                <div class="card-title">${item.title}</div>
                ${contentText ? `<div class="card-content" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 11px; opacity: 0.8; margin-top: 4px;">${contentText}</div>` : ''}
                <div class="card-labels">
                    <span class="card-label">?“ ${item.region || 'ê¸°ë¡'}</span>
                    ${hasAudio ? `<span class="card-label" style="background: var(--primary-glow); color: black; font-weight: 900;">?”Š VOICE</span>` : ''}
                    ${item.tags.slice(0, 2).map(t => `<span class="card-label" style="opacity:0.6">${t}</span>`).join('')}
                </div>
            </div>
            <div class="card-actions">
                <button class="card-action-btn" onclick="Kuzmo.deleteEvent('${item.id}')">??/button>
            </div>
            <div class="card-timestamp">${new Date(item.timestamp).toLocaleDateString('ko-KR')}</div>
        `;

        card.onclick = async (e) => {
            if (e.target.closest('.card-action-btn')) return;
            // ?¯ [MULTI-SELECT] Ctrl + Click
            if (e.ctrlKey) {
                const isSelected = state.selectedIds.has(item.id);
                if (isSelected) {
                    state.selectedIds.delete(item.id);
                    card.classList.remove('selected');
                } else {
                    state.selectedIds.add(item.id);
                    card.classList.add('selected');
                }
                updateSelectionBar();
                return;
            }
            // ?—‚ï¸?[MEMORIAL ??DETAIL] ë§??„í™˜ ?†ì´ ?„ì¬ ë·°ì—???”í…Œ???œíŠ¸ ?¤í”ˆ
            if (item.source === 'LOCAL') {
                const { showDetailSheet } = await import('./ui_sheet.js');
                const data = item.data || state.eventStore.find(ev => String(ev.id) === String(item.id));
                if (data) showDetailSheet(data);
                return;
            }
        };

        // ?›¡ï¸?[NATIVE-FILE-DRAG] (v2025.3.18.11500)
        // This makes the browser treat the web cards EXACTLY like Desktop files.
        card.ondragstart = (e) => {
            card.classList.add('dragging');
            const targetIds = state.selectedIds.has(item.id) ? Array.from(state.selectedIds) : [item.id];
            const selectedItems = targetIds.map(id => state.eventStore.find(ev => String(ev.id) === String(id))).filter(Boolean);
            if (selectedItems.length === 0) return;

            // 1. ?›°ï¸?[SERVERLESS-SYNC] Dispatch to Extension Bridge (Zero-Server)
            window.dispatchEvent(new CustomEvent('KuzmoSync', { detail: selectedItems }));

            // 2. ??[NATIVE-INJECTION] Create real File blobs for the Browser Drag Engine
            const exportData = selectedItems.map(item => ({
                title: item.title,
                content: buildMarkdown(item),
                fileName: `${item.title.replace(/[\/\\?%*:|"<>\s]/g, '_')}.md`
            }));

            // ?? [THE-HOLY-GRAIL] DownloadURL Trick (Bypasses origin security)
            // This makes the browser/OS think we are dragging a REAL file from the server
            const downloadUrlData = exportData.map(item => {
                // We create a temporary blob URL for each file
                const blob = new Blob([item.content], { type: 'text/markdown' });
                const blobUrl = URL.createObjectURL(blob);
                return `text/markdown:${item.fileName}:${blobUrl}`;
            }).join('\n');

            // ?“‘ [MULTI-PROTOCOL] Support legacy, extension, and native OS drag
            e.dataTransfer.setData("DownloadURL", downloadUrlData);
            e.dataTransfer.setData("application/kuzmo-file", JSON.stringify(exportData));
            
            selectedItems.forEach(item => {
                const mdContent = buildMarkdown(item);
                const file = new File([mdContent], `${item.title}.md`, { type: 'text/markdown' });
                try { e.dataTransfer.items.add(file); } catch (err) {}
            });
            
            e.dataTransfer.effectAllowed = "all"; 
            e.dataTransfer.dropEffect = "copy";
            e.dataTransfer.setData("text/plain", `[KUZMO] ${selectedItems.length}`); 
            
            showToast(`${selectedItems.length}ê°?ë©”ëª¨ê°€ '?¤ë¬¼ ?Œì¼'ë¡?ë³€?˜ë˜?ˆìŠµ?ˆë‹¤. AI ì°½ì— ?œë¡­?˜ì„¸??`, "success");
        };

        fragment.appendChild(card);
        // ì´ˆê¸° ë°°ì¹˜ ë°??´ë?ì§€ ë¦¬ìŠ¤???±ë¡
        setTimeout(() => {
            resizeGridItem(card);
            setupCardMediaListener(card);
        }, 10);
    });

    container.appendChild(fragment);
    lockerCursor += batch.length;
    
    // Add sentinel at the VERY end
    let sentinel = document.getElementById('locker-sentinel');
    if (sentinel) container.appendChild(sentinel);

    // Global exposed for onclick delete
    window.Kuzmo = window.Kuzmo || {};
    window.Kuzmo.deleteEvent = async (id) => {
        const { showToast } = await import('./ui_base.js');
        const { EventDB } = await import('../../core/db.js');
        if (confirm('??ì¶”ì–µ???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?')) {
            state.eventStore = state.eventStore.filter(ev => String(ev.id) !== String(id));
            state.existingIds.delete(String(id));
            state.markers.delete(String(id));
            await EventDB.delete(id);
            renderLockerSlots();
            showToast('?? œ ?„ë£Œ', 'success');
        }
    };
}

export function setupLockerInfinityScroll() {
    const container = document.getElementById('deck-grid');
    if (!container) return;
    let sentinel = document.getElementById('locker-sentinel') || document.createElement('div');
    sentinel.id = 'locker-sentinel';
    container.appendChild(sentinel);

    lockerObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && lockerCursor < lockerItems.length) {
            renderLockerBatch();
        }
    }, { root: document.getElementById('locker-slots'), threshold: 0.1 });
    lockerObserver.observe(sentinel);
}

/**
 * ?—ºï¸?[MAP-LOCKER] ë§µë·° ?„ìš© ì¹´ë“œ ?’ì´ ?•ë ¬ (Masonry)
 * ë©”ëª¨ë¦¬ì–¼ ëª¨ë“œ?€??ë³„ê°œë¡?ë§µë·° ë³´ê????¨ë„ ?´ì—?œë§Œ ?‘ë™?©ë‹ˆ??
 */
export function resizeGridItem(item) {
    const grid = document.getElementById('deck-grid');
    if (!grid || !item) return;
    
    // style.css ?¤ì •ì¹˜ì? ?¼ì¹˜?œí‚´
    const rowHeight = 10;
    const rowGap = 16;
    
    const actualHeight = item.scrollHeight;
    const rowSpan = Math.ceil((actualHeight + rowGap) / (rowHeight + rowGap));
    item.style.gridRowEnd = "span " + rowSpan;
}

/**
 * ?–¼ï¸??´ë?ì§€ ë¡œë“œ ?„ë£Œ ê°ì? ???¬ë°°ì¹? */
export function setupCardMediaListener(card) {
    const images = card.querySelectorAll('img');
    images.forEach(img => {
        if (img.complete) {
            resizeGridItem(card);
        } else {
            img.onload = () => resizeGridItem(card);
        }
    });
}


function setupDragAndDrop(container) {
    let draggedItem = null;
    container.addEventListener('dragstart', (e) => {
        draggedItem = e.target.closest('.locker-card');
        draggedItem?.classList.add('dragging');
    });
    container.addEventListener('dragend', () => draggedItem?.classList.remove('dragging'));
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        if (draggedItem) {
            if (afterElement == null) container.appendChild(draggedItem);
            else container.insertBefore(draggedItem, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggables = [...container.querySelectorAll('.locker-card:not(.dragging)')];
    return draggables.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
