import type { DrawStyle, Palette, Template } from "@/engine/types";

/** Palet bawaan tiap template (dipakai kalau klien belum upload KV). */
export const TEMPLATE_PRESET: Record<Template, { label: string; desc: string; palette: Palette; fontTitle: string }> = {
  gala: {
    label: "Gala Emas",
    desc: "Bokeh & sapuan cahaya · formal",
    palette: { bg1: "#1B2747", bg2: "#070B16", primary: "#D9B26F", primary2: "#F3DDA8", text: "#F7F1E6", muted: "#A9B4CC" },
    fontTitle: "Cormorant",
  },
  neon: {
    label: "Neon Party",
    desc: "Berkas cahaya & haze · meriah",
    palette: { bg1: "#2A1450", bg2: "#0A0618", primary: "#FF4FB8", primary2: "#5EE7FF", text: "#FFFFFF", muted: "#C3B5E8" },
    fontTitle: "Outfit",
  },
  navy: {
    label: "Corporate Navy",
    desc: "Grid & garis halus · bersih",
    palette: { bg1: "#0F4C81", bg2: "#051E38", primary: "#49D3C3", primary2: "#B5F2EA", text: "#FFFFFF", muted: "#9CC3E4" },
    fontTitle: "Sora",
  },
};

export const TEMPLATE_INDEX: Record<Template, number> = { gala: 0, neon: 1, navy: 2 };

/** Font yang disertakan di aplikasi (jalan offline). */
export const FONTS: { id: string; label: string; kind: "serif" | "sans" }[] = [
  { id: "Cormorant", label: "Cormorant Garamond", kind: "serif" },
  { id: "Playfair", label: "Playfair Display", kind: "serif" },
  { id: "DMSerif", label: "DM Serif Display", kind: "serif" },
  { id: "Manrope", label: "Manrope", kind: "sans" },
  { id: "Sora", label: "Sora", kind: "sans" },
  { id: "Montserrat", label: "Montserrat", kind: "sans" },
  { id: "Outfit", label: "Outfit", kind: "sans" },
];

export const STYLE_INFO: Record<DrawStyle, { label: string; desc: string }> = {
  digit: { label: "Buka digit", desc: "Formal · digit terkunci satu per satu" },
  reel: { label: "Slot reel", desc: "Meriah · gulungan nomor melambat" },
  amplop: { label: "Amplop emas", desc: "Elegan · ala malam penghargaan" },
  debu: { label: "Debu emas", desc: "Elegan + wah · partikel jadi nomor" },
  sorot: { label: "Sorot cahaya", desc: "Elegan · ukiran disapu cahaya" },
};
