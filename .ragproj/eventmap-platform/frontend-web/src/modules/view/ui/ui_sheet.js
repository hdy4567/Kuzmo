import { state, saveToDB } from '../../core/state.js';
import { showToast } from './ui_base.js';
import { renderAudioPlayerHTML, initAudioPlayer } from './components/audio_player.js';
import { renderSketchHTML, initSketchInteraction } from './components/sketch_preview.js';

/** ?ÅÎ? ?úÍ∞Ñ ?¨Îß∑ (SNS ?§Ì??? */
function relativeTime(ts) {
  const diff = Date.now() - (ts || Date.now());
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Î∞©Í∏à ??;
  if (m < 60) return `${m}Î∂???;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}?úÍ∞Ñ ??;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}????;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}Í∞úÏõî ??;
  return `${Math.floor(mo / 12)}????;
}

export async function showDetailSheet(data) {
  state.currentDetailData = data;
  state.lastActiveEventId = data.id;
  localStorage.setItem('last_active_event_id', data.id);
  const s = document.getElementById('detail-sheet');
  const backdrop = document.getElementById('sheet-backdrop');
  if (!s) return;

  // ??[HYDRATION] ?¨Î¶º Ï∫êÏãú?ºÎ©¥ Drive?êÏÑú full Î°úÎìú
  const isSlim = !data.content || data.content.length <= 130;
  if (isSlim && data.packetDriveId) {
      const { fetchKzmById } = await import('../../../core/services/auth.ts');
      const { unpackKzm } = await import('../core/services/kzm.ts');
      const blob = await fetchKzmById(data.packetDriveId);
      if (blob) Object.assign(data, await unpackKzm(blob));
  }

  const imgSrc = data.imageUrl && data.imageUrl !== 'null'
      ? data.imageUrl
      : `https://picsum.photos/seed/${data.id}/800/400`;
  const contentText  = data.content || data.summary || data.description || '';
  const hashtags = (data.tags || []).map(t =>
      `<span class="sns-tag" onclick="window.filterByTag('${t}')">#${t.replace(/^[@#]/, '')}<span class="tag-del" onclick="event.stopPropagation(); window.removeTag('${t}')">??/span></span>`
  ).join('');
  const timeStr  = relativeTime(data.timestamp);
  const region   = data.region || data.country || 'Í∏∞Î°ù';
  const hasAudio = data.audioUrl && data.audioUrl !== 'null';
  
  // ?õ∞Ô∏?[v24.0] Sketch SVG Preview Layer
  const sketchPreview = data.sketch_ai?.svg 
      ? `<div class="sns-sketch-preview">${data.sketch_ai.svg}</div>` 
      : '';

  // ?Ä?Ä SNS-style innerHTML ?Ä?Ä
  s.innerHTML = `
    <div id="sheet-drag-handle" class="kzm-handle">
      <div class="kzm-handle-bar"></div>
    </div>
    <div class="kzm-sheet-inner no-scrollbar">
      <div class="kzm-hero sns-hero">
        <img id="sheet-image" src="${imgSrc}" alt="${data.title}" loading="lazy">
        <div class="kzm-hero-gradient"></div>
        <div class="sns-hero-top">
          <div class="sns-location"><span class="sns-location-dot">?ìç</span><span>${region}</span></div>
          <button class="kzm-close-hero" id="close-sheet">??/button>
        </div>
        <div class="sns-hero-bottom">
          <h2 class="sns-title">${data.title}</h2>
          <span class="sns-time">${timeStr}</span>
        </div>
      </div>
      <div class="sns-action-bar">
        <button class="sns-action-btn" id="sns-like-btn"><span>?§ç</span><span>Í∏∞Ïñµ?òÏöî</span></button>
        <button class="sns-action-btn" id="sns-share-btn"><span>?ì§</span><span>Í≥µÏú†</span></button>
        <button class="sns-action-btn" id="sns-bookmark-btn"><span>?îñ</span><span>Î≥¥Í?</span></button>
        <button class="sns-action-btn" id="sns-sketch-edit-btn"><span>?é®</span><span>?§Ï?Ïπ?/span></button>
      </div>
      <div class="kzm-content sns-content">
        ${renderSketchHTML(data)}
        ${renderAudioPlayerHTML(data.audioUrl)}
        ${hashtags ? `<div class="sns-tags">${hashtags}</div>` : ''}


        <div class="sns-note-area" id="sns-note-display">
          <p class="sns-note-text">${contentText.replace(/\n/g, '<br>') || 'Ï∂îÏñµ??Í∏∞Î°ù?òÏÑ∏??..'}</p>
          <textarea class="kzm-textarea sns-note-edit" id="sheet-summary" style="display:none;">${contentText}</textarea>
        </div>
      </div>
      <div class="kzm-actions">
        <button class="kzm-btn-delete" id="sheet-delete-btn">?óëÔ∏???†ú</button>
      </div>
    </div>
  `;

  // ?Ä?Ä [EVENT-BINDING] ?Ä?Ä
  const closeFunc = () => { s.classList.remove('active'); backdrop?.classList.remove('active'); };
  s.querySelector('#close-sheet').onclick = closeFunc;
  s.querySelector('#sheet-drag-handle').onclick = closeFunc;
  
  const likeBtn = s.querySelector('#sns-like-btn');
  likeBtn.onclick = () => {
    const icon = likeBtn.querySelector('span:first-child');
    icon.textContent = icon.textContent === '?§Ô∏è' ? '?§ç' : '?§Ô∏è';
  };

  const deleteBtn = s.querySelector('#sheet-delete-btn');
  deleteBtn.onclick = () => {
    if (confirm("??Í∏∞Î°ù????†ú?òÏãúÍ≤†Ïäµ?àÍπå?")) {
      import('../../features/selector.js').then(m => m.deleteEvent(data.id));
      closeFunc();
    }
  };

  const sketchEditBtn = s.querySelector('#sns-sketch-edit-btn');
  sketchEditBtn.onclick = async () => {
    const { KuzmoCanvas } = await import('./ui_canvas.js');
    KuzmoCanvas.open(async ({ dataUrl, svgData }) => {
        data.sketch_ai = { dataUrl, svg: svgData };
        saveToDB();
        showDetailSheet(data); // UI Í∞±Ïã† (Î¶¨Ìîå?òÏãú)
        showToast("Ïπ¥Îìú???§Ï?ÏπòÍ? Ï∂îÍ??òÏóà?µÎãà??", "success");
    });
  };

  // ?ìù [v22.6] ?ÅÌò∏?ëÏö©???çÏä§???∏Ïßë (Edit Mode)
  const noteDisplay = s.querySelector('#sns-note-display');
  const noteText = noteDisplay.querySelector('.sns-note-text');
  const noteEdit = noteDisplay.querySelector('.sns-note-edit');

  noteText.onclick = () => {
    noteText.style.display = 'none';
    noteEdit.style.display = 'block';
    noteEdit.focus();
  };

  noteEdit.onblur = () => {
    const newVal = noteEdit.value.trim();
    if (newVal !== (data.content || data.summary || "")) {
      data.content = newVal;
      data.summary = newVal;
      data.description = newVal;
      saveToDB();
      showToast("Î©îÎ™®Í∞Ä ?ÖÎç∞?¥Ìä∏?òÏóà?µÎãà??", "success");
      noteText.innerHTML = newVal.replace(/\n/g, '<br>');
    }
    noteText.style.display = 'block';
    noteEdit.style.display = 'none';
  };

  s.classList.add('active');
  backdrop?.classList.add('active');
  setupSheetDragGesture(s, backdrop);

  // ?õ∞Ô∏?[v26.0] Modular Component Initialization
  initSketchInteraction(s.querySelector('.sns-sketch-preview'));
  
  let audioCleanup = null;
  if (hasAudio) {
      audioCleanup = initAudioPlayer(s.querySelector('#sns-audio-container'), data.audioUrl);
  }

  // ?ßπ [LIFECYCLE] Cleanup on Dismiss
  const originalClose = s.querySelector('#close-sheet').onclick;
  const cleanupAll = () => {
      if (audioCleanup) audioCleanup();
      originalClose();
  };
  
  s.querySelector('#close-sheet').onclick = cleanupAll;
  s.querySelector('#sheet-drag-handle').onclick = cleanupAll;
  if (backdrop) {
      const originalBackdrop = backdrop.onclick;
      backdrop.onclick = () => {
          if (audioCleanup) audioCleanup();
          if (typeof originalBackdrop === 'function') originalBackdrop();
      };
  }
}



