/**
 * AgriShield AI - Client-Side IndexedDB Database (Dexie.js)
 * Manages offline scan storage, pending upload synchronization queue,
 * and local cached disease advisories.
 */

import Dexie, { type Table } from "dexie";

export interface StoredScan {
  id: string; // client UUID or backend scan ID
  imageData: string;
  originalFilename: string;
  crop?: string;
  disease?: string;
  confidence: number;
  reliability: number;
  diagnosticState: string; // CONFIDENT, UNCERTAIN, CANNOT_ASSESS
  isOfflinePending: boolean;
  createdAt: string;
  gradcamUrl?: string;
}

export interface PendingSyncItem {
  clientUuid: string;
  imageBase64: string;
  originalFilename: string;
  selectedCrop?: string;
  clientPredictedClass?: string;
  clientConfidence?: number;
  createdAt: string;
  retryCount: number;
}

export class AgriShieldDatabase extends Dexie {
  scans!: Table<StoredScan, string>;
  pendingSync!: Table<PendingSyncItem, string>;

  constructor() {
    super("AgriShieldDB");
    this.version(1).stores({
      scans: "id, crop, disease, diagnosticState, isOfflinePending, createdAt",
      pendingSync: "clientUuid, createdAt, retryCount",
    });
  }
}

export const db = new AgriShieldDatabase();
