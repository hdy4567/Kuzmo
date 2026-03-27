import { state, saveToDB, rebuildSpatialIndex } from '../core/state.js';
import { showToast } from '../view/ui/ui_base.js';
import { addMarkerToMap, updateMarkerUI } from '../view/map/index.js';

/**
 * 🤖 AI & Sync Bridge Layer
 */

let socketRetryCount = 0;

export function initSocket() {
  if (state.socket) return;
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:9091`);
    state.socket = ws;

    ws.onopen = async () => {
      console.log("✅ AI/Sync Bridge Connected");
      state.isServerConnected = true;
      socketRetryCount = 0; // Reset on success
      showToast("로컬 서버 연동 성공", "success");
      
      const { updateLabelMonitor } = await import('../infra/worker_bridge.js');
      updateLabelMonitor("Backend Server Connected", null, "Port: 9005", 'sys-conn', 'SYSTEM');

      ws.send(JSON.stringify({ type: "KNOWLEDGE_REQUEST" }));
      
      if (state.eventStore.length > 0) {
          const CHUNK_SIZE = 100;
          let delay = 0;
          for (let i = 0; i < state.eventStore.length; i += CHUNK_SIZE) {
              const chunk = state.eventStore.slice(i, i + CHUNK_SIZE);
              setTimeout(() => {
                  chunk.forEach(e => syncPacketToServer(e));
              }, delay);
              delay += 500;
          }
      }
    };

    ws.onclose = async () => {
        socketRetryCount++;
        const nextRetry = Math.min(3000 * Math.pow(1.5, socketRetryCount), 30000); 
        console.warn(`🔌 AI Socket Closed. Retrying in ${Math.round(nextRetry / 1000)}s...`);
        state.socket = null;
        state.isServerConnected = false;
        
        const { updateLabelMonitor } = await import('../infra/worker_bridge.js');
        updateLabelMonitor("Backend Server Disconnected", null, `Retry in ${Math.round(nextRetry / 1000)}s`, 'sys-disc', 'SYSTEM');
        
        setTimeout(initSocket, nextRetry);
    };

    ws.onerror = (err) => {
        ws.close();
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "AI_STREAM_CHUNK") {
          handleAiStream(msg.chunk, msg.requestId);
      } else if (msg.type === "KNOWLEDGE_RESULT") {
          integrateServerKnowledge(msg.data, msg.status);
      } else if (msg.type === "KNOWLEDGE_PROGRESS") {
          updateProgressBar(msg.current, msg.total, msg.status);
      } else if (msg.type === "KNOWLEDGE_CLEAR_ACK") {
          showToast(`${msg.region} 서버 캐시 정리 완료`, 'info');
      } else if (msg.type === "KNOWLEDGE_PRUNE_ACK") {
          showToast(`서버 최적화 완료 (${msg.total}건)`, 'success');
          setTimeout(() => location.reload(), 1500);
      } else if (msg.type === "AI_STREAM_END") {
          handleAiStreamEnd(msg.data, msg.requestId, msg.sourceNodeIds);
      } else if (msg.type === "SYNC_ACK") {
          console.log("Sync Confirmed:", msg.id);
      } else if (msg.type === "SERVER_LOG") {
          import('../infra/worker_bridge.js').then(m => {
              m.updateLabelMonitor(msg.title, msg.region, msg.logType, `srv-${Date.now()}`, msg.logType);
          });
      }
    };

  } catch (err) {
    socketRetryCount++;
    const nextRetry = Math.min(3000 * Math.pow(1.5, socketRetryCount), 30000);
    setTimeout(initSocket, nextRetry);
  }
}

export function syncPacketToServer(packet) {
  if (state.socket && state.socket.readyState === WebSocket.OPEN) {
    state.socket.send(JSON.stringify({
      type: "SYNC_PACKET",
      data: {
        id: packet.id,
        title: packet.title,
        content: packet.summary || packet.title,
        tags: packet.tags,
        sketch: packet.sketch_ai || null // 🛰️ [GEMINI-READY] Include SVG & Semantic Layer
      }
    }));
  }
}

const streamStates = {}; // 🚀 requestId별 스트림 상태 관리

function handleAiStream(chunk, requestId) {
    const chatBody = document.getElementById('chat-messages');
    if (!chatBody) return;

    if (!streamStates[requestId]) {
        streamStates[requestId] = { isThinking: true, fullText: "" };
    }

    const state = streamStates[requestId];
    state.fullText += chunk;

    // 🚀 [THINKING STATE UI]
    let statusLabel = document.getElementById(`ai-status-${requestId}`);
    if (!statusLabel && state.isThinking) {
        statusLabel = document.createElement('div');
        statusLabel.id = `ai-status-${requestId}`;
        statusLabel.className = 'ai-status-indicator pulse';
        statusLabel.innerHTML = '<span>🧠</span> 에이전트가 최적의 경로를 고민 중입니다...';
        chatBody.appendChild(statusLabel);
    }

    // Thinking 종료 감지
    if (state.isThinking && state.fullText.includes("</thinking>")) {
        state.isThinking = false;
        if (statusLabel) statusLabel.remove(); // 생각 끝나면 상태바 제거
    }

    if (!state.isThinking) {
        let bubble = document.getElementById(`ai-bubble-${requestId}`);
        if (!bubble) {
            bubble = document.createElement('div');
            bubble.id = `ai-bubble-${requestId}`;
            bubble.className = 'message ai fade-in';
            chatBody.appendChild(bubble);
        }
        
        // <thinking> 이후의 텍스트만 표시
        const actualResponse = state.fullText.split("</thinking>")[1] || "";
        bubble.innerHTML = `
            <img src="/assistant-icon.png" class="ai-avatar-tiny" alt="AI">
            <div class="message-content">${actualResponse}</div>
        `;
    }

    chatBody.scrollTop = chatBody.scrollHeight;
}

function handleAiStreamEnd(data, requestId, sourceNodeIds) {
    const stateObj = streamStates[requestId];
    if (stateObj) {
        stateObj.isThinking = false;
        // 렌더링을 위해 최종 텍스트 보정 (이미 스트림으로 나갔으므로 UI는 유지)
    }
    
    // 🔥 [RAG-VIZ] 지능형 맵 하이라이트 트리거
    if (sourceNodeIds && sourceNodeIds.length > 0) {
        import('../view/map/index.js').then(m => m.renderRAGHighlights(sourceNodeIds));
    }
    
    // 상태 정리 (메모리 관리: 30초 후 삭제)
    setTimeout(() => { delete streamStates[requestId]; }, 30000);
}

/**
 * 🚀 서버 지능형 지식 통합기
 */
async function integrateServerKnowledge(knowledgeList, statusMsg) {
    if (!knowledgeList || knowledgeList.length === 0) return;
    
    const { createEventObject, applyJitter } = await import('../core/utils.js');
    const { addMarkerToMap } = await import('../view/map/index.js');
    const { filterMarkers } = await import('../features/search.js');

    console.log(`[INTEGRATE] Processing ${knowledgeList.length} items from server. (Current: ${state.eventStore.length})`);
    
    // 🚀 [CAPACITY CHECK] 브라우저 저장 한계(25000건) 도달 시 수집 중단 (v15.0 확장)
    if (state.eventStore.length > 25000) {
        console.warn("[INTEGRATE] Global capacity reached (25000). Skipping new ingest.");
        showToast("지식 저장 한계에 도달했습니다. (25000개 제한)", "warning");
        return;
    }

    // 🚀 [O(N) Optimization] Persistent ID lookup set used for O(1) checks
    const regionCounts = state.eventStore.reduce((acc, e) => {
        acc[e.region] = (acc[e.region] || 0) + 1;
        return acc;
    }, {});

    // 🚀 [EMERGENCY CLEANUP] (0,0) 좌표 데이터 제거 
    for (let i = state.eventStore.length - 1; i >= 0; i--) {
        if (Math.abs(state.eventStore[i].lat) < 0.1 || Math.abs(state.eventStore[i].lng) < 0.1) {
            state.existingIds.delete(String(state.eventStore[i].id));
            state.eventStore.splice(i, 1);
        }
    }

    const newMarkers = [];
    let addedCount = 0;
    knowledgeList.forEach(item => {
        if (item.Lat === 0 && item.Lng === 0) return;

        const regionName = (item.Tags && item.Tags.length > 0) ? item.Tags[0] : "Global";
        const regionClean = regionName.replace("@", "");
        
        if ((regionCounts[regionClean] || 0) >= 1000) return;

        const descText = item.Description || "";
        const descHash = descText.length > 0 ? descText.substring(0, 10).replace(/[^a-z0-9]/gi, '') : "node";
        const locId = `${parseFloat(item.Lat).toFixed(4)}${parseFloat(item.Lng).toFixed(4)}`;
        const cleanName = (item.Name || "unknown").replace(/\s+/g, '-').toLowerCase();
        const itemId = `s-db-${cleanName}-${descHash}-${locId}`;
        
        if (state.existingIds.has(itemId)) return;

        const coord = applyJitter(item.Lat, item.Lng);

        const eventData = createEventObject({
            id: itemId,
            title: item.Name,
            summary: item.Description,
            tags: item.Tags || [],
            lat: coord.lat,
            lng: coord.lng,
            region: regionClean
        });

        state.eventStore.push(eventData);
        state.existingIds.add(itemId);
        regionCounts[regionClean] = (regionCounts[regionClean] || 0) + 1;
        
        // 🚀 Batch Rendering Optimization: skip immediate addition
        const marker = addMarkerToMap(eventData, true);
        newMarkers.push(marker);
        addedCount++;

        import('../infra/worker_bridge.js').then(m => {
            m.updateLabelMonitor(item.Name, regionClean, (item.Tags && item.Tags[1]) || "Knowledge", itemId, 'SYNC');
        });
    });
    
    if (addedCount > 0) {
        state.clusterGroup.addLayers(newMarkers);
        rebuildSpatialIndex();
        saveToDB(); 
        filterMarkers();
        
        // UI Count Update
        const badge = document.getElementById('total-count-badge');
        if (badge) badge.innerText = state.eventStore.length;

        // 🗃️ [UI-SYNC] 보관함(Deck)이 열려있다면 즉시 렌더링 갱신
        if (document.body.classList.contains('view-locker')) {
            import('../view/ui/ui_base.js').then(m => m.renderLockerSlots());
        }

        if (state.worker) {
            state.worker.postMessage({
                action: 'AI_BATCH_LABEL',
                events: state.eventStore.slice(-addedCount)
            });
        }

        // 📊 [GRAPH-SYNC] 신규 데이터 그래프 연결 (v4)
        import('./graph.js').then(m => m.batchUpdateLinks(state.eventStore.slice(-addedCount)));
        import('../view/map/index.js').then(m => m.renderGraphLinks());
    }

    if (statusMsg) showToast(`${statusMsg} (+${addedCount}개)`, 'success');
}

/**
 * 🕵️ AI 전수 조사 (Audit): 기존 모든 데이터에 대해 @라벨링 재실행
 */
export function auditAllData() {
    if (!state.worker) return showToast("AI 엔진이 준비되지 않았습니다.", "info");
    showToast("모든 데이터 AI 라벨링 재분석 시작...", "info");
    state.worker.postMessage({
        action: 'AI_BATCH_LABEL',
        events: state.eventStore
    });
}

/**
 * 🏥 AI 셀프 힐링: 라벨이 없는 과거 데이터를 백그라운드에서 조용히 치료
 */
export function autoHealingAudit() {
    if (!state.worker || state.eventStore.length === 0) return;
    
    // 라벨이 'Global'이거나 @태그가 없는 불완전 데이터 필터링 (최대 500개만 스캔)
    const sickData = [];
    for (let i = 0; i < state.eventStore.length; i++) {
        const ev = state.eventStore[i];
        if ((ev.region === "Global" || !ev.tags.some(t => t.startsWith("@"))) && (ev._healAttempt || 0) < 3) {
            sickData.push(ev);
            if (sickData.length >= 500) break; 
        }
    }

    if (sickData.length > 0) {
        console.log(`[SELF-HEAL] Scan completed. Found ${sickData.length} items needing repair.`);
        const chunk = sickData.slice(0, 20); 
        state.worker.postMessage({
            action: 'AI_BATCH_LABEL',
            events: chunk
        });
    }
}

function updateProgressBar(current, total, status) {
    let bar = document.getElementById('knowledge-progress-bar');
    let container = document.getElementById('knowledge-progress-container');
    if (!container) return;

    container.style.display = 'block';
    const percent = Math.round((current / total) * 100);
    if (bar) bar.style.width = `${percent}%`;
    
    const label = document.getElementById('knowledge-progress-label');
    if (label) label.innerText = `${status} (${percent}%)`;

    if (current >= total) {
        setTimeout(() => { container.style.display = 'none'; }, 2000);
    }
}

/**
 * 🚀 서버에 지식 대량 수혈 요청
 */
/**
 * 🚀 [REAL-WORLD-API] 서버 연결 실패 시 브라우저에서 직접 Wikipedia/OSM API 수혈 (v25.0)
 * 가상/가짜 데이터를 배제하고 실제 공공 API 지식을 활용합니다.
 */
export async function requestKnowledgeFill() {
    // 1. 서버(9091)가 켜져있다면 서버에 요청 우선 (기존 스펙 유지)
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        showToast("서버(Bridge) 지식 수혈 요청 완료", "info");
        state.socket.send(JSON.stringify({ type: "KNOWLEDGE_FILL" }));
        return;
    }

    // 2. [FALLBACK] 서버 미연동 시 브라우저에서 직접 수집 (Overpass API + Wiki)
    showToast("로컬 서버 미연동 감지. 위키피디아/OSM 직접 수혈 시퀀스 시작...", "warning");
    
    try {
        const center = state.map.getCenter();
        const lat = center.lat;
        const lng = center.lng;

        // 🗺️ OpenStreetMap Overpass Query (관광지/랜드마크 50건씩 배치 로드)
        const osmQuery = `[out:json];node(around:5000, ${lat}, ${lng})["tourism"~"attraction|museum|artwork|viewpoint"];out 50;`;
        const osmUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(osmQuery)}`;

        const response = await fetch(osmUrl);
        const result = await response.json();
        
        if (!result.elements || result.elements.length === 0) {
            return showToast("주변 실생활 데이터를 찾지 못했습니다. 위치를 이동해 보세요.", "info");
        }

        const realWorldBatch = result.elements.map(item => ({
            Name: item.tags.name || item.tags.name_ko || item.tags.name_en || "알 수 없는 명소",
            Description: `${item.tags.tourism} - ${item.tags.description || '현지 실제 장소 데이터(OSM)'}`,
            Lat: item.lat,
            Lng: item.lon,
            Tags: [state.currentSubFilter === '전체' ? `@${state.currentCountry === 'Korea' ? '서울' : '도쿄'}` : state.currentSubFilter, "#공공데이터", "POI"]
        }));

        integrateServerKnowledge(realWorldBatch, `공공 API 데이터 ${realWorldBatch.length}건 수혈 완료`);

    } catch (err) {
        console.error("Direct API Fill Error:", err);
        showToast("외부 API 서비스 응답 지연. 나중에 다시 시도해주세요.", "error");
    }
}
/**
 * 🛑 지식 수혈 중단 요청
 */
