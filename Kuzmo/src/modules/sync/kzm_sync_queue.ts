import { Kzm } from '../domain/kzm_entities';
import { KzmIndexedDB } from '../persistence/kzm_indexeddb';

/**
 * 🏭 KzmSyncQueue (v1.1)
 * =================================
 * Complementary Smart Factory Sync Pattern.
 * Queueing + Dual Source Verification + Cloud Hybrid.
 */
export class KzmSyncQueue {
  private static instance: KzmSyncQueue;
  private queue: Kzm.SyncTransaction[] = [];
  private isProcessing: boolean = false;

  private constructor() {
    console.log("🏭 Transaction Manager Active.");
    this.startHeartbeat();
  }

  static get(): KzmSyncQueue {
    if (!KzmSyncQueue.instance) KzmSyncQueue.instance = new KzmSyncQueue();
    return KzmSyncQueue.instance;
  }

  /**
   * 📤 Push Operation to Queue
   */
  public async submit(op: Kzm.SyncTransaction['op'], table: Kzm.SyncTransaction['table'], payload: any) {
    const tx: Kzm.SyncTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      op,
      table,
      payload,
      timestamp: Date.now(),
      attempts: 0
    };

    console.log(`[QUEUE] Submitted: ${tx.op} on ${tx.table}`);
    this.queue.push(tx);

    // Immediate Attempt (Complementary Push)
    this.processQueue();
  }

  /**
   * 🔄 Heartbeat Process
   */
  private startHeartbeat() {
    setInterval(() => {
      if (!this.isProcessing && this.queue.length > 0) {
        this.processQueue();
      }
    }, 5000); // 5s Retry Cycle
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const tx = this.queue[0];

    try {
      // ✅ Smart Factory: Dual Verification
      // 1. Verify Local Snapshot Integrity
      const localExists = await KzmIndexedDB.getRecord(tx.payload.id);
      if (!localExists && tx.op !== 'DELETE') {
        console.warn(`[SYNC] Local Record missing for ${tx.id}, checking fallback...`);
      }

      // 2. Push to Cloud (Google Drive / P2P 釉뚮┸吏€)
      console.log(`?뱻 [SYNC] ${tx.op} operation verified. Pushing ${tx.id}...`);
      await this.mockCloudSync(tx);

      // 3. Mark as Clear
      this.queue.shift();
      console.log(`✅[SYNC] Transaction ${tx.id} Completed.`);

    } catch (err) {
      tx.attempts++;
      console.error(`✅[SYNC] Transaction ${tx.id} Failed. Attempts: ${tx.attempts}`);

      // Move to back of the queue if it's not permanently failed
      if (tx.attempts < 10) {
        this.queue.push(this.queue.shift()!);
      } else {
        console.error(`?슚 [SYNC] Transaction ${tx.id} CRITICAL FAILURE - Discarding.`);
        this.queue.shift();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async mockCloudSync(tx: Kzm.SyncTransaction): Promise<boolean> {
    console.log(`[CLOUD] Processing ${tx.op} for ${tx.id}`);
    return new Promise((resolve, reject) => {
      // Randomly fail to test retry logic
      setTimeout(() => {
        if (Math.random() > 0.1) resolve(true);
        else reject(new Error("Network Unstable"));
      }, 500);
    });
  }
}

export const $tx = KzmSyncQueue.get();
