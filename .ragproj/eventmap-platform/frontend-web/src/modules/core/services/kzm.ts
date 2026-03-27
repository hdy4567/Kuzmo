/**
 * 📦 KZM Library - Kuzmo Memory Packet (v31.0-TS)
 * Cross-platform memory format (.kzm)
 */

import { EventItem, KzmPacket } from '../../../types/index.ts';

/**
 * 이벤트 데이터 → .kzm Blob 패킹
 */
export async function packKzm(ev: EventItem): Promise<Blob> {
    const files: Record<string, string> = {};
    const mediaMap: Record<string, string> = {};

    const mdContent = buildMarkdown(ev);
    files['content.md'] = btoa(unescape(encodeURIComponent(mdContent)));
    mediaMap['content.md'] = 'note';

    if (ev.imageUrl && ev.imageUrl !== 'null') {
        try {
            const blob = await fetchBlobSafe(ev.imageUrl);
            if (blob) {
                files['thumbnail.jpg'] = await blobToBase64(blob);
                mediaMap['thumbnail.jpg'] = 'thumbnail';
            }
        } catch { /* Silent skip on media fail */ }
    }

    if (ev.audioUrl && ev.audioUrl !== 'null') {
        try {
            const blob = await fetchBlobSafe(ev.audioUrl);
            if (blob) {
                const ext = getExtension(ev.audioUrl) || 'mp3';
                const audioKey = `voice.${ext}`;
                files[audioKey] = await blobToBase64(blob);
                mediaMap[audioKey] = 'audio';
            }
        } catch { /* Silent skip on audio fail */ }
    }

    const packet: KzmPacket = {
        _kzm: '1.0',
        manifest: {
            id: ev.id,
            title: ev.title || '',
            lat: ev.lat,
            lng: ev.lng,
            region: ev.region || 'Unknown',
            tags: ev.tags || [],
            category: ev.type || ev.category || 'memory',
            timestamp: ev.timestamp || Date.now(),
            snippet: buildSnippet(ev),
            sketch: ev.sketch_ai || null,
            mediaMap,
        },
        files,
    };

    const json = JSON.stringify(packet);
    return new Blob([json], { type: 'application/x-kzm' });
}

/**
 * .kzm Blob / JSON 문자열 → 이벤트 객체 로드
 */
export async function unpackKzm(input: Blob | string): Promise<EventItem> {
    let json: string;
    if (input instanceof Blob) {
        json = await input.text();
    } else {
        json = input;
    }
    const packet = JSON.parse(json) as KzmPacket;

    if (!packet._kzm) throw new Error('Invalid .kzm packet');

    const { manifest, files } = packet;
    let imageUrl: string | null = null;
    let audioUrl: string | null = null;

    if (files) {
        for (const [name, b64] of Object.entries(files)) {
            const role = manifest.mediaMap?.[name];
            const blob = base64ToBlob(b64, guessMime(name));
            const blobUrl = createKzmUrl(blob);

            if (role === 'thumbnail') imageUrl = blobUrl;
            else if (role === 'audio') audioUrl = blobUrl;
        }
    }

    const ev: EventItem = {
        id: manifest.id,
        title: manifest.title,
        lat: manifest.lat,
        lng: manifest.lng,
        region: manifest.region,
        tags: manifest.tags,
        type: manifest.category,
        timestamp: manifest.timestamp,
        summary: manifest.snippet,
        content: files?.['content.md']
            ? decodeURIComponent(escape(atob(files['content.md'])))
            : manifest.snippet,
        imageUrl,
        audioUrl,
        _kzmPacket: packet, 
    };

    return ev;
}

/**
 * IndexedDB 슬림 캐시용 썸네일 추출
 */
export async function extractThumbnail(imageUrl: string | null): Promise<Blob | null> {
    if (!imageUrl || imageUrl === 'null') return null;
    try {
        const blob = await fetchBlobSafe(imageUrl);
        if (!blob) return null;

        const bmp = await createImageBitmap(blob, {
            resizeWidth: 200,
            resizeHeight: 200,
            resizeQuality: 'medium',
        });

        const canvas = new OffscreenCanvas(200, 200);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(bmp, 0, 0);
        return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
    } catch {
        return null;
    }
}

export async function buildSlimRecord(ev: EventItem): Promise<any> {
    const thumbnailBlob = await extractThumbnail(ev.imageUrl || null);
    return {
        id: ev.id,
        title: ev.title,
        lat: ev.lat,
        lng: ev.lng,
        region: ev.region || 'Unknown',
        tags: ev.tags || [],
        timestamp: ev.timestamp || Date.now(),
        last_modified: ev.last_modified || ev.timestamp || Date.now(),
        snippet: buildSnippet(ev),
        thumbnailBlob: thumbnailBlob || null,
        packetDriveId: ev.packetDriveId || null,
        localKzmPath: ev.localKzmPath || null,
        syncFingerprint: ev.syncFingerprint || null,
        sync_status: ev.sync_status || 'synced',
        type: ev.type || 'memory',
        sketch_ai: ev.sketch_ai || null,
        semantic: ev.sketch_ai?.semantic || ev.summary?.substring(0, 100) || "",
    };
}