export function stopKnowledgeFill() {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        state.socket.send(JSON.stringify({ type: "KNOWLEDGE_STOP" }));
        showToast("지식 수혈 중단을 요청했습니다.", "info");
        
        import('../infra/worker_bridge.js').then(m => {
            m.updateLabelMonitor("Knowledge Stream Paused", null, "User Requested", 'sys-stop', 'INFO');
        });
    }
}
/**
 * 🧹 강력 지우개: 특정 지역 데이터 완전 소거 (v9.7)
 */
export function wipeRegion(region) {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        state.socket.send(JSON.stringify({ type: "KNOWLEDGE_CLEAR", region: region }));
    }
    
    // 로컬 메모리 및 DB에서 즉시 제거
    const initialCount = state.eventStore.length;
    const regionClean = region.replace(/[@#]/, "");
    
    for (let i = state.eventStore.length - 1; i >= 0; i--) {
        const item = state.eventStore[i];
        const inRegion = item.region?.includes(regionClean);
        const inTitle = item.title?.includes(regionClean);
        const inTags = item.tags?.some(t => t.includes(regionClean));
        
        if (inRegion || inTitle || inTags) {
            state.existingIds.delete(String(item.id));
            state.eventStore.splice(i, 1);
        }
    }
    
    if (state.eventStore.length < initialCount) {
        console.log(`[WIPE] Purged ${initialCount - state.eventStore.length} items for region: ${region}`);
        saveToDB();
        // 맵 UI 갱신 (지워진 마커 반영을 위해 리렌더링 유도)
        location.reload(); // 가장 확실한 방법 (마커 객체 추적이 복잡하므로)
    } else {
        showToast("삭제할 대상을 찾지 못했습니다.", "info");
    }
}
/**
 * 🔌 AI 브릿지 세션 강제 종료
 */
export function terminateAiBridge() {
    if (state.socket) {
        if (state.socket.readyState === WebSocket.OPEN) {
            state.socket.send(JSON.stringify({ type: "BRIDGE_DISCONNECT", status: "terminating" }));
            state.socket.close(1000, "User closed the application");
        }
        state.socket = null;
        console.log("🔌 AI Socket Bridge Terminated.");
    }
}

/**
 * 🚀 [SYSTEM REBOOT] 서버 대청소 및 재시작 (포트 충돌 등 해결)
 */
export function rebootSystem() {
    showToast("시스템 전체 재부팅 시퀀스 가동...", "warning");
    
    // 1. 서버에 자폭(Self-Terminate) 명령 전송
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        state.socket.send(JSON.stringify({ 
            type: "SYSTEM_REBOOT",
            reason: "User requested full diagnostic restart",
            timestamp: Date.now()
        }));
    }

    // 2. 브라우저 세션 정리 및 1.5초 후 페이지 리로드
    setTimeout(() => {
        terminateAiBridge();
        location.reload();
    }, 1500);
}