/**
 * Î∞îÌ? ?úÌä∏ ?úÎûòÍ∑??úÏä§Ï≤?(SNS ?§Ì???:
 *  - ?¨ÏßÑ, ?∏Îì§ ???¥ÎîîÎ•??°ÏïÑ???úÎûòÍ∑?Í∞Ä?•ÌïòÍ≤?Í≥†ÎèÑ?? *  - ?§ÌÅ¨Î°??ÅÏó≠(.kzm-sheet-inner)?Ä ?ÅÎã®(scrollTop=0)?êÏÑú ?ÑÎûòÎ°??πÍ∏∏ ?åÎßå ?úÎûòÍ∑?Î∞úÎèô
 */
export function setupSheetDragGesture(sheet, backdrop) {
  let startY = 0, curY = 0, dragging = false;
  let isMoving = false;
  let scrollStartTop = 0;
  let isScrollArea = false;
  const DRAG_THRESHOLD = 7;

  const inner = sheet.querySelector('.kzm-sheet-inner');

  const onStart = (e) => {
    if (e.target.closest('button, input, textarea, a, .sns-action-btn, .sns-tag')) return;

    startY = e.pageY ?? e.touches?.[0]?.pageY;
    curY = startY;
    
    const scrollEl = e.target.closest('.kzm-sheet-inner');
    isScrollArea = !!scrollEl;
    scrollStartTop = scrollEl ? scrollEl.scrollTop : 0;
    
    dragging = true;
    isMoving = false;
    sheet.style.transition = 'none';
  };

  const onMove = (e) => {
    if (!dragging) return;
    curY = e.pageY ?? e.touches?.[0]?.pageY;
    const dy = curY - startY;

    if (!isMoving && Math.abs(dy) < DRAG_THRESHOLD) return;

    if (!isMoving) {
        isMoving = true;
        sheet.classList.add('kzm-dragging');
        if (navigator.vibrate) navigator.vibrate(5); 
    }

    if (isScrollArea) {
      if (dy < 0 && !sheet.classList.contains('fullscreen')) {
        if (e.cancelable) e.preventDefault();
        sheet.style.transform = `translateY(${Math.max(dy * 0.3, -30)}px)`;
        return;
      }
      
      if (dy > 0 && inner.scrollTop > 0) return; 
      
      if (dy > 0 && inner.scrollTop <= 0) {
        if (e.cancelable) e.preventDefault();
        sheet.style.transform = `translateY(${dy}px)`;
      }
    } else {
      if (e.cancelable) e.preventDefault();
      if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
      else sheet.style.transform = `translateY(${Math.max(dy * 0.2, -30)}px)`;
    }
  };

  const onEnd = () => {
    if (!dragging) return;
    
    if (!isMoving) {
        dragging = false;
        sheet.style.transition = '';
        return;
    }

    dragging = false;
    isMoving = false;
    sheet.classList.remove('kzm-dragging');
    sheet.style.transition = '';
    sheet.style.transform = '';

    const dy = curY - startY;

    if (dy > 150) {
      sheet.classList.remove('active', 'fullscreen');
      if (backdrop) backdrop.classList.remove('active');
    } else if (dy < -80 && !sheet.classList.contains('fullscreen')) {
      sheet.classList.add('fullscreen');
      if (navigator.vibrate) navigator.vibrate(10);
    } else if (dy > 80 && sheet.classList.contains('fullscreen')) {
      sheet.classList.remove('fullscreen');
    }
  };

  sheet.addEventListener('mousedown', onStart);
  sheet.addEventListener('touchstart', onStart, { passive: true });
  
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);
}

