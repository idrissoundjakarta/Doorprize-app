// Model data show. Semua bisa disimpan sebagai JSON.

export type Participant = {
  id: string;
  /** Identitas utama yang tampil besar (nomor kupon, atau nama kalau tidak ada nomor). */
  number: string;
  name?: string;
  info?: string;
};

export type Prize = {
  id: string;
  name: string;
  qty: number;
  /** Foto hadiah (data URL). Belum dipakai di prototipe. */
  photo?: string;
};

export type Session = {
  id: string;
  name: string;
  prizes: Prize[];
};

export type DrawStatus = "pending" | "sah" | "hangus";
/** "manual" disiapkan untuk fitur "pilih sebagai pemenang" (ditunda). */
export type DrawSource = "acak" | "manual";

export type Draw = {
  id: string;
  sessionId: string;
  prizeId: string;
  participantId: string;
  source: DrawSource;
  status: DrawStatus;
  at: number;
};

export type DrawStyle = "digit" | "reel";
export type Tempo = "cepat" | "normal" | "dramatis";

export type Settings = {
  eventTitle: string;
  style: DrawStyle;
  tempo: Tempo;
};

/**
 * Adegan = satu langkah di cue list. Jenis adegan baru (batch, eliminasi,
 * claim timer, recap, dll.) cukup ditambah sebagai `kind` baru + aturannya
 * di engine, tanpa mengubah adegan yang sudah ada.
 */
export type Scene =
  | { kind: "looping"; session: number }
  | { kind: "opener"; session: number }
  | { kind: "showcase"; session: number; prize: number }
  | { kind: "ready"; session: number; prize: number }
  | { kind: "draw"; session: number; prize: number; drawId: string }
  | { kind: "reveal"; session: number; prize: number; drawId: string }
  | { kind: "end" };

export type SceneKind = Scene["kind"];

export type ShowState = {
  version: 1;
  settings: Settings;
  sessions: Session[];
  participants: Participant[];
  draws: Draw[];
  scene: Scene;
  /** Bertambah setiap ganti adegan. Dipakai untuk menolak sinyal "auto selesai" yang basi. */
  sceneSeq: number;
  /** Waktu (ms) adegan sekarang dimulai. */
  sceneAt: number;
  /** Layar hitam: konten disembunyikan, background + brand tetap. */
  blank: boolean;
};

export type Action =
  | { type: "NEXT"; now: number }
  | { type: "BACK"; now: number }
  | { type: "AUTO_DONE"; seq: number; now: number }
  | { type: "HANGUS"; now: number }
  | { type: "TOGGLE_BLANK" }
  | { type: "JUMP_SESSION"; session: number; now: number }
  | { type: "RESTART"; now: number };
