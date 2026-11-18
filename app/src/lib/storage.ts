import type { ShowState } from "@/engine/types";

/**
 * Lapisan penyimpanan. Prototipe memakai localStorage (cukup untuk data teks).
 * Nanti diganti IndexedDB (untuk foto hadiah & logo) tanpa mengubah pemanggilnya.
 */
const KEY = "doorprize.show.v1";

export function loadShow(): ShowState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ShowState;
    return s.version === 1 ? s : null;
  } catch {
    return null;
  }
}

export function saveShow(state: ShowState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
