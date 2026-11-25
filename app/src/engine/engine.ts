import { secureRandomInt, uid, type RandomInt } from "./rng";
import type { Action, Draw, Participant, Prize, Scene, SceneKind, ShowState } from "./types";

// ---------- Aturan per jenis adegan ----------

export const SCENE_MODE: Record<SceneKind, "auto" | "hold"> = {
  looping: "hold",
  opener: "auto",
  showcase: "hold",
  ready: "hold",
  draw: "auto",
  reveal: "hold",
  end: "hold",
};

export const SCENE_LABEL: Record<SceneKind, string> = {
  looping: "Looping",
  opener: "Opener sesi",
  showcase: "Showcase hadiah",
  ready: "Ready",
  draw: "Undi",
  reveal: "Reveal pemenang",
  end: "Penutup",
};

/** Background tenang/intens per adegan. */
export const SCENE_MOOD: Record<SceneKind, "tenang" | "intens"> = {
  looping: "tenang",
  opener: "tenang",
  showcase: "tenang",
  ready: "tenang",
  draw: "intens",
  reveal: "intens",
  end: "tenang",
};

export const OPENER_MS = 3000;
export const TEMPO_MS = { cepat: 4000, normal: 6000, dramatis: 8000 } as const;
/** NEXT/BACK diabaikan selama ini setelah ganti adegan (anti dobel-tekan clicker). */
export const DEBOUNCE_MS = 800;
/** Buka digit Manual: jeda minimum antar-digit (klik ganda tidak melompati digit). */
export const DIGIT_LOCK_MS = 600;
/** Buka digit Manual: digit terakhir ditahan sebentar sebelum layar pemenang. */
export const DIGIT_FINAL_HOLD_MS = 1000;

/** Posisi yang dibuka satu per satu (spasi ikut terbuka otomatis). Nol di depan tetap dihitung. */
export function lockablePositions(number: string): number {
  return [...number].filter((c) => c !== " ").length;
}

/** Nomor pemenang yang sedang diundi (dipakai untuk menghitung digit). */
function drawNumber(state: ShowState, drawId: string): string {
  const d = getDraw(state, drawId);
  return (d && getParticipant(state, d.participantId)?.number) ?? "";
}

/** Durasi adegan auto (ms), atau null untuk adegan hold. */
export function autoDuration(state: ShowState): number | null {
  switch (state.scene.kind) {
    case "opener":
      return OPENER_MS;
    case "draw": {
      const sc = state.scene;
      if (!sc.manual) return TEMPO_MS[state.settings.tempo];
      // Manual: menunggu aba-aba, tanpa batas waktu. Setelah digit terakhir, jeda singkat lalu reveal.
      if ((sc.revealed ?? 0) < lockablePositions(drawNumber(state, sc.drawId))) return null;
      return (sc.lockedAt ?? state.sceneAt) - state.sceneAt + DIGIT_FINAL_HOLD_MS;
    }
    default:
      return null;
  }
}

// ---------- Pertanyaan tentang data ----------

export function getPrize(state: ShowState, s: number, p: number): Prize | undefined {
  return state.sessions[s]?.prizes[p];
}

export function getDraw(state: ShowState, drawId: string): Draw | undefined {
  return state.draws.find((d) => d.id === drawId);
}

export function getParticipant(state: ShowState, id: string): Participant | undefined {
  return state.participants.find((p) => p.id === id);
}

/** Jumlah pemenang sah untuk satu hadiah. */
export function sahCount(state: ShowState, prizeId: string): number {
  return state.draws.filter((d) => d.prizeId === prizeId && d.status === "sah").length;
}

export function remaining(state: ShowState, prize: Prize): number {
  return Math.max(0, prize.qty - sahCount(state, prize.id));
}

/** Peserta yang masih berhak: belum pernah keluar (sah, hangus, atau sedang ditampilkan). */
export function eligible(state: ShowState): Participant[] {
  const used = new Set(state.draws.map((d) => d.participantId));
  return state.participants.filter((p) => !used.has(p.id));
}

export function firstOpenPrize(state: ShowState, s: number): number | null {
  const prizes = state.sessions[s]?.prizes ?? [];
  const i = prizes.findIndex((p) => remaining(state, p) > 0);
  return i < 0 ? null : i;
}

export function nextOpenSession(state: ShowState): number | null {
  const i = state.sessions.findIndex((_, s) => firstOpenPrize(state, s) !== null);
  return i < 0 ? null : i;
}