/**
 * ✂️ 데이터 다이어트: 지역 당 최대 1000건으로 슬림화 (v13.0)
 * 🛡️ [PROTECTION] 사용자의 개인 추억(.kzm)은 청소 대상에서 절대 제외.
 */
export function pruneData(limitPerRegion = 1000) {
    console.log(`[PRUNE] Execution started. Target: ${limitPerRegion} per region. (Memories protected)`);
    
    // 1. 서버 캐시 최적화 통보
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        state.socket.send(JSON.stringify({ type: "KNOWLEDGE_PRUNE_PER_REGION", limit: limitPerRegion }));
    }

    // 2. 데이터 분류 (관광 vs 추억)
    const poiRegionsMap = {};
    const personalMemories = [];

    state.eventStore.forEach(ev => {
        // ID가 's-db-'로 시작하면 외부 데이터(POI), 아니면 개인 추억(Memory)
        const isExternal = ev.id && String(ev.id).startsWith('s-db-');
        const isMemory = ev.type === 'memory' || ev.category === 'memory' || !isExternal;

        if (isMemory) {
            personalMemories.push(ev);
        } else {
            const r = ev.region || "Global";
            if (!poiRegionsMap[r]) poiRegionsMap[r] = [];
            poiRegionsMap[r].push(ev);
        }
    });

    let totalPruned = 0;
    const survivors = [...personalMemories]; // 추억은 무조건 생존

    Object.keys(poiRegionsMap).forEach(r => {
        const items = poiRegionsMap[r];
        if (items.length > limitPerRegion) {
            totalPruned += (items.length - limitPerRegion);
            survivors.push(...items.slice(0, limitPerRegion));
        } else {
            survivors.push(...items);
        }
    });

    if (totalPruned > 0) {
        // state.eventStore 원본 갱신
        state.eventStore.length = 0;
        state.eventStore.push(...survivors);
        
        rebuildSpatialIndex();
        saveToDB();
        showToast(`최적화 완료: 관광 데이터 ${totalPruned}건 정리 (개인 추억 ${personalMemories.length}건 보존)`, "success");
        setTimeout(() => location.reload(), 1000);
    } else {
        showToast("정리할 노루 데이터(POI)가 없습니다.", "info");
    }
}

