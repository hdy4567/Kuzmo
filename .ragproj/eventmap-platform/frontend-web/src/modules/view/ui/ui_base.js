import { state, saveToDB } from '../../core/state.js';
import { filterMarkers } from '../../features/search.js';

export function showToast(msg, type = 'info') {
  const cont = document.getElementById('toast-container');
  if (!cont) return;
  const t = document.createElement('div');
  t.className = `toast glass ${type} fade-in`;
  t.innerText = msg;
  cont.appendChild(t);
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 500); }, 3000);
}

export function updateSelectionBar() {
  const bar = document.getElementById('selection-action-bar');
  const countEl = document.getElementById('selected-count');
  if (!bar || !countEl) return;
  if (state.selectedIds.size > 0) {
    bar.classList.add('active');
    countEl.innerText = state.selectedIds.size;
  } else {
    bar.classList.remove('active');
  }
}

export function switchMode(mode) {
  const body = document.body;
  const mapTab = document.getElementById('mode-map');
  const lockerTab = document.getElementById('mode-locker');
  if (!mapTab || !lockerTab) return;

  // 🎨 [PRIORITY-1] Instant Mode Class Switch
  if (mode === 'MAP') {
    body.classList.remove('view-locker');
    mapTab.classList.add('active');
    lockerTab.classList.remove('active');
  } else {
    body.classList.add('view-locker');
    mapTab.classList.remove('active');
    lockerTab.classList.add('active');
    
    // 🕊️ [PRIORITY-2] Deferred Data Hydration
    requestAnimationFrame(async () => {
        const { renderLockerSlots, updateLockerStatus } = await import('./ui_locker.js');
        updateLockerStatus(); // UI 상태 먼저 동기화
        await Promise.resolve(); // 양보
        renderLockerSlots(); // 무거운 데이터 렌더링 시작
    });
  }
}

export function renderSubTabs() {
  const cont = document.getElementById('sub-tabs');
  if (!cont) return;
  let items = [];
  if (state.currentCountry === "Korea") {
    items = ["전체", "서울", "경기도", "강원도", "충남", "충북", "제주도", "#맛집", "#카페", "#기록"];
  } else if (state.currentCountry === "Japan") {
    items = ["전체", "도쿄", "오사카", "후쿠오카", "나고야", "홋카이도", "오키나와", "#맛집", "#온천", "#기록"];
  } else {
    // 🧠 [OPTIMIZED-TAG-EXTRACTION] 메모 탭에선 태그만 모아서 표시 (속도 최적화)
    const globalTags = new Set(["전체"]);
    // 데이터가 너무 많을 경우 최근 500개에서만 태그 추출하여 랙 방지
    const limitStore = state.eventStore.length > 500 ? state.eventStore.slice(-500) : state.eventStore;
    limitStore.forEach(e => {
      if (e.tags) e.tags.forEach(t => globalTags.add(t.startsWith('@') ? t : `@${t}`));
    });
    items = Array.from(globalTags).slice(0, 15); // 최대 15개로 제한 (공간 효율성)
  }

  const chips = items.map(t => `<div class="sub-tab ${state.currentSubFilter === t ? 'active' : ''}" onclick="window.setSubFilter('${t}')">${t}</div>`).join('');
  const memoBtn = `<div class="sub-tab memo-plus-btn" onclick="Kuzmo.createMemoAtCenter()">MEMO ++</div>`;

  cont.innerHTML = memoBtn + chips;
}

export function createMemoAtCenter() {
  const memos = state.eventStore.filter(e => e.type === 'memory' || (e.tags && e.tags.includes('#memo')));
  if (memos.length >= 50) {
    showToast("메모는 최대 50개까지만 생성 가능합니다. (지능형 라이브러리 가득 참)", "error");
    return;
  }

  const center = state.map.getCenter();
  const newId = `memo-${Date.now()}`;
  const newMemo = {
    id: newId,
    title: `신규 메모 ${memos.length + 1}`,
    summary: "현재 위치 기반으로 생성된 지능형 메모입니다.",
    lat: center.lat,
    lng: center.lng,
    type: 'memory',
    tags: ["#memo", "@" + state.currentSubFilter],
    timestamp: new Date().toISOString()
  };

  state.eventStore.push(newMemo);
  saveToDB(true);

  // Refresh
  import('../map/index.js').then(m => m.updateWindowing());
  showToast("현재 지도 중앙에 새로운 메모가 기록되었습니다.", "success");

  // Glow effect
  const glow = document.getElementById('region-glow');
  if (glow) {
    glow.classList.add('active');
    setTimeout(() => glow.classList.remove('active'), 1500);
  }
}

export function toggleAiChat(force) {
  const panel = document.getElementById('chat-panel');
  if (!panel) return;

  const willBeActive = typeof force === 'boolean' ? force : !state.isAiActive;
  
  // 🧠 [LAZY-LOAD] AI 활성화 클릭 시점에 엔진 가동
  if (willBeActive && !state.isAiActive) {
    import('../../engine/ai.js').then(m => {
        m.initSocket(); // 🔌 [NEW] Socket lazy loading (v26.0)
    });
  }

  state.isAiActive = willBeActive;
  panel.classList.toggle('active', state.isAiActive);
}

export function setupFilterHandlers() {
  const tourCk = document.getElementById('filter-tourist');
  const memoCk = document.getElementById('filter-memory');
  if (tourCk) tourCk.onchange = (e) => { state.showTourist = e.target.checked; filterMarkers(); };
  if (memoCk) memoCk.onchange = (e) => { state.showMemory = e.target.checked; filterMarkers(); };
}

/** 🚀 [SIDE-DOCK] Mac-style dynamic side applications */
export function renderSideApps() {
  const cont = document.getElementById('side-apps-grid');
  if (!cont) return;

  const appsHtml = state.sideApps.map(app => `
        <div class="side-app-square" onclick="${app.action}" title="${app.title}">${app.icon}</div>
    `).join('');

  cont.innerHTML = `
        ${appsHtml}
        <div class="side-app-square add-btn" onclick="Kuzmo.addSideAppPrompt()">＋</div>
    `;
}

export function addSideAppPrompt() {
  const modal = document.getElementById('side-app-modal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('sa-name').value = "";
    document.getElementById('sa-emoji').value = "🔗";
    document.getElementById('sa-url').value = "";
    document.getElementById('sa-name').focus();
  }
}

export function saveNewSideApp() {
  const name = document.getElementById('sa-name').value.trim();
  const emoji = document.getElementById('sa-emoji').value.trim() || "🔗";
  let url = document.getElementById('sa-url').value.trim();

  if (!name || !url) {
    showToast("이름과 URL을 모두 입력해 주세요.", "error");
    return;
  }

  let action = url;
  if (!url.startsWith('Kuzmo.')) {
    if (!url.startsWith('http')) url = 'https://' + url;
    action = `window.open('${url}', '_blank')`;
  }

  state.sideApps.push({ icon: emoji, title: name, action: action });
  localStorage.setItem('kuzmo_side_apps', JSON.stringify(state.sideApps));
  renderSideApps();

  document.getElementById('side-app-modal').classList.remove('active');
  showToast(`'${name}' 앱이 도크에 추가되었습니다.`, 'success');
}
