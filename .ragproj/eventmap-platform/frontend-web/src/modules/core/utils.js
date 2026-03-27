/**
 * 🛠 Utility Helpers & Factory Functions
 */

/**
 * 🚀 Event Object Factory
 * 모든 이벤트(메모, 크롤링 데이터 등)의 형식을 통일합니다.
 */
export function createEventObject({
    id,
    title,
    summary,
    tags = [],
    lat,
    lng,
    imageUrl,
    region = "Global",
    country = "Unknown",
    raw_strokes = null, // 🛰️ [GEMINI-READY] Raw numerical data
}) {
    // ID가 없으면 자동 생성
    const finalId = id || `kuzmo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // 기본 이미지 처리
    const finalImageUrl = imageUrl || `https://picsum.photos/seed/${encodeURIComponent(title + lat + lng)}/400/300`;

    // 국가 자동 판별 고도화 (v11.6)
    let finalCountry = country;
    if (country === "Unknown") {
        const japanKeywords = ["일본", "Japan", "도쿄", "오사카", "교토", "후쿠오카", "삿포로", "오키나와", "나고야", "요코하마", "하코네", "나라", "고베", "히로시마"];
        if (tags.some(t => japanKeywords.some(kw => t.includes(kw)))) {
            finalCountry = "Japan";
        } else {
            finalCountry = "Korea";
        }
    }

    // 마커 타입 결정 (분류 기준 생성 시 확정)
    let markerType = 'unknown';
    if (finalId.startsWith('s-db-')) markerType = 'tourist';
    else if (finalId.startsWith('kuzmo-')) markerType = 'memory';
    else if (finalId.startsWith('sketch-')) markerType = 'sketch';

    return {
        id: finalId,
        title: title || "이름 없는 장소",
        summary: summary || "내용 없음",
        tags: Array.isArray(tags) ? tags : [],
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        imageUrl: finalImageUrl,
        region,
        country: finalCountry,
        timestamp: Date.now(),
        type: markerType,
        raw_strokes: raw_strokes || null
    };
}

/**
 * 📍 Jittering (좌표 미세 분산)
 */
export function applyJitter(lat, lng, amount = 0.015) {
    return {
        lat: lat + (Math.random() - 0.5) * amount,
        lng: lng + (Math.random() - 0.5) * amount
    };
}
/**
 * 📍 Geodesic Distance (Haversine Formula) - Unit: KM
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth Radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * 🧠 [SOTA] Cosine Similarity for high-dimensional vectors (Embeddings)
 */
export function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const magA = Math.sqrt(normA);
    const magB = Math.sqrt(normB);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
}

/**
 * 📂 [KZM-BRIDGE] .kzm 패킷으로 선택된 항목을 PC에 언패킹 (v2.0)
 */
/**
 * 📂 [KZM-BRIDGE] 3단계 폴백 내보내기 시스템 (v25.5)
 * 
 * 1단계: C# Bridge (9091) - 바탕화면 Kuzmo_Exports에 실제 파일 생성
 * 2단계: File System Access API - 브라우저에서 사용자 지정 폴더에 직접 저장
 * 3단계: 브라우저 다운로드 - 다운로드 폴더에 자동 저장
 */
export async function syncToLocalFilesystem(selectedItems) {
    if (!selectedItems || selectedItems.length === 0) return null;

    const { packKzm } = await import('./services/kzm.ts');

    // --- 공통: .kzm 패킷 생성 ---
    const packets = [];
    const blobs = [];
    for (const ev of selectedItems) {
        try {
            const blob = await packKzm(ev);
            const json = JSON.parse(await blob.text());
            const safeTitle = (ev.title || 'untitled').replace(/[\/\\?%*:|"<>\s]/g, '_');
            packets.push(json);
            blobs.push({ blob, name: `${safeTitle}_${String(ev.id).substring(0, 8)}.kzm` });
        } catch (e) {
            console.warn(`[KZM] Pack fail for ${ev.title}:`, e);
        }
    }

    if (packets.length === 0) return null;

    // 🔴 [1단계] C# Bridge 시도 (9091)
    try {
        const response = await fetch('http://localhost:9091/api/sync/kzm-export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packets })
        });
        if (response.ok) {
            const result = await response.json();
            console.log(`🚀 [C#-BRIDGE] ${result.count} files → `, result.path);
            return result;
        }
    } catch (_) {
        console.info('[KZM] C# Bridge offline. Trying File System Access API...');
    }

    // 🟡 [2단계] File System Access API (Chrome/Edge)
    if ('showDirectoryPicker' in window) {
        try {
            const { EventDB } = await import('./db.js');
            let dirHandle = await EventDB.getHandle('last_export_dir');
            
            // 🔄 [RESTORE] 캐시된 핸들 검증 및 권한 요청
            if (dirHandle) {
                const opt = { mode: 'readwrite' };
                if (await dirHandle.queryPermission(opt) !== 'granted') {
                    if (await dirHandle.requestPermission(opt) !== 'granted') {
                        dirHandle = null; // 권한 거부 시 다시 선택 유도
                    }
                }
            }

            // 📂 [PICKER] 캐시 없거나 거부 시 새로 선택
            if (!dirHandle) {
                dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                await EventDB.setHandle('last_export_dir', dirHandle);
            }

            for (const { blob, name } of blobs) {
                const fileHandle = await dirHandle.getFileHandle(name, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            }
            console.log(`✅ [FS-API] ${blobs.length} .kzm files saved →`, dirHandle.name);
            return { count: blobs.length, path: dirHandle.name };
        } catch (err) {
            if (err.name === 'AbortError') return null; // 사용자가 취소
            console.warn('[FS-API] Failed:', err);
        }
    }

    // ⛔ [LEGACY-SHUTDOWN] 브라우저 기본 다운로드 폴백 제거 (v25.0)
    // 더 이상 다운로드 폴더에 파일을 뿌려 UX를 방해하지 않습니다.
    return null;
}
