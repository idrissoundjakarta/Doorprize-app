import { DEFAULT_SETTINGS } from "@/engine/sample";
import type { ShowState } from "@/engine/types";

/**
 * Lapisan penyimpanan: IndexedDB (gudang besar di browser, muat foto & logo).
 * Data lama dari localStorage (prototipe awal) dipindahkan otomatis.
 * Kalau nanti dibungkus jadi aplikasi desktop, cukup file ini yang diganti.
 */
const DB = "doorprize";
const STORE = "kv";
const KEY = "show";
const LEGACY_KEY = "doorprize.show.v1";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Lengkapi data lama dengan pengaturan baru yang belum ada. */
export function normalize(s: ShowState): ShowState {
  const st = s.settings ?? DEFAULT_SETTINGS;
  return {
    ...s,
    settings: {
      ...DEFAULT_SETTINGS,
      ...st,
      theme: {
        ...DEFAULT_SETTINGS.theme,
        ...st.theme,
        palette: { ...DEFAULT_SETTINGS.theme.palette, ...st.theme?.palette },
      },
    },
  };
}

export async function loadShow(): Promise<ShowState | null> {
  try {
    const db = await openDb();
    const s = await new Promise<ShowState | undefined>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result as ShowState | undefined);
      req.onerror = () => reject(req.error);
    });
    if (s) return normalize(s);
  } catch {
    /* lanjut ke data lama */
  }
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) return normalize(JSON.parse(raw) as ShowState);
  } catch {
    /* abaikan */
  }
  return null;
}

let pending: Promise<boolean> = Promise.resolve(true);

export function saveShow(state: ShowState): Promise<boolean> {
  // Simpan berurutan supaya versi lama tidak menimpa versi baru.
  pending = pending.then(async () => {
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(state, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return true;
    } catch {
      return false;
    }
  });
  return pending;
}

/** Minta browser tidak menghapus data ini saat ruang disk menipis. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
