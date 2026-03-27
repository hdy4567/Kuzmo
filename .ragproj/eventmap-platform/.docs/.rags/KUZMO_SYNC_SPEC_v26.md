# KUZMO REAL-TIME SYNC SPEC (v26.5)
**Classification**: [SERVERLESS] [P2P-REALTIME] [SECURE-BY-DESIGN]

## 1. Cloud-as-Database (Reliability Layer)
Google Drive acts as the "Inbox/Outbox" for all devices using the same locker folder.

### 📪 The Feed Protocol
*   **Outbox**: When a record is modified, a `diff_{{TS}}_{{DEV}}.json` is written to `.kuzmo_sync_feed/`.
*   **Inbox**: Every 45s, devices poll the feed folder. If a new file is found, the device triggers `reconciliation`.
*   **G-Drive Signaling**: WebRTC SDP (Offers/Answers) and ICE Candidates are exchanged through hidden signaling files in the feed/presence folders.

---

## 2. WebRTC P2P (Performance Layer)
For open-tab/open-device real-time sync with < 100ms latency.

### 🔐 Secure-Tunneling (SyncKey)
*   **Key Derivation**: Uses PBKDF2 (100,000 iterations) with SHA-256 to derive a 256-bit AES-GCM key from the user's local Sync Secret.
*   **Encryption**: All data sent over `RTCDataChannel` is encrypted end-to-end.
*   **Peering**: Devices scan the `presence/` folder and initiate a mesh connection if a peer is 'online'.

---

## 3. Data Integrity & Self-Healing
*   **DB Epoch**: IndexedDB v5 includes `sync_status` (dirty | synced | pending) and `last_modified`.
*   **Conflict Resolution**: **Last Write Wins (LWW)** using the incremental `last_modified` timestamp.
*   **Drift Correction**: Automatic background `Dirty Monitor` loop (30s) ensures no change is left unpushed.

---

## 🚀 System Logic: The "SpaceX Drive"
1.  **Boot**: Initialize `SyncEngine`, derive `SyncKey`.
2.  **Discovery**: Broadcast presence on GDrive, prepare WebRTC Offer.
3.  **Sync**: 
    - Real-time: Direct P2P `SYNC_PUSH`.
    - Fallback: GDrive `pollChanges()`.
4.  **Healing**: Reconcile data by comparing local vs remote `last_modified`.