function sessionHasDraws(state: ShowState, s: number): boolean {
  const id = state.sessions[s]?.id;
  return state.draws.some((d) => d.sessionId === id);
}

// ---------- Perpindahan adegan ----------

export function initialScene(state: Pick<ShowState, "sessions" | "draws" | "participants">): Scene {
  const s = nextOpenSession(state as ShowState);
  return s === null ? { kind: "end" } : { kind: "looping", session: s };
}

function go(state: ShowState, scene: Scene, now: number): ShowState {
  return { ...state, scene, sceneSeq: state.sceneSeq + 1, sceneAt: now, blank: false };
}

/** Setelah sesi/hadiah selesai: ke hadiah berikutnya, sesi berikutnya, atau penutup. */
function afterPrizeDone(state: ShowState, s: number, now: number): ShowState {
  const p = firstOpenPrize(state, s);
  if (p !== null) return go(state, { kind: "showcase", session: s, prize: p }, now);
  const ns = nextOpenSession(state);
  return go(state, ns === null ? { kind: "end" } : { kind: "looping", session: ns }, now);
}

function startDraw(state: ShowState, s: number, p: number, now: number, rand: RandomInt): ShowState {
  const pool = eligible(state);
  const prize = getPrize(state, s, p);
  if (!prize || pool.length === 0) return go(state, { kind: "ready", session: s, prize: p }, now);
  // Pemenang dipilih DI SINI, sebelum animasi. Animasi hanya menampilkan.
  const winner = pool[rand(pool.length)];
  const draw: Draw = {
    id: uid(),
    sessionId: state.sessions[s].id,
    prizeId: prize.id,
    participantId: winner.id,
    source: "acak",
    status: "pending",
    at: now,
  };
  const manual = (prize.style ?? state.settings.style) === "digit" && state.settings.digitMode === "manual";
  return go(
    { ...state, draws: [...state.draws, draw] },
    manual ? { kind: "draw", session: s, prize: p, drawId: draw.id, manual: true, revealed: 0, lockedAt: now } : { kind: "draw", session: s, prize: p, drawId: draw.id },
    now,
  );
}

function setDrawStatus(state: ShowState, drawId: string, status: Draw["status"]): ShowState {
  return { ...state, draws: state.draws.map((d) => (d.id === drawId ? { ...d, status } : d)) };
}

export function reduce(state: ShowState, action: Action, rand: RandomInt = secureRandomInt): ShowState {
  const sc = state.scene;

  switch (action.type) {
    case "TOGGLE_BLANK":
      return { ...state, blank: !state.blank };

    case "START_REHEARSAL": {
      // Gladi hanya boleh dimulai sebelum ada hasil undian asli.
      if (state.rehearsal || state.draws.length > 0) return state;
      return go({ ...state, rehearsal: true }, initialScene(state), action.now);
    }

    case "END_REHEARSAL": {
      if (!state.rehearsal) return state;
      const base = { ...state, draws: [] as Draw[], rehearsal: false };
      return go(base, initialScene(base), action.now);
    }

    case "RESTART": {
      const base = { ...state, draws: [] as Draw[] };
      return go(base, initialScene(base), action.now);
    }

    case "JUMP_SESSION": {
      if (sc.kind === "draw" || sc.kind === "reveal") return state; // selesaikan pemenang dulu
      if (firstOpenPrize(state, action.session) === null) return state;
      return go(state, { kind: "looping", session: action.session }, action.now);
    }

    case "AUTO_DONE": {
      if (action.seq !== state.sceneSeq) return state; // sinyal basi
      if (sc.kind === "opener") {
        const p = firstOpenPrize(state, sc.session);
        return p === null
          ? afterPrizeDone(state, sc.session, action.now)
          : go(state, { kind: "showcase", session: sc.session, prize: p }, action.now);
      }
      if (sc.kind === "draw") {
        if (sc.manual && (sc.revealed ?? 0) < lockablePositions(drawNumber(state, sc.drawId))) return state; // masih menunggu aba-aba
        return go(state, { kind: "reveal", session: sc.session, prize: sc.prize, drawId: sc.drawId }, action.now);
      }
      return state;
    }

    case "HANGUS": {
      if (sc.kind !== "reveal") return state;
      const st = setDrawStatus(state, sc.drawId, "hangus");
      return go(st, { kind: "ready", session: sc.session, prize: sc.prize }, action.now);
    }

    case "NEXT": {
      // Buka digit Manual: satu NEXT = satu digit, dengan jeda minimum supaya klik ganda tidak melompati digit.
      if (sc.kind === "draw" && sc.manual) {
        const total = lockablePositions(drawNumber(state, sc.drawId));
        const n = sc.revealed ?? 0;
        if (n >= total) return state;
        if (action.now - (sc.lockedAt ?? state.sceneAt) < DIGIT_LOCK_MS) return state;
        return { ...state, scene: { ...sc, revealed: n + 1, lockedAt: action.now } };
      }
      if (SCENE_MODE[sc.kind] !== "hold") return state;
      if (action.now - state.sceneAt < DEBOUNCE_MS) return state;
      switch (sc.kind) {
        case "looping":
          return go(state, { kind: "opener", session: sc.session }, action.now);
        case "showcase":
          return go(state, { kind: "ready", session: sc.session, prize: sc.prize }, action.now);
        case "ready":
          if (eligible(state).length === 0) return state; // peserta habis
          return startDraw(state, sc.session, sc.prize, action.now, rand);
        case "reveal": {
          const st = setDrawStatus(state, sc.drawId, "sah");
          const prize = getPrize(st, sc.session, sc.prize);
          if (prize && remaining(st, prize) > 0) {
            // Hadiah sama masih tersisa: langsung undi lagi, tanpa showcase.
            return startDraw(st, sc.session, sc.prize, action.now, rand);
          }
          return afterPrizeDone(st, sc.session, action.now);
        }
        default:
          return state;
      }
    }

    case "BACK": {
      if (action.now - state.sceneAt < DEBOUNCE_MS) return state;
      if (sc.kind === "ready") {
        const prize = getPrize(state, sc.session, sc.prize);
        if (prize && sahCount(state, prize.id) === 0)
          return go(state, { kind: "showcase", session: sc.session, prize: sc.prize }, action.now);
      }
      if (sc.kind === "showcase" && !sessionHasDraws(state, sc.session))
        return go(state, { kind: "looping", session: sc.session }, action.now);
      return state;
    }
  }
}

