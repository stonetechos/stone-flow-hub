/**
 * Pending-operations queue primitive (Phase G.10A: PWA Foundation).
 *
 * This is a *foundation* piece, not a feature: it gives future work a
 * place to enqueue an operation that couldn't reach the network, plus a
 * Background Sync registration so the browser retries it once
 * connectivity returns. No existing form or mutation in the app enqueues
 * into this yet — wiring real ERP writes (estimates, quotes, dispatches,
 * ...) through an offline outbox is materially larger in scope (touches
 * every mutation call site) and is left to a later phase.
 *
 * Deliberately NOT used for anything Supabase-auth/RLS-sensitive by
 * default — callers decide what they enqueue. Nothing here talks to
 * Supabase directly.
 */

const DB_NAME = "stos-pwa";
const DB_VERSION = 1;
const STORE_NAME = "pending-ops";
export const SYNC_TAG = "stos-pending-ops";

export interface PendingOperation {
  id: string;
  kind: string;
  payload: unknown;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = fn(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    tx.oncomplete = () => db.close();
  });
}

export async function enqueuePendingOperation(
  kind: string,
  payload: unknown,
): Promise<PendingOperation> {
  const op: PendingOperation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    kind,
    payload,
    createdAt: Date.now(),
  };
  await withStore("readwrite", (store) => store.put(op));
  await registerBackgroundSync();
  return op;
}

export async function listPendingOperations(): Promise<PendingOperation[]> {
  try {
    return await withStore("readonly", (store) => store.getAll());
  } catch {
    return [];
  }
}

export async function removePendingOperation(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function clearPendingOperations(): Promise<void> {
  await withStore("readwrite", (store) => store.clear());
}

/** Best-effort — Background Sync isn't supported in every browser (e.g. Safari); pending ops still flush on next successful app load via `flushPendingOperations` callers wire up themselves. */
export async function registerBackgroundSync(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.ready;
    const syncManager = (
      registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }
    )?.sync;
    if (syncManager) {
      await syncManager.register(SYNC_TAG);
    }
  } catch {
    // Background Sync unsupported or registration failed — the queue
    // still drains next time the app is opened online.
  }
}
