const DB_NAME = "irl-scanner-cache";
const DB_VERSION = 1;
const STORE_NAME = "valid-passes";

interface CachedPass {
  qr_code_hash: string;
  pass_id: string;
  event_id: string;
  tier_name: string;
  user_name: string;
  status: string;
  cached_at: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "qr_code_hash" });
      }
    };
  });
}

export async function cachePassesForEvent(
  eventId: string,
  passes: CachedPass[]
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  for (const pass of passes) {
    store.put({ ...pass, event_id: eventId });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedPass(
  qrHash: string
): Promise<CachedPass | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(qrHash);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function markCachedPassScanned(qrHash: string): Promise<void> {
  const pass = await getCachedPass(qrHash);
  if (!pass) return;

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put({ ...pass, status: "checked_in" });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSyncScans(): Promise<string[]> {
  const pending = localStorage.getItem("irl-pending-scans");
  return pending ? JSON.parse(pending) : [];
}

export async function addPendingSyncScan(qrHash: string): Promise<void> {
  const pending = await getPendingSyncScans();
  if (!pending.includes(qrHash)) {
    pending.push(qrHash);
    localStorage.setItem("irl-pending-scans", JSON.stringify(pending));
  }
}

export async function clearPendingSyncScan(qrHash: string): Promise<void> {
  const pending = await getPendingSyncScans();
  localStorage.setItem(
    "irl-pending-scans",
    JSON.stringify(pending.filter((h) => h !== qrHash))
  );
}

export type { CachedPass };