let pendingCoords = null;
let lastPickedImageData = null;
let lastRecordedAudioBlob = null;
let lastSketchData = null; // [v22.0] Store {dataUrl, svgData}
let mediaRecorder = null;
let audioChunks = [];

export function openQuickNote(coords = null, imageFile = null) {
    const modal = document.getElementById('note-modal');
    if (!modal) return;
    
    // ?ìç [LOCATION-PASSING] ?∞ÌÅ¥Î¶??ÑÏπò Í∏∞Î°ù
    pendingCoords = coords;

    document.getElementById('note-title-input').value = "";
    document.getElementById('note-content-input').value = "";

    // ?ì∏ [AUTO-IMAGE] ?¥Î?ÏßÄÍ∞Ä ?òÏñ¥??Í≤ΩÏö∞(?úÎ°≠ ?? Ï¶âÏãú ?ÑÎ¶¨Î∑?    const preview = document.getElementById('note-image-preview');
    if (imageFile) {
        lastPickedImageData = URL.createObjectURL(imageFile);
        if (preview) {
            preview.style.display = 'block';
            preview.innerHTML = `<img src="${lastPickedImageData}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
        }
    } else {
        lastPickedImageData = null;
        lastSketchData = null; // [v22.0] reset sketch on open
        if (preview) {
            preview.style.display = 'none';
            preview.innerHTML = "";
        }
    }

    modal.classList.add('active');

    // backdrop
    const backdrop = document.getElementById('sheet-backdrop');
    if (backdrop) backdrop.classList.add('active');
    if (backdrop) backdrop.onclick = () => {
      modal.classList.remove('active');
      backdrop.classList.remove('active');
    };

    document.getElementById('note-title-input').focus();

    // ?ôÏùº???úÎûòÍ∑??úÏä§Ï≤??ÅÏö© (note-modal?êÎèÑ)
    setupSheetDragGesture(modal, backdrop);
}

export function setupQuickNoteHandlers() {
    const modal = document.getElementById('note-modal');
    const handle = document.getElementById('note-drag-handle');
    const saveBtn = document.getElementById('save-note-btn');
    const photoBtn = document.getElementById('note-add-photo-btn');
    const audioBtn = document.getElementById('note-add-audio-btn');
    const sketchBtn = document.getElementById('note-add-sketch-btn');
    const fileBtn = document.getElementById('note-add-file-btn');
    const preview = document.getElementById('note-image-preview');

    const closeBtn = document.getElementById('close-note-modal');

    if (saveBtn) saveBtn.onclick = () => saveQuickNote();
    if (closeBtn) closeBtn.onclick = () => {
      modal.classList.remove('active');
      const bd = document.getElementById('sheet-backdrop');
      if (bd) bd.classList.remove('active');
    };

    if (audioBtn) {
        audioBtn.onclick = async () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                audioBtn.classList.remove('recording-active');
                audioBtn.innerHTML = `<span>?îä</span><span>?ÑÎ£å</span>`;
            } else {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const { KuzmoAudioOptimizer } = await import('../../engine/audio_optimizer.js');
                    const settings = KuzmoAudioOptimizer.getRecorderSettings();
                    
                    audioChunks = [];
                    mediaRecorder = new MediaRecorder(stream, settings);
                    
                    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                    mediaRecorder.onstop = () => {
                        lastRecordedAudioBlob = new Blob(audioChunks, { type: settings.mimeType });
                        showToast(`Í≥†ÏùåÏß?${settings.audioBitsPerSecond/1000}kbps) ?§Îîî?§Í? Ï±ÑÏßë?òÏóà?µÎãà??`, "success");
                    };

                    mediaRecorder.start();
                    audioBtn.classList.add('recording-active');
                    audioBtn.innerHTML = `<span>?õë</span><span>?πÏùåÏ§?/span>`;
                } catch (err) {
                    showToast("ÎßàÏù¥??Í∂åÌïú???ÑÏöî?©Îãà??", "error");
                }
            }
        };
    }

    if (sketchBtn) {
        sketchBtn.onclick = async () => {
            const { KuzmoCanvas } = await import('./ui_canvas.js');
            KuzmoCanvas.open(({ dataUrl, svgData }) => {
                lastSketchData = { dataUrl, svg: svgData };
                if (preview) {
                    preview.style.display = 'block';
                    preview.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:contain; background:white; border-radius:8px;">`;
                }
                showToast("?§Ï?ÏπòÍ? Î≥¥Ï°¥?òÏóà?µÎãà??", "success");
            });
        };
    }

    // ?ìÅ [FILE-PASS-THROUGH] (v25.5) ÏßÅÏ†ë ?åÏùº ?ÖÎ°ú?????åÏßà Î¨¥ÏÜê??Î≥¥Ï°¥
    if (fileBtn) {
        fileBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*,application/x-kzm';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (file.type.startsWith('audio/')) {
                    lastRecordedAudioBlob = file; // ?êÎ≥∏ Î∞îÏù¥??Í∑∏Î?Î°?Î≥¥Ï°¥ (Lossless)
                    showToast(`?§Îîî??'${file.name}' ?åÏä§ ?àÎ≤® ?àÏßàÎ°?Ï≤®Î? ?ÑÎ£å`, "success");
                    if (audioBtn) audioBtn.innerHTML = `<span>?éµ</span><span>Ï≤®Î???/span>`;
                } else if (file.name.endsWith('.kzm')) {
                    import('../../core/services/kzm.ts').then(async m => {
                        const newEv = await m.unpackKzm(file);
                        state.eventStore.push(newEv);
                        saveToDB();
                        location.reload();
                    });
                } else {
                    showToast("ÏßÄ?êÎêòÏßÄ ?äÎäî ?åÏùº ?ïÏãù?ÖÎãà?? (Audio/KZMÎß?Í∞Ä??", "warning");
                }
            };
            input.click();
        };
    }
    
    // ?îΩ [DISMISS GESTURE] ?∏Îì§ ?úÎûòÍ∑?Ï¢ÖÎ£å Î°úÏßÅ
    if (handle && modal) {
        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const onStart = (e) => {
            startY = (e.pageY || e.touches?.[0].pageY);
            isDragging = true;
            modal.style.transition = 'none'; // ?úÎûòÍ∑?Ï§ëÏóî ?†ÎãàÎ©îÏù¥???ÑÍ∏∞
        };

        const onMove = (e) => {
            if (!isDragging) return;
            currentY = (e.pageY || e.touches?.[0].pageY);
            const deltaY = Math.max(0, currentY - startY); // ?ÑÎûòÎ°úÎßå ?úÎûòÍ∑?Í∞Ä??            modal.style.transform = `translateY(${deltaY}px)`;
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            modal.style.transition = ''; // ?†ÎãàÎ©îÏù¥??Î≥µÍµ¨
            
            const deltaY = currentY - startY;
            if (deltaY > 150) { // 150px ?¥ÏÉÅ ?¥Î¶¨Î©?Ï¢ÖÎ£å
                modal.classList.remove('active');
                modal.style.transform = '';
            } else {
                modal.style.transform = 'translateY(0)';
            }
        };

        handle.addEventListener('mousedown', onStart);
        handle.addEventListener('touchstart', onStart, { passive: true });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
    }
    
    if (photoBtn) photoBtn.onclick = async () => {
        const { pickFromGallery } = await import('../../infra/native.js');
        const url = await pickFromGallery();
        if (url) {
            lastPickedImageData = url;
            if (preview) {
                preview.style.display = 'block';
                preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
            }
            showToast("?¨ÏßÑ??Ï≤®Î??òÏóà?µÎãà??", "success");
        }
    };
}

