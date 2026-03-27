import { state, REGION_COORDS } from '../core/state.js';
import { showToast } from '../view/ui/ui_base.js';
import { VisualizerCenter } from '../view/map/visualizer_center.js';

/**
 * 🔍 Search & Filtering Engine
 */

export function getTokens(str) {
  const s = str.replace(/\s+/g, '').toLowerCase();
  const tokens = [];
  for (let i = 0; i < s.length - 1; i++) tokens.push(s.substring(i, i + 2));
  return tokens;
}

export async function filterMarkers() {
  const taskId = Date.now();
  state.activeFilterTaskId = taskId;

  const q = state.searchQuery.toLowerCase();
  const isTagSearch = q.startsWith("@") || q.startsWith("#");
  const cleanQ = (q.startsWith("@") || q.startsWith("#")) ? q.substring(1) : q;
  const qTokens = cleanQ.length >= 2 ? getTokens(cleanQ) : [];

  const markersArray = Array.from(state.markers);
  const CHUNK_SIZE = 400; // 가시성 체킹 청크 사이즈
  let currentIdx = 0;

  const toAdd = [];
  const toRemove = [];

  // 🚀 [CONCURRENT-LOOP] 메인 스레드를 점유하지 않도록 청크 단위 필터링 수행
  const processChunk = async () => {
    // 🛡️ [CANCELLATION-CHECK] 최신 테스크가 아니면 즉시 중단 (랙 방지 핵심)
    if (state.activeFilterTaskId !== taskId) return false;

    const end = Math.min(currentIdx + CHUNK_SIZE, markersArray.length);
    for (let i = currentIdx; i < end; i++) {
        const { marker, data } = markersArray[i][1];
        
        // Match Logic
        let mS = false;
        if (isTagSearch) {
          mS = data.tags.some(t => t.toLowerCase() === q || t.toLowerCase().includes(cleanQ));
        } else {
          const title = data.title.toLowerCase();
          const hasExact = title.includes(q) || data.tags.some(t => t.toLowerCase().includes(q));
          let hasFuzzy = false;
          if (!hasExact && qTokens.length > 0) {
            const titleTokens = getTokens(title);
            hasFuzzy = qTokens.some(qt => titleTokens.includes(qt));
          }
          mS = hasExact || hasFuzzy;
        }

        const mC = (state.currentCountry === "Memo") || (data.country === state.currentCountry);
        let mSub = state.currentSubFilter === "전체";
        if (!mSub) {
          if (state.currentSubFilter.startsWith("@")) {
            mSub = data.tags.some(t => t === state.currentSubFilter);
          } else {
            mSub = data.region === state.currentSubFilter;
          }
        }

        const dataType = data.type || (data.id?.toString().startsWith('s-db-') ? 'tourist' : 'memory');
        let mType = true;
        if (dataType === 'tourist' && !state.showTourist) mType = false;
        if (dataType === 'memory'  && !state.showMemory)  mType = false;

        const visible = mS && mC && mSub && mType;
        if (visible) {
            if (!state.clusterGroup.hasLayer(marker)) toAdd.push(marker);
        } else {
            if (state.clusterGroup.hasLayer(marker)) toRemove.push(marker);
        }
    }

    currentIdx += CHUNK_SIZE;
    if (currentIdx < markersArray.length) {
        // [YIELDING] 다음 프레임까지 양보
        await new Promise(r => requestAnimationFrame(r));
        return processChunk();
    } else {
        // [COMMIT] 최종 변경사항 반영 (클러스터링은 addLayers 사용 시 다량 유입도 최적화되어 작동)
        if (toAdd.length > 0) state.clusterGroup.addLayers(toAdd);
        if (toRemove.length > 0) state.clusterGroup.removeLayers(toRemove);

        // ⭐ [STELLAR-EDGE] 검색 결과 반영 후 태그 검색일 경우 연결 시각화 업데이트
        if (isTagSearch) {
            VisualizerCenter.highlightTagLinkage(q);
        } else if (q === "") {
            VisualizerCenter.clearTagLinkage();
        }

        return true;
    }
  };

  return processChunk();
}

export function flyToFilteredResults() {
  const visibleMarkers = [];
  state.markers.forEach(({ marker }) => {
    if (state.clusterGroup.hasLayer(marker)) {
      visibleMarkers.push(marker.getLatLng());
    }
  });

  if (visibleMarkers.length > 0) {
    const bounds = L.latLngBounds(visibleMarkers);
    if (visibleMarkers.length === 1) {
      state.map.flyTo(visibleMarkers[0], 13, { duration: 1.5 });
    } else {
      state.map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 1.5 });
    }
  } else {
    const qRaw = state.searchQuery.replace(/[@#]/g, " ");
    const words = qRaw.split(/\s+/);
    for (const word of words) {
      if (word && REGION_COORDS[word]) {
        state.map.flyTo(REGION_COORDS[word], 10, { duration: 1.5 });
        break;
      }
    }
  }
}
