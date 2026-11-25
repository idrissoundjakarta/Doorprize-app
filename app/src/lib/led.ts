import type { LedSettings, Settings } from "@/engine/types";

export const DEFAULT_LED: LedSettings = { width: 1920, height: 1080 };

export function ledOf(settings: Settings): LedSettings {
  return settings.led ?? DEFAULT_LED;
}

/** Area show 16:9 terbesar yang muat di kanvas LED, di tengah. Nilai dalam piksel LED. */
export function showRect(w: number, h: number) {
  const sw = Math.round(Math.min(w, (h * 16) / 9));
  const sh = Math.round((sw * 9) / 16);
  return { x: Math.round((w - sw) / 2), y: Math.round((h - sh) / 2), w: sw, h: sh };
}

/** Penjelasan singkat untuk operator, mis. "Show 1920×1080 di tengah, frame 960 px kiri & kanan". */
export function describeLed(w: number, h: number): string {
  const r = showRect(w, h);
  if (r.w === w && r.h === h) return `Show memenuhi seluruh layar ${w}×${h} (16:9). Tidak ada frame.`;
  if (r.x > 0 && r.y === 0) return `Show ${r.w}×${r.h} di tengah, frame ${r.x} px di kiri dan ${w - r.w - r.x} px di kanan.`;
  if (r.y > 0 && r.x === 0) return `Show ${r.w}×${r.h} di tengah, frame ${r.y} px di atas dan ${h - r.h - r.y} px di bawah.`;
  return `Show ${r.w}×${r.h} di tengah, frame di sekelilingnya.`;
}

/** Rasio dua layar dianggap sama kalau selisihnya < 1%. */
export function sameAspect(w1: number, h1: number, w2: number, h2: number): boolean {
  return Math.abs(w1 / h1 - w2 / h2) / (w1 / h1) < 0.01;
}

export const LED_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "16:9 · 1920×1080", w: 1920, h: 1080 },
  { label: "16:9 · 3840×2160 (4K)", w: 3840, h: 2160 },
  { label: "32:9 · 3840×1080", w: 3840, h: 1080 },
  { label: "Lebar · 2880×1080", w: 2880, h: 1080 },
  { label: "4:3 · 1440×1080", w: 1440, h: 1080 },
];

/**
 * Template frame (PNG ukuran penuh LED): area show ditandai sebagai "tertutup show",
 * area frame diberi ukuran supaya desainer tahu ruang yang bisa didesain.
 */
export async function makeTemplate(w: number, h: number): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const r = showRect(w, h);
  const u = Math.max(1, h / 1080);
  // Area frame (boleh didesain)
  g.fillStyle = "#E9F1FB";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(59,111,182,.18)";
  g.lineWidth = 1;
  for (let x = 0; x < w; x += 60 * u) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y < h; y += 60 * u) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  // Area show (tertutup)
  g.fillStyle = "#3A3A3A";
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = "#FF3B30";
  g.lineWidth = 6 * u;
  g.setLineDash([24 * u, 14 * u]);
  g.strokeRect(r.x + 3 * u, r.y + 3 * u, r.w - 6 * u, r.h - 6 * u);
  g.setLineDash([]);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#FFFFFF";
  g.font = `700 ${Math.round(56 * u)}px sans-serif`;
  g.fillText("AREA SHOW (tertutup tampilan undian)", r.x + r.w / 2, r.y + r.h / 2 - 50 * u);
  g.font = `500 ${Math.round(40 * u)}px sans-serif`;
  g.fillText(`${r.w} × ${r.h} px · mulai x=${r.x}, y=${r.y}`, r.x + r.w / 2, r.y + r.h / 2 + 30 * u);
  g.font = `500 ${Math.round(30 * u)}px sans-serif`;
  g.fillStyle = "rgba(255,255,255,.7)";
  g.fillText(`Template frame LED ${w} × ${h} px · simpan desain dengan ukuran persis ${w} × ${h} px`, r.x + r.w / 2, r.y + r.h / 2 + 100 * u);
  // Label area frame
  g.fillStyle = "#3B6FB6";
  g.font = `700 ${Math.round(34 * u)}px sans-serif`;
  const label = (x: number, y: number, ww: number, hh: number) => {
    if (ww < 40 || hh < 40) return;
    g.save();
    g.translate(x + ww / 2, y + hh / 2);
    if (ww < hh * 0.6) g.rotate(-Math.PI / 2);
    g.fillText(`Area desain ${Math.round(ww)} × ${Math.round(hh)} px`, 0, 0);
    g.restore();
  };
  label(0, 0, r.x, h);
  label(r.x + r.w, 0, w - r.x - r.w, h);
  label(0, 0, w, r.y);
  label(0, r.y + r.h, w, h - r.y - r.h);
  return await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
}
