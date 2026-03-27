import { state, REGION_COORDS } from '../core/state.js';
import { filterMarkers } from './search.js';
import { renderSubTabs, showToast } from '../view/ui/ui_base.js';
import { VisualizerCenter } from '../view/map/visualizer_center.js';

/**
 * 🗺️ Navigation & Filtering Logic (v25.0)
 */

export function switchCountry(country, index) {
    // 🎨 [PRIORITY-1] Instant UI Reflow (Synchronous)
    state.currentCountry = country;
    state.currentSubFilter = "전체";
    
    // ⭐ [GRAPH-EXIT] 탭 전환 시 연결선 및 디밍 제거
    VisualizerCenter.clearTagLinkage();

    const indicator = document.getElementById('tab-indicator');
    if (indicator) indicator.style.transform = `translateX(${index * 100}%)`;
    
    document.querySelectorAll('.country-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });

    // 🕊️ [PRIORITY-2] Async Heavy Processing (Decoupled)
    // requestAnimationFrame을 통해 '탭 활성화' 애니메이션이 먼저 끝난 뒤 데이터 처리를 시작하게 함
    requestAnimationFrame(async () => {
        // 📍 Map Update (Low Latency)
        if (country === "Korea") {
            state.map.flyTo([37.5665, 126.9780], 7);
        } else if (country === "Japan") {
            state.map.flyTo([35.6762, 139.6503], 7);
        }

        renderSubTabs();
        
        // 🚀 [CONCURRENT-FILTER] 랙 없이 대량 마커 필터링
        await Promise.resolve(); // 마이크로태스크 대기
        filterMarkers();
    });
}

export function setSubFilter(filter) {
    state.currentSubFilter = filter;
    renderSubTabs();
    
    if (filter === "전체") {
        VisualizerCenter.clearTagLinkage(); // ⭐ 연결 해제
        filterMarkers();
        return;
    }

    // ⭐ [STELLAR-EDGE] 3차 필터가 태그일 경우 연결 시각화 가동
    if (filter.startsWith('#') || filter.startsWith('@')) {
        VisualizerCenter.highlightTagLinkage(filter);
    } else {
        VisualizerCenter.clearTagLinkage();
    }

    // 📍 해당 지역으로 지도 이동 및 Glow 효과
    if (REGION_COORDS[filter]) {
        state.map.flyTo(REGION_COORDS[filter], 10);
        
        // ✨ Enterprise Glow Interaction
        const glow = document.getElementById('region-glow');
        if (glow) {
            glow.classList.add('active');
            setTimeout(() => glow.classList.remove('active'), 1500);
        }
    }

    filterMarkers();
}

export function filterByTag(tag) {
    state.searchQuery = tag;
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = tag;
    
    // ⭐ [STELLAR-EDGE] 검색창을 통한 태그 필터 시에도 시각화 가동
    if (tag.startsWith('#') || tag.startsWith('@')) {
        VisualizerCenter.highlightTagLinkage(tag);
    }

    filterMarkers();
    showToast(`태그 필터: ${tag}`, 'info');
}
