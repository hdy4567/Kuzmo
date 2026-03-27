import { state } from '../../core/state.js';

export function updateLabelMonitor(title, region, category, id, type = 'LABEL') {
    const logsCont = document.getElementById('monitor-logs');
    if (!logsCont) return;

    if (type === 'SYSTEM' && state.labelingLogs.some(l => l.title === title && l.type === 'SYSTEM')) return;

    if (state.labelingLogs.length === 0) logsCont.innerHTML = '';
    
    // [VISUAL] Update Monitor Badge
    const panel = document.getElementById('ai-monitor-panel');
    if (panel) {
        panel.classList.add('active');
        const countBadge = panel.querySelector('.monitor-count');
        if (countBadge) countBadge.innerText = `${state.labelingLogs.length + 1}`;
    }
    
    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const logItem = { title, region, category, id, time, type };
    state.labelingLogs.push(logItem);
    if (state.labelingLogs.length > 50) state.labelingLogs.shift();

    const currentFilter = state.monitorFilter || 'ALL';
    if (currentFilter === 'ALL' || currentFilter === type) {
        renderSingleLog(logItem, logsCont);
    }
}

export function filterMonitor(type) {
    state.monitorFilter = type;
    document.querySelectorAll('.m-filter-chip').forEach(c => c.classList.toggle('active', c.innerText === type));

    const logsCont = document.getElementById('monitor-logs');
    if (!logsCont) return;

    logsCont.innerHTML = '';
    const filtered = type === 'ALL' ? state.labelingLogs : state.labelingLogs.filter(l => l.type === type);
    [...filtered].reverse().forEach(log => renderSingleLog(log, logsCont));
    if (filtered.length === 0) logsCont.innerHTML = `<div class="log-item" style="opacity: 0.3; text-align: center;">No ${type} logs found.</div>`;
}

export function updateMonitorVitals() {
    const dbCountEl = document.getElementById('vital-db-count');
    const dbFillEl = document.getElementById('vital-db-fill');
    const brainLoadEl = document.getElementById('vital-brain-load');
    const brainFillEl = document.getElementById('vital-brain-fill');

    if (dbCountEl && dbFillEl) {
        dbCountEl.innerText = `${state.eventStore.length}`;
        dbFillEl.style.width = `${Math.min((state.eventStore.length / 25000) * 100, 100)}%`;
    }

    if (brainLoadEl && brainFillEl) {
        const brainSize = Object.keys(state.learningBrain).length;
        const loadPercent = Math.min((brainSize / 20) * 100, 100); 
        brainLoadEl.innerText = `${loadPercent.toFixed(0)}%`;
        brainFillEl.style.width = `${loadPercent}%`;
    }
}

function renderSingleLog(log, container) {
    const { title, region, category, id, time, type } = log;
    const logEl = document.createElement('div');
    logEl.className = `log-item ${type.toLowerCase()}`;
    logEl.id = `log-${id}-${Date.now()}`;
    
    const typeColor = type === 'SYNC' ? '#00e5ff' : type === 'SYSTEM' ? '#FFD700' : 'var(--primary-glow)';

    logEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
                <b style="color: ${typeColor}; text-shadow: 0 0 5px ${typeColor}55;">[${type}]</b> ${title}
                <div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">
                    ${region ? `<span class="log-tag">@${region}</span>` : ''}
                    ${category ? `<span class="log-tag">${category}</span>` : ''}
                </div>
            </div>
            ${type !== 'SYSTEM' ? `<button class="close-btn" style="width: 20px; height: 20px; font-size: 10px; flex-shrink: 0;" onclick="Kuzmo.deleteEventFromMonitor('${id}', this)">✕</button>` : ''}
        </div>
        <div style="font-size: 11px; opacity: 0.35; margin-top: 6px; text-align: right;">${time}</div>
    `;
    
    container.insertBefore(logEl, container.firstChild);
    if (container.children.length > 50) container.lastChild.remove();
}

export function deleteEventFromMonitor(id, el) {
    state.labelingLogs = state.labelingLogs.filter(l => l.id !== id);
    if (el) {
        const item = el.closest('.log-item');
        if (item) item.remove();
    }
    const countBadge = document.querySelector('.monitor-count');
    if (countBadge) countBadge.innerText = state.labelingLogs.length;
}
