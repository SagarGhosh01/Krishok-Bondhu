/**
 * AgriShield AI - Offline Synchronization Engine
 * Monitors network online/offline events, flushes pending scans from Dexie
 * to the FastAPI /api/v1/sync endpoint idempotently with backoff.
 */

import { db } from "../db/indexedDb";
import { submitSyncBatch } from "./api";

let isSyncing = false;

export async function flushPendingSyncQueue(): Promise<{ synced: number; skipped: number }> {
  if (!navigator.onLine || isSyncing) {
    return { synced: 0, skipped: 0 };
  }

  isSyncing = true;
  try {
    const pendingItems = await db.pendingSync.toArray();
    if (pendingItems.length === 0) {
      isSyncing = false;
      return { synced: 0, skipped: 0 };
    }

    console.log(`[OfflineSync] Found ${pendingItems.length} pending scans to sync...`);

    const batchPayload = pendingItems.map((item) => ({
      client_uuid: item.clientUuid,
      created_at: item.createdAt,
      image_base64: item.imageBase64,
      filename: item.originalFilename,
      selected_crop: item.selectedCrop,
      client_predicted_class: item.clientPredictedClass,
      client_confidence: item.clientConfidence,
    }));

    const response = await submitSyncBatch(batchPayload);
    console.log("[OfflineSync] Sync response:", response);

    // Update local scans table: remove pending flag
    for (const resItem of response.results) {
      if (resItem.status === "synchronized" || resItem.status === "duplicate_skipped") {
        await db.pendingSync.delete(resItem.client_uuid);
        const localScan = await db.scans.get(resItem.client_uuid);
        if (localScan) {
          localScan.isOfflinePending = false;
          await db.scans.put(localScan);
        }
      }
    }

    isSyncing = false;
    return {
      synced: response.synchronized_count,
      skipped: response.duplicate_count,
    };
  } catch (err) {
    console.error("[OfflineSync] Error during background synchronization:", err);
    isSyncing = false;
    return { synced: 0, skipped: 0 };
  }
}

// Auto-register network listeners
export function setupOfflineSyncListeners(onSyncComplete?: () => void) {
  window.addEventListener("online", async () => {
    console.log("[OfflineSync] Network connectivity restored. Initiating sync...");
    const res = await flushPendingSyncQueue();
    if (res.synced > 0 && onSyncComplete) {
      onSyncComplete();
    }
  });
}
