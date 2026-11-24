import { initialScene } from "./engine";
import { uid } from "./rng";
import type { Palette, Participant, Session, Settings, ShowState } from "./types";

export const PALETTE_GALA: Palette = {
  bg1: "#1B2747",
  bg2: "#070B16",
  primary: "#D9B26F",
  primary2: "#F3DDA8",
  text: "#F7F1E6",
  muted: "#A9B4CC",
};

export const DEFAULT_SETTINGS: Settings = {
  eventTitle: "Annual Gathering 2026",
  companyName: "PT Contoh Sejahtera",
  style: "digit",
  tempo: "normal",
  sound: true,
  theme: {
    template: "gala",
    palette: PALETTE_GALA,
    fontTitle: "Cormorant",
    fontBody: "Manrope",
    dim: 0.25,
    quality: "tinggi",
  },
};

export function createShow(
  sessions: Session[],
  participants: Participant[],
  settings: Settings = DEFAULT_SETTINGS,
  now = Date.now(),
): ShowState {
  const base = { sessions, participants, draws: [] };
  return {
    version: 1,
    settings,
    ...base,
    scene: initialScene(base),
    sceneSeq: 0,
    sceneAt: now - 10_000,
    blank: false,
  };
}

/** Nomor kupon berurutan, misalnya 1..500 → "001".."500". */
export function generateRange(from: number, to: number): Participant[] {
  const width = String(Math.max(from, to)).length;
  const out: Participant[] = [];
  for (let n = from; n <= to; n++) out.push({ id: uid(), number: String(n).padStart(width, "0") });
  return out;
}

const FIRST = ["Andi", "Budi", "Citra", "Dewi", "Eko", "Fajar", "Gita", "Hendra", "Indah", "Joko", "Kartika", "Lestari", "Maya", "Nanda", "Oki", "Putri", "Rizky", "Sari", "Taufik", "Wulan"];
const LAST = ["Pratama", "Santoso", "Wijaya", "Lestari", "Saputra", "Kurniawan", "Hidayat", "Permata", "Nugroho", "Rahmawati", "Setiawan", "Anggraini"];
const DIV = ["Finance", "HR", "IT", "Marketing", "Operasional", "Sales", "Legal", "Produksi"];

export function sampleParticipants(count = 500, withNames = true): Participant[] {
  return generateRange(1, count).map((p, i) =>
    withNames
      ? {
          ...p,
          name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
          info: DIV[(i * 3) % DIV.length],
        }
      : p,
  );
}

export function sampleSessions(): Session[] {
  const s = (name: string, prizes: [string, number][]): Session => ({
    id: uid(),
    name,
    prizes: prizes.map(([n, qty]) => ({ id: uid(), name: n, qty })),
  });
  return [
    s("Sesi 1", [
      ["Voucher Belanja Rp500.000", 3],
      ["Smartwatch", 2],
      ["Air Fryer", 2],
      ["Speaker Bluetooth", 1],
    ]),
    s("Sesi 2", [
      ["Sepeda Lipat", 1],
      ["Smartphone", 2],
      ['Smart TV 43"', 1],
    ]),
    s("Grand Prize", [
      ["Logam Mulia 10 gram", 1],
      ["Paket Liburan ke Bali", 1],
      ["Motor Matic", 1],
    ]),
  ];
}

export function sampleShow(now = Date.now()): ShowState {
  return { ...createShow(sampleSessions(), sampleParticipants(), DEFAULT_SETTINGS, now), sample: true };
}

/** Acara baru yang masih kosong: satu sesi tanpa hadiah, tanpa peserta. */
export function emptyShow(now = Date.now()): ShowState {
  return createShow([{ id: uid(), name: "Sesi 1", prizes: [] }], [], { ...DEFAULT_SETTINGS, eventTitle: "", companyName: "" }, now);
}
