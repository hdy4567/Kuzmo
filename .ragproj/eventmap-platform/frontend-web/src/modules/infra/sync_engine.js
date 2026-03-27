import { state, CONFIG, saveToDB } from '../core/state.js';

/**
 * ⚡ [KUZMO-SYNC-CORE] Professional Serverless P2P Sync Engine (v26.5.5)
 */
export class SyncEngine {
    static IS_ACTIVE = false;
    static POLLING_INTERVAL = 45000; 
    static DEVICE_ID = `KZM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    static SYNC_KEY = null;
    
    static peers = new Map(); // peerId -> { pc, dc, status }
    static currentOffer = null;

    /** 🚀 [EXECUTE] SpaceX-level system startup */
    static async start() {
        if (this.IS_ACTIVE || !state.isLockerSynced || !state.lockerFolderId) return;
        this.IS_ACTIVE = true;
        
        console.log(`📡 [SYNC] Engine Active: ${this.DEVICE_ID}`);
        
        // 1. 보안 키 유도 (WebCrypto)
        await this.deriveSyncKey();

        // 2. WebRTC 준비 및 Presence 등록
        await this.prepareWebRTC();
        await this.updatePresence();
        
        // 3. 루프 가동
        this.startPolling();
        this.startDirtyMonitor();
    }

    /** 🔐 [SECURITY] Derive AES-GCM 256-bit Sync Key from User Secret */
    static async deriveSyncKey() {
        const secret = localStorage.getItem('kuzmo_sync_secret') || "KUZMO_DEFAULT_PASS";
        const encoder = new TextEncoder();
        const data = encoder.encode(secret);
        const salt = encoder.encode("KuzmoSpaceXSync");
        
        const baseKey = await crypto.subtle.importKey("raw", data, "PBKDF2", false, ["deriveKey"]);
        this.SYNC_KEY = await crypto.subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
            baseKey,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }

    /** 🧊 [P2P-SIGNALING] Start Session negotiation */
    static async prepareWebRTC() {
        try {
            const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            const dc = pc.createDataChannel("KuzmoSecureTunnel");
            
            pc.onicecandidate = (e) => {
                if (e.candidate) this.pushSignal('CANDIDATE', e.candidate);
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.currentOffer = offer;
            
            this.localPC = pc;
            this.localDC = dc;
            
            dc.onopen = () => console.log("✨ [P2P] Secure Tunnel Established.");
            dc.onmessage = (e) => this.onDirectMessage(e.data);
        } catch (err) { console.warn("P2P Prep Fail:", err); }
    }

    /** 📦 [SIGNALING] Send lightweight signal to GDrive Folder */
    static async pushSignal(type, payload) {
        try {
            const feedFolderId = await this.ensureSubFolder('feed');
            const fileName = `sig_${Date.now()}_${this.DEVICE_ID}.json`;
            const content = JSON.stringify({ device: this.DEVICE_ID, type, payload });
            
            const metadata = { name: fileName, parents: [feedFolderId], mimeType: 'application/json' };
            const token = gapi.client.getToken().access_token;
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([content], { type: 'application/json' }));

            await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            });
        } catch (_) {}
    }

    /** 👥 [PRESENCE] Heartbeat & SDP broadcast */
    static async updatePresence() {
        if (!state.lockerFolderId) return;
        try {
            const presFolderId = await this.ensureSubFolder('presence');
            const fileName = `device_${this.DEVICE_ID}.json`;
            const content = JSON.stringify({
                id: this.DEVICE_ID,
                status: 'online',
                last: Date.now(),
                sdp: this.currentOffer
            });
            
            const search = await gapi.client.drive.files.list({
                q: `name = '${fileName}' and '${presFolderId}' in parents and trashed = false`
            });
            const existingId = search.result.files[0]?.id;
            const token = gapi.client.getToken().access_token;
            
            if (existingId) {
                await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`, {
                    method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` }, body: content
                });
            } else {
                const metadata = { name: fileName, parents: [presFolderId], mimeType: 'application/json' };
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', new Blob([content], { type: 'application/json' }));
                await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form
                });
            }
            await this.scanPeers(presFolderId);
        } catch (_) {}
    }

    static async scanPeers(folderId) {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and name != 'device_${this.DEVICE_ID}.json' and trashed = false`
        });
        for (const file of response.result.files || []) {
            const peerResp = await gapi.client.drive.files.get({ fileId: file.id, alt: 'media' });
            const peer = typeof peerResp.result === 'string' ? JSON.parse(peerResp.result) : peerResp.result;
            if (peer.status === 'online' && peer.sdp && !this.peers.has(peer.id)) {
                await this.connectToPeer(peer);
            }
        }
    }

    static async connectToPeer(peer) {
        console.log(`🔗 [P2P] Attempting Link: ${peer.id}`);
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc.onicecandidate = (e) => { if (e.candidate) this.pushSignal('CANDIDATE', e.candidate); };
        pc.ondatachannel = (e) => {
            const dc = e.channel;
            dc.onopen = () => console.log(`🚀 [P2P] Linked with ${peer.id}`);
            dc.onmessage = (ev) => this.onDirectMessage(ev.data);
            this.peers.set(peer.id, { pc, dc });
        };
        await pc.setRemoteDescription(new RTCSessionDescription(peer.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.pushSignal('ANSWER', { target: peer.id, sdp: answer });
    }

    /** 📥 [RECONCILIATION] Handle direct P2P data */
    static onDirectMessage(data) {
        try {
            const msg = JSON.parse(data);
            if (msg.type === 'SYNC_PUSH') {
                this.reconcile(msg.data);
            }
        } catch (_) {}
    }

    static async reconcile(externalRecord) {
        const { EventDB } = await import('../core/db.js');
        const local = await EventDB.get?.(externalRecord.id);
        
        // [CONFLICT-RESOLUTION] Last Write Wins (LWW)
        if (!local || (externalRecord.last_modified > (local.last_modified || 0))) {
            console.log(`🏥 [HEAL] Merging Remote Update: ${externalRecord.id}`);
            await EventDB.put({ ...externalRecord, sync_status: 'synced' });
            // UI Trigger
            import('../features/search.js').then(m => m.filterMarkers());
        }
    }

    /** 🕵️ [DIRTY-LOOP] SpaceX-grade 30s background audit */
    static startDirtyMonitor() {
        setInterval(async () => {
            const { EventDB } = await import('../core/db.js');
            const db = await EventDB.open();
            const tx = db.transaction('events', 'readonly');
            tx.objectStore('events').index('sync_status').getAll('dirty').onsuccess = (e) => {
                const dirties = e.target.result || [];
                for (const d of dirties) this.broadcastChange(d);
            };
        }, 30000);
    }

    static async broadcastChange(record) {
        // 1. P2P (Real-time)
        this.peers.forEach(p => {
            if (p.dc.readyState === 'open') {
                p.dc.send(JSON.stringify({ type: 'SYNC_PUSH', data: record }));
            }
        });
        
        // 2. Cloud Fallback (Feed)
        await this.pushChange(record.id);
        this.markSyncStatus(record.id, 'pending');
    }

    static async pushChange(eventId) {
        try {
            const feedFolderId = await this.ensureSubFolder('feed');
            const metadata = { name: `diff_${Date.now()}_${this.DEVICE_ID}.json`, parents: [feedFolderId] };
            const content = JSON.stringify({ dev: this.DEVICE_ID, id: eventId, op: 'UPD' });
            const token = gapi.client.getToken().access_token;
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([content], { type: 'application/json' }));
            await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form
            });
        } catch (_) {}
    }

    static async markSyncStatus(id, status) {
        const { EventDB } = await import('../core/db.js');
        const db = await EventDB.open();
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        store.get(id).onsuccess = (e) => {
            const record = e.target.result;
            if (record) { record.sync_status = status; store.put(record); }
        };
    }

    static async pollChanges() {
        if (!state.lockerFolderId) return;
        try {
            const feedFolderId = await this.ensureSubFolder('feed');
            const resp = await gapi.client.drive.files.list({
                q: `'${feedFolderId}' in parents and trashed = false`,
                orderBy: "createdTime desc", pageSize: 20, fields: "files(id, name, createdTime)"
            });
            const lastSync = localStorage.getItem('kuzmo_last_sync') || 0;
            let newest = lastSync;
            for (const f of resp.result.files || []) {
                const fTime = new Date(f.createdTime).getTime();
                if (fTime <= lastSync) break;
                
                const changeResp = await gapi.client.drive.files.get({ fileId: f.id, alt: 'media' });
                const msg = typeof changeResp.result === 'string' ? JSON.parse(changeResp.result) : changeResp.result;
                
                if (msg.device === this.DEVICE_ID || msg.dev === this.DEVICE_ID) continue;

                // 📡 [CASE 1] WebRTC Signaling
                if (f.name.startsWith('sig_')) {
                    await this.handleSignaling(msg);
                } 
                // 📦 [CASE 2] Data Update
                else if (f.name.startsWith('diff_')) {
                    await this.applyChange(msg.id);
                }
                
                if (fTime > newest) newest = fTime;
            }
            localStorage.setItem('kuzmo_last_sync', newest);
        } catch (_) {}
    }

    static async handleSignaling(sig) {
        if (sig.type === 'ANSWER' && sig.payload.target === this.DEVICE_ID) {
            console.log(`📡 [P2P] Answer Received from ${sig.device}`);
            if (this.localPC) {
                await this.localPC.setRemoteDescription(new RTCSessionDescription(sig.payload.sdp));
            }
        } else if (sig.type === 'CANDIDATE' && (!sig.payload.target || sig.payload.target === this.DEVICE_ID)) {
            console.log(`📡 [P2P] ICE Candidate from ${sig.device}`);
            const peer = this.peers.get(sig.device);
            if (peer && peer.pc) {
                await peer.pc.addIceCandidate(new RTCIceCandidate(sig.payload));
            } else if (this.localPC && sig.device !== this.DEVICE_ID) {
                await this.localPC.addIceCandidate(new RTCIceCandidate(sig.payload));
            }
        }
    }

    static async applyChange(id) { 
        console.log(`📥 [SYNC] Heal Trigger: ${id}`);
        // Full Refresh fallback
        const { loadEventsFromDrive } = await import('./auth.js');
        await loadEventsFromDrive();
    }

    static async ensureSubFolder(name) {
        const cacheKey = `kuzmo_f_id_${name}`;
        let folderId = localStorage.getItem(cacheKey);
        if (!folderId) {
            const search = await gapi.client.drive.files.list({
                q: `name = '.kuzmo_sync_${name}' and '${state.lockerFolderId}' in parents and trashed = false`
            });
            folderId = search.result.files[0]?.id;
            if (!folderId) {
                const resp = await gapi.client.drive.files.create({ 
                    resource: { name: `.kuzmo_sync_${name}`, mimeType: 'application/vnd.google-apps.folder', parents: [state.lockerFolderId] }
                });
                folderId = resp.result.id;
            }
            localStorage.setItem(cacheKey, folderId);
        }
        return folderId;
    }

    static startPolling() {
        setInterval(() => this.pollChanges(), this.POLLING_INTERVAL);
        setInterval(() => this.updatePresence(), 300000);
    }
}
