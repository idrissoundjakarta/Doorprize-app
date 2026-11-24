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
  /** Foto hadiah (data URL, sudah dikecilkan). */
  photo?: string;
  /** Gaya undian khusus hadiah ini (kosong = ikut pengaturan acara). */
  style?: DrawStyle;
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

export type DrawStyle = "digit" | "reel" | "amplop" | "debu" | "sorot";
export type Tempo = "cepat" | "normal" | "dramatis";
export type Template = "gala" | "neon" | "navy";

/** Palet layar show (biasanya diambil dari KV klien). */
export type Palette = {
  bg1: string; // warna dasar terang/tengah background
  bg2: string; // warna dasar gelap/pinggir background
  primary: string; // aksen utama (nomor, judul)
  primary2: string; // aksen terang (kilau)
  text: string; // teks utama
  muted: string; // teks sekunder
};

export type Theme = {
  template: Template;
  palette: Palette;
  fontTitle: string;
  fontBody: string;
  /** 0..1, peredup background supaya teks terbaca. */
  dim: number;
  /** Kualitas background WebGL (hemat untuk laptop lemah). */
  quality: "tinggi" | "hemat";
};

export type Settings = {
  eventTitle: string;
  companyName: string;
  /** Logo klien (data URL, sudah dikecilkan). */
  logo?: string;
  style: DrawStyle;
  tempo: Tempo;
  sound: boolean;
  theme: Theme;
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
  /** true kalau masih memakai data contoh (ditandai di UI supaya tidak terbawa ke acara asli). */
  sample?: boolean;
  /** Mode gladi: hasil undian hanya latihan dan dibersihkan saat gladi selesai. */
  rehearsal?: boolean;
};

export type Action =
  | { type: "NEXT"; now: number }
  | { type: "BACK"; now: number }
  | { type: "AUTO_DONE"; seq: number; now: number }
  | { type: "HANGUS"; now: number }
  | { type: "TOGGLE_BLANK" }
  | { type: "JUMP_SESSION"; session: number; now: number }
  | { type: "RESTART"; now: number }
  | { type: "START_REHEARSAL"; now: number }
  | { type: "END_REHEARSAL"; now: number };
