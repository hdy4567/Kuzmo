/**
 * 🔐 [PURE-LOGIC] Auth & Google Drive Service Layer (v31.0-TS)
 */

import { state, CONFIG, saveToDB } from '../state.js';
import { EventItem } from '../../../types/index.ts';

declare const google: any;
declare const gapi: any;

let tokenClient: any;
const syncFingerprints = new Map<string, string>();
let isSyncing = false;

/**
 * 🚀 [INIT] GAPI 및 Google Identity 초기화
 */
export async function initGoogleAuth(): Promise<void> {
  try {
    const { waitForScripts, startGapi: startGapiUtil } = await import('../../infra/auth_utils.js');
    await waitForScripts();
    await startGapiUtil(CONFIG.apiKey, CONFIG.clientId);

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.clientId,
      scope: CONFIG.scopes,
      callback: (resp: any) => { 
        if (resp.access_token) {
          state.isLockerSynced = true;
          localStorage.setItem('is_locker_synced', 'true');
          
          import('../../view/ui/auth_handler.js').then(m => m.AuthUIHandler.onLoginSuccess());
          loadEventsFromDrive();
          import('../../infra/sync_engine.js').then(m => m.SyncEngine.start());
        }
      }
    });

    if (state.isLockerSynced) {
        setTimeout(() => { tokenClient.requestAccessToken({ prompt: '' }); }, 1000);
    }
  } catch (err) {
    console.error("🔐 [AUTH] Initialization Failure:", err);
  }
}

/**
 * ☁️ [CLOUD RESTORE] 클라우드 저장소에서 데이터 복구
 */
export async function loadEventsFromDrive(): Promise<void> {
    if (!state.lockerFolderId) return;
    
    try {
        const { AuthUIHandler } = await import('../../view/ui/auth_handler.js');
        const { EventDB } = await import('../db.js');
        const { buildSlimRecord } = await import('./kzm.ts');

        AuthUIHandler.onInfo("클라우드 보관함 데이터를 확인 중입니다...");

        const manifestName = "kuzmo_manifest.v1.json";
        const search = await gapi.client.drive.files.list({
            q: `name = '${manifestName}' and '${state.lockerFolderId}' in parents and trashed = false`,
            fields: "files(id)"
        });

        const manifestId = (search.result.files as any[])[0]?.id;
        if (!manifestId) {
            console.log("☁️ No cloud manifest found. Falling back to legacy/kzm logic.");
            return legacyRestore();
        }

        const response = await gapi.client.drive.files.get({ fileId: manifestId, alt: 'media' });
        const manifest = typeof response.result === 'string' ? JSON.parse(response.result) : response.result;

        if (manifest.chunks) {
            let restoredCount = 0;
            for (const [, fileId] of Object.entries(manifest.chunks)) {
                try {
                    const chunkResp = await gapi.client.drive.files.get({ fileId: fileId as string, alt: 'media' });
                    const chunkData = typeof chunkResp.result === 'string' ? JSON.parse(chunkResp.result) : chunkResp.result;
                    
                    if (Array.isArray(chunkData)) {
                        for (const ev of chunkData as EventItem[]) {
                            if (!state.eventStore.some((m: any) => String(m.id) === String(ev.id))) {
                                (state.eventStore as any[]).push(ev);
                                (state.existingIds as Set<string>).add(String(ev.id));


                                restoredCount++;
                                import('../../view/map/index.js').then(m => m.addMarkerToMap(ev));
                                
                                const slim = await buildSlimRecord(ev);
                                await EventDB.put(slim);
                            }
                        }
                    }
                } catch (chunkErr) { console.warn(`Failed to load chunk:`, chunkErr); }
            }
            
            if (restoredCount > 0) {
                AuthUIHandler.onRestoreProgress(restoredCount);
                import('../../features/search.js').then(m => m.filterMarkers());
            }
        }
    } catch (err) { console.error("Cloud Restore Error:", err); }
}

async function legacyRestore(): Promise<void> {
    try {
        const { AuthUIHandler } = await import('../../view/ui/auth_handler.js');
        const search = await gapi.client.drive.files.list({
            q: `name = 'kuzmo_metadata.json' and '${state.lockerFolderId}' in parents and trashed = false`,
            fields: "files(id)"
        });
        const fileId = (search.result.files as any[])[0]?.id;
        if (!fileId) return;
        
        const response = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
        const cloudData = typeof response.result === 'string' ? JSON.parse(response.result) : response.result;
        
        if (Array.isArray(cloudData)) {
            let count = 0;
            for (const ev of cloudData as EventItem[]) {
                if (!state.eventStore.some((m: any) => String(m.id) === String(ev.id))) {
                    (state.eventStore as any[]).push(ev);
                    (state.existingIds as Set<string>).add(String(ev.id));
                    count++;
                }

            }

            if (count > 0) {
                saveToDB(); 
                AuthUIHandler.onInfo(`레거시 데이터 ${count}건 복구 완료`);
                import('../../view/map/index.js').then(m => state.eventStore.forEach(e => m.addMarkerToMap(e)));
                AuthUIHandler.onRestoreProgress(count);
            }
        }
    } catch (err) { console.warn("Legacy Restore Fail:", err); }
}

/**
 * 🔗 [USER-ACTION] 로그인 버튼 핸들러
 */
