import type { Palette } from "@/engine/types";
import { loadImage } from "./image";

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Kecerahan relatif 0..1 (rumus WCAG). */
export function luminance(c: RGB): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

export function contrast(a: RGB, b: RGB): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function saturation([r, g, b]: RGB): number {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
}

export function isLightPalette(p: Palette): boolean {
  return luminance(hexToRgb(p.bg1)) > 0.45;
}

/**
 * Ambil palet layar show dari gambar KV.
 * Warna dikelompokkan, lalu diberi peran: dasar gelap/terang, aksen paling hidup, teks yang kontras.
 */
export async function paletteFromImage(src: string): Promise<{ palette: Palette; swatches: string[] }> {
  const img = await loadImage(src);
  const W = 72, H = Math.max(1, Math.round((72 * img.height) / img.width));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;

  const buckets = new Map<number, { n: number; sum: RGB }>();
  let avg: RGB = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const rgb: RGB = [data[i], data[i + 1], data[i + 2]];
    avg = [avg[0] + rgb[0], avg[1] + rgb[1], avg[2] + rgb[2]];
    const key = ((rgb[0] >> 5) << 6) | ((rgb[1] >> 5) << 3) | (rgb[2] >> 5);
    const b = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] };
    b.n++;
    b.sum = [b.sum[0] + rgb[0], b.sum[1] + rgb[1], b.sum[2] + rgb[2]];
    buckets.set(key, b);
  }
  const total = data.length / 4;
  avg = [avg[0] / total, avg[1] / total, avg[2] / total];
  const colors = [...buckets.values()]
    .map((b) => ({ c: [b.sum[0] / b.n, b.sum[1] / b.n, b.sum[2] / b.n] as RGB, n: b.n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 12);

  const light = luminance(avg) > 0.4;
  const byLum = [...colors].sort((a, b) => luminance(a.c) - luminance(b.c));
  const dominant = colors[0].c;
  // Dasar: warna dominan, digeser ke arah gelap (KV gelap) atau terang (KV terang).
  const bgBase = light ? byLum[byLum.length - 1].c : dominant;
  const bg1 = light ? mix(bgBase, [255, 255, 255], 0.35) : mix(dominant, byLum[Math.min(2, byLum.length - 1)].c, 0.3);
  const bg2 = light ? mix(bgBase, dominant, 0.25) : mix(byLum[0].c, [0, 0, 0], 0.45);
  // Aksen: warna paling hidup yang cukup kontras dengan dasar.
  const accent =
    [...colors]
      .filter((x) => contrast(x.c, bg2) > 2.2)
      .sort((a, b) => saturation(b.c) * Math.sqrt(b.n) - saturation(a.c) * Math.sqrt(a.n))[0]?.c ??
    (light ? [60, 60, 60] : [230, 200, 130]);
  const primary2 = mix(accent, [255, 255, 255], light ? 0.15 : 0.45);
  const text: RGB = light ? mix(bg2, [20, 15, 10], 0.85) : mix(bg1, [255, 255, 255], 0.92);
  const muted = mix(text, bg1, 0.4);

  return {
    palette: {
      bg1: rgbToHex(bg1),
      bg2: rgbToHex(bg2),
      primary: rgbToHex(accent),
      primary2: rgbToHex(primary2),
      text: rgbToHex(text),
      muted: rgbToHex(muted),
    },
    swatches: colors.slice(0, 6).map((x) => rgbToHex(x.c)),
  };
}