/**
 * ✍️ AI 타이핑 효과 (UX)
 */
export function typeMessage(text, requestId = Date.now(), quickActions = [], speed = 25) {
    const chatBody = document.getElementById('chat-messages');
    if (!chatBody) return;

    const bubble = document.createElement('div');
    bubble.id = `ai-bubble-${requestId}`;
    bubble.className = 'message ai typing';
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;

    let i = 0;
    const interval = setInterval(() => {
        if (i < text.length) {
            bubble.innerText += text.charAt(i);
            i++;
            chatBody.scrollTop = chatBody.scrollHeight;
        } else {
            clearInterval(interval);
            bubble.classList.remove('typing');
            if (quickActions && quickActions.length > 0) {
                renderQuickActions(quickActions, chatBody);
            }
        }
    }, speed);
}

/**
 * 🍟 퀵 액션 칩 렌더링
 */
function renderQuickActions(actions, container) {
    const chipWrapper = document.createElement('div');
    chipWrapper.className = 'quick-actions-wrap fade-in';
    
    actions.forEach(act => {
        const chip = document.createElement('div');
        chip.className = 'action-chip';
        chip.innerText = act;
        chip.onclick = () => {
            const input = document.querySelector('.chat-input');
            if (input) {
                input.value = act;
                // 바로 전송 모방
                const sendBtn = document.getElementById('send-chat');
                if (sendBtn) sendBtn.click();
            }
        };
        chipWrapper.appendChild(chip);
    });

    container.appendChild(chipWrapper);
    container.scrollTop = container.scrollHeight;
}

// (suggestItineraryFromDeck logic removed per user request)
