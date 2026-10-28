// IndexedDB cache for API responses (Demand Year ahead and Long term). The first load saves the
// API response; later loads read the saved copy and skip the API. "Sync DB" re-calls the API and
// overwrites the saved copy only when the response differs.

const DB_NAME = "epm-ai";
const STORE = "api-cache";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export const idbGet = <T>(key: string) => run<T | undefined>("readonly", (s) => s.get(key));
export const idbSet = (key: string, value: unknown) => run("readwrite", (s) => s.put(value, key)).then(() => undefined);

/** Delete every saved entry whose key starts with `prefix`. */
export async function idbDeletePrefix(prefix: string): Promise<void> {
  try {
    const keys = await run<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
    await Promise.all(keys.filter((k) => String(k).startsWith(prefix)).map((k) => run("readwrite", (s) => s.delete(k))));
  } catch { /* IndexedDB unavailable — nothing saved to delete */ }
}

/** Cache-first load. Returns the saved copy of `key` when there is one (unless `sync`); otherwise
 *  calls `load`, and saves the result when it differs from the saved copy. `changed` is true when
 *  a new or different response was saved. Without IndexedDB (e.g. private mode) it just calls `load`. */
export async function cachedJson<T>(key: string, load: () => Promise<T>, sync = false): Promise<{ value: T; changed: boolean }> {
  let saved: T | undefined;
  try { saved = await idbGet<T>(key); } catch { saved = undefined; }
  if (saved !== undefined && !sync) return { value: saved, changed: false };

  const value = await load();
  const changed = saved === undefined || JSON.stringify(saved) !== JSON.stringify(value);
  if (changed) {
    try { await idbSet(key, value); } catch { /* could not save — still show the API data */ }
  }
  return { value, changed };
}