/**
 * 🖌️ [SVG-TRANSMUTER] Convert Stroke Sequence to XML-ready SVG
 */
export function transmuteToSVG(strokeSequence: number[][], semanticHint = "rough sketch") {
    if (!strokeSequence || !Array.isArray(strokeSequence) || strokeSequence.length === 0) return { svg: "", semantic: "" };

    const components: Record<number, number[][]> = {};
    strokeSequence.forEach(p => {
        const [x, y, , , cid] = p;
        if (!components[cid]) components[cid] = [];
        components[cid].push([x, y]);
    });

    let paths = "";
    Object.values(components).forEach(strokePoints => {
        const simplified = simplifyStrokes(strokePoints, 2.0);
        if (simplified.length < 2) return;

        let d = `M ${simplified[0][0]} ${simplified[0][1]}`;
        for (let i = 1; i < simplified.length; i++) {
            d += ` L ${simplified[i][0]} ${simplified[i][1]}`;
        }
        paths += `<path d="${d}" fill="none" stroke="black" stroke-width="2" />`;
    });

    const box = calculateBoundingBox(strokeSequence);
    return {
        svg: `<svg viewBox="${box.minX} ${box.minY} ${box.width} ${box.height}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`,
        semantic: semanticHint
    };
}

function calculateBoundingBox(points: number[][]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
    });
    return {
        minX: Math.floor(minX - 5),
        minY: Math.floor(minY - 5),
        width: Math.ceil(maxX - minX + 10),
        height: Math.ceil(maxY - minY + 10)
    };
}


// 🛰️ [GEOMETRY-HELPER] Simplified Strokes
function simplifyStrokes(points: number[][], tolerance = 1.0): number[][] {
    if (points.length <= 2) return points;
    const sqTolerance = tolerance * tolerance;
    const simplified: number[][] = [points[0]];

    function simplifyRecursive(startIdx: number, endIdx: number) {
        let maxSqDist = 0;
        let index = -1;
        for (let i = startIdx + 1; i < endIdx; i++) {
            const sqDist = getSqSegDist(points[i], points[startIdx], points[endIdx]);
            if (sqDist > maxSqDist) {
                maxSqDist = sqDist;
                index = i;
            }
        }
        if (maxSqDist > sqTolerance && index !== -1) {
            simplifyRecursive(startIdx, index);
            simplified.push(points[index]);
            simplifyRecursive(index, endIdx);
        }
    }

    simplifyRecursive(0, points.length - 1);
    simplified.push(points[points.length - 1]);
    return simplified;
}

function getSqSegDist(p: number[], p1: number[], p2: number[]): number {
    let x = p1[0], y = p1[1], dx = p2[0] - x, dy = p2[1] - y;
    if (dx !== 0 || dy !== 0) {
        let t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) { x = p2[0]; y = p2[1]; }
        else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p[0] - x; dy = p[1] - y;
    return dx * dx + dy * dy;
}

const activeBlobUrls = new Set<string>();

export function revokeAllKzmUrls(): void {
    activeBlobUrls.forEach(url => URL.revokeObjectURL(url));
    activeBlobUrls.clear();
}

function buildSnippet(ev: EventItem): string {
    const raw = ev.content || ev.description || ev.summary || '';
    const lines = raw.trim().split('\n').filter((l: string) => l.trim());
    return lines.slice(0, 2).join(' ').substring(0, 120);
}

export function buildMarkdown(ev: EventItem): string {
    const yaml = [
        '---',
        `id: "${ev.id}"`,
        `title: "${(ev.title || '').replace(/"/g, '\\"')}"`,
        `timestamp: ${ev.timestamp || Date.now()}`,
        `tags: [${(ev.tags || []).map((t: string) => `"${t}"`).join(', ')}]`,
        `location: { lat: ${ev.lat || 0}, lng: ${ev.lng || 0} }`,
        `address: "${(ev.address || '').replace(/"/g, '\\"')}"`,
        `type: "${ev.type || 'memory'}"`,
        '---'
    ].join('\n');


    let content = `# ${ev.title || 'Untitled'}\n\n`;
    content += `> [!INFO] **Location:** ${ev.address || 'Unknown'}\n`;
    content += `> **Date:** ${new Date(ev.timestamp!).toLocaleString()}\n\n`;
    if (ev.description || ev.content || ev.summary) {
        content += `## Description\n${ev.description || ev.content || ev.summary}\n\n`;
    }
    return `${yaml}\n\n${content}`;
}

async function fetchBlobSafe(url: string): Promise<Blob | null> {
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) return null;
    return res.blob();
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function base64ToBlob(b64: string, mime: string): Blob {
    const binary = atob(b64);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

function createKzmUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    activeBlobUrls.add(url);
    return url;
}

function guessMime(filename: string): string {
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
    if (filename.endsWith('.png')) return 'image/png';
    if (filename.endsWith('.mp3')) return 'audio/mpeg';
    if (filename.endsWith('.md')) return 'text/markdown';
    return 'application/octet-stream';
}

function getExtension(url: string): string | null {
    try {
        const path = new URL(url).pathname;
        const parts = path.split('.');
        return parts.length > 1 ? parts[parts.length - 1] : null;
    } catch { return null; }
}