/**
 * Dipanggil saat data dimuat ulang (refresh/aplikasi dibuka lagi).
 * Kalau tertutup di tengah undian, langsung ke Reveal dengan pemenang yang sama.
 */
export function resumeAfterReload(state: ShowState, now: number): ShowState {
  const sc = state.scene;
  // Manual: tetap menunggu aba-aba MC (digit yang sudah dibuka tetap terbuka).
  if (sc.kind === "draw" && sc.manual && (sc.revealed ?? 0) < lockablePositions(drawNumber(state, sc.drawId))) return state;
  if (sc.kind === "draw") return go(state, { kind: "reveal", session: sc.session, prize: sc.prize, drawId: sc.drawId }, now);
  return state;
}

/** Teks singkat "berikutnya" untuk jendela operator. */
export function describeNext(state: ShowState): string {
  const sc = state.scene;
  switch (sc.kind) {
    case "looping":
      return `NEXT → Opener ${state.sessions[sc.session]?.name ?? ""}`;
    case "opener":
      return "Otomatis → Showcase hadiah";
    case "showcase":
      return "NEXT → Ready";
    case "ready":
      return eligible(state).length === 0 ? "Peserta habis, tidak bisa undi" : "NEXT → Undi";
    case "draw": {
      if (!sc.manual) return "Otomatis → Reveal pemenang";
      const total = lockablePositions(drawNumber(state, sc.drawId));
      const n = sc.revealed ?? 0;
      return n >= total ? "Semua digit terbuka → Reveal pemenang" : `NEXT → Stop digit ${n + 1} dari ${total} (tunggu aba-aba MC)`;
    }
    case "reveal": {
      const prize = getPrize(state, sc.session, sc.prize);
      if (!prize) return "";
      const left = prize.qty - sahCount(state, prize.id) - 1;
      if (left > 0) return `NEXT (sah) → Undi lagi (${left} tersisa) · H×2 → Hangus`;
      const sim = setDrawStatus(state, sc.drawId, "sah");
      const p = firstOpenPrize(sim, sc.session);
      if (p !== null) return `NEXT (sah) → Showcase ${state.sessions[sc.session].prizes[p].name} · H×2 → Hangus`;
      const ns = nextOpenSession(sim);
      return `NEXT (sah) → ${ns === null ? "Penutup" : `Looping (teaser ${state.sessions[ns].name})`} · H×2 → Hangus`;
    }
    case "end":
      return "Show selesai";
  }
}