export function handleAuthClick(): void {
  if (!tokenClient) return;
  tokenClient.callback = async (resp: any) => {
    if (resp.error) return;
    state.isLockerSynced = true;
    localStorage.setItem('is_locker_synced', 'true');
    import('../../view/ui/auth_handler.js').then(m => m.AuthUIHandler.onLoginSuccess());
    loadEventsFromDrive();
  };

  if (gapi.client.getToken() === null && !state.isLockerSynced) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

/**
 * 📂 [PICKER] Google Picker API
 */
export function showPicker(): void {
  const token = gapi.client.getToken();
  if (!token) return handleAuthClick();

  const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
    .setSelectFolderEnabled(true)
    .setIncludeFolders(true)
    .setMimeTypes('application/vnd.google-apps.folder');

  const picker = new google.picker.PickerBuilder()
    .addView(view)
    .setOAuthToken(token.access_token)
    .setDeveloperKey(CONFIG.apiKey)
    .setAppId(CONFIG.appId) 
    .setOrigin(window.location.origin)
    .setCallback(async (data: any) => {
        if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            selectLockerFolder(doc.name, doc.id);
        }
    })
    .build();
  
  picker.setVisible(true);
}

export async function selectLockerFolder(name: string, id: string): Promise<void> {
    state.lockerFolderName = name;
    state.lockerFolderId = id;
    localStorage.setItem('locker_folder_name', name);
    localStorage.setItem('locker_folder_id', id);
    
    const { AuthUIHandler } = await import('../../view/ui/auth_handler.js');
    AuthUIHandler.onInfo(`연동 성공: [${name}]`);
    AuthUIHandler.onLoginSuccess();
}

/**
 * 📦 [MARKDOWN SYNC] 개별 .md 파일로 보관함 데이터 동기화
 */
export async function syncEventsToDrive(): Promise<void> {
    if (!state.lockerFolderId || isSyncing) return;
    isSyncing = true;

    try {
        const { AuthUIHandler } = await import('../../view/ui/auth_handler.js');
        
        const existingFilesResponse = await gapi.client.drive.files.list({
            q: `'${state.lockerFolderId}' in parents and trashed = false and mimeType = 'text/markdown'`,
            fields: "files(id, name)"
        });
        const driveFileMap = new Map((existingFilesResponse.result.files as any[]).map(f => [f.name, f.id]));

        let syncCount = 0;
        for (const ev of state.eventStore as EventItem[]) {
            const fileName = `${(ev.title || 'untitled').replace(/[\\/:*?"<>|]/g, '_')}_${String(ev.id).substring(0, 6)}.md`;
            const content = generateMarkdown(ev);
            const currentHash = content.length + "_" + (ev.tags?.length || 0);

            if (syncFingerprints.get(ev.id) === currentHash) continue;

            const existingId = driveFileMap.get(fileName);
            const fileId = await uploadMarkdownFile(fileName, content, state.lockerFolderId, existingId);
            
            if (fileId) {
                syncFingerprints.set(ev.id, currentHash);
                syncCount++;
            }
            if (syncCount % 5 === 0) await new Promise(r => setTimeout(r, 100));
        }

        if (syncCount > 0) {
            AuthUIHandler.onInfo(`${syncCount}건의 메모가 클라우드에 백업되었습니다.`);
        }
    } catch (err) { console.error("Markdown Sync Error:", err); }
    finally { isSyncing = false; }
}

function generateMarkdown(ev: EventItem): string {
    return [
        '---',
        `id: ${ev.id}`,
        `title: "${(ev.title || '').replace(/"/g, '\\"')}"`,
        `region: ${ev.region || 'Unknown'}`,
        `lat: ${ev.lat}`,
        `lng: ${ev.lng}`,
        `tags: [${(ev.tags || []).map(t => `"${t}"`).join(', ')}]`,
        '---',
        '',
        `# ${ev.title || 'Untitled'}`,
        '',
        ev.description || ev.summary || '내용이 없습니다.',
        '',
        ev.imageUrl ? `![Thumbnail](${ev.imageUrl})` : '',
        '',
        ev.sketch_ai?.svg ? `## Sketch\n\n${ev.sketch_ai.svg}\n\n*Semantic Hint: ${ev.sketch_ai.semantic || 'None'}*` : '',
        '',
        '---',
        '*Auto-generated by Kuzmo Archive*'
    ].join('\n');
}

async function uploadMarkdownFile(name: string, content: string, parentId: string, existingId: string | null = null): Promise<string | null> {
    try {
        const metadata = { name, parents: [parentId], mimeType: 'text/markdown' };
        const token = gapi.client.getToken().access_token;

        if (existingId) {
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body: content
            });
            return existingId;
        } else {
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([content], { type: 'text/markdown' }));

            const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            });
            const result = await resp.json();
            return result.id;
        }
    } catch (err) { return null; }
}

/**
 * ✨ [AUTO-CREATE] "Kuzmo_Archive" 폴더 자동 생성 및 연동
 */
export async function createArchiveFolderAuto(): Promise<void> {
  try {
    const { AuthUIHandler } = await import('../../view/ui/auth_handler.js');
    AuthUIHandler.onInfo("아카이브 폴더를 확인 중입니다...");

    const name = "Kuzmo_Archive";
    const search = await gapi.client.drive.files.list({
      q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)"
    });

    let folderId = (search.result.files as any[])[0]?.id;
    let isNew = false;

    if (!folderId) {
      const resp = await gapi.client.drive.files.create({
        resource: { name: name, mimeType: 'application/vnd.google-apps.folder' },
        fields: "id, name"
      });
      folderId = resp.result.id;
      isNew = true;
    }

    if (folderId) {
      await selectLockerFolder(name, folderId);
      AuthUIHandler.onArchiveFolderCreated(name, folderId, isNew);
      loadEventsFromDrive();
    }
  } catch (err) {
    console.error("Folder Auto-Create Fail:", err);
  }
}