async function saveQuickNote() {
    const titleIn = document.getElementById('note-title-input');
    const contentIn = document.getElementById('note-content-input');
    const rawTitle = titleIn.value.trim();
    const rawContent = contentIn.value.trim();

    if (!rawTitle) {
        showToast("?úÎ™©???ÖÎ†•??Ï£ºÏÑ∏??", "error");
        return;
    }

    let title = rawTitle;
    let content = rawContent || "?¥Ïö© ?ÜÏùå";
    let tags = ["#ÏßÅÏ†ë?ÖÎ†•"];

    // Auto-tagging from content
    const tagMatches = rawContent.match(/@\S+/g);
    if (tagMatches) tagMatches.forEach(t => tags.push(t));

    // [LOCATION-STRATEGY] ?∞ÌÅ¥Î¶?Ï¢åÌëú ?∞ÏÑ† -> ?ÜÏúºÎ©?ÏßÄ??Ï§ëÏïô
    const pos = pendingCoords || state.map.getCenter();

    const newEv = {
        id: "mem_" + Date.now(),
        title,
        description: content,
        summary: content,
        lat: pos.lat,
        lng: pos.lng,
        tags,
        region: "Manual Deck",
        timestamp: Date.now(),
        imageUrl: lastPickedImageData || "null",
        audioUrl: lastRecordedAudioBlob ? URL.createObjectURL(lastRecordedAudioBlob) : "null",
        sketch_ai: lastSketchData || null // [v22.0] High-Fidelity Path/SVG Data
    };

    // ?õ∞Ô∏?[GEMINI-READY] Sketch Data Processing Layer
    if (newEv.type === 'sketch' || (newEv.tags && newEv.tags.includes('#sketch')) || newEv.sketch_ai) {
        // ?¥Î? sketch_ai??SVGÍ∞Ä ?¥Í≤®?àÏúºÎØÄÎ°?Ï∂îÍ? Î≥Ä??Î∂àÌïÑ??(v22.0 Direct Path)
    }

    state.eventStore.push(newEv);
    state.existingIds.add(String(newEv.id));
    
    const { addMarkerToMap } = await import('../map/index.js');
    addMarkerToMap(newEv);
    saveToDB();
    
    // ?ìä [GRAPH-SOTA] Obsidian-style Graph Linkage (v4)
    import('../../engine/graph.js').then(async m => {
        await m.updateNodeLinks(newEv.id);
        const { renderGraphLinks } = await import('../map/index.js');
        renderGraphLinks();
    });

    showToast(`'${title}' Î©îÎ™® Ï∂îÍ???, "success");
    const backdrop = document.getElementById('sheet-backdrop');
    document.getElementById('note-modal').classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    
    // UI Î∞??ÅÌÉú Ï¥àÍ∏∞??    titleIn.value = "";
    contentIn.value = "";
    lastRecordedAudioBlob = null;
    lastSketchData = null; // [v22.0] reset sketch
    pendingCoords = null; // ?ìç Ï¥àÍ∏∞??    if (audioBtn) audioBtn.innerHTML = `<span>?é§</span><span>?åÏÑ±</span>`;
    
    if (document.getElementById('note-image-preview')) {
        document.getElementById('note-image-preview').style.display = 'none';
        document.getElementById('note-image-preview').innerHTML = "";
    }

    if (document.body.classList.contains('view-locker')) {
        const { renderLockerSlots } = await import('./ui_locker.js');
        renderLockerSlots();
    }
}

export function addNewTagPrompt() {
  const newTag = prompt("?àÎ°ú???úÍ∑∏Î•??ÖÎ†•?òÏÑ∏??(?? @Ï§ëÏöî):");
  if (!newTag) return;
  const formatted = newTag.startsWith('@') ? newTag : `@${newTag}`;
  if (!state.currentDetailData.tags.includes(formatted)) {
    state.currentDetailData.tags.push(formatted);
    saveToDB();
    showDetailSheet(state.currentDetailData);
    showToast(`?úÍ∑∏ '${formatted}' Ï∂îÍ???, 'success');
  }
}

export function removeTag(tag) {
  state.currentDetailData.tags = state.currentDetailData.tags.filter(t => t !== tag);
  saveToDB();
  showDetailSheet(state.currentDetailData);
  showToast(`?úÍ∑∏ '${tag}' ??†ú??, 'info');
}

export function showRegionGlow(region) {
    const glow = document.getElementById('region-glow');
    if (!glow) return;
    const badge = glow.querySelector('.glow-badge');
    if (badge) badge.innerText = region;
    glow.classList.add('active');
    setTimeout(() => glow.classList.remove('active'), 2500);
}
