import type { ShowState } from "./types";

export type Check = { level: "error" | "warn" | "info"; text: string; step?: "acara" | "tampilan" | "peserta" | "sesi" | "gaya" };

/**
 * Cek sebelum show. "error" = show tidak bisa berjalan dengan benar,
 * "warn" = sebaiknya diperbaiki, "info" = sekadar pemberitahuan.
 */
export function preflight(state: Pick<ShowState, "settings" | "sessions" | "participants">): Check[] {
  const out: Check[] = [];
  const prizes = state.sessions.flatMap((s) => s.prizes);
  const totalQty = prizes.reduce((n, p) => n + p.qty, 0);
  const n = state.participants.length;

  if (n === 0) out.push({ level: "error", text: "Belum ada peserta", step: "peserta" });
  if (prizes.length === 0) out.push({ level: "error", text: "Belum ada hadiah", step: "sesi" });
  if (n > 0 && totalQty > n) out.push({ level: "error", text: `Jumlah hadiah (${totalQty}) lebih banyak dari peserta (${n}). Satu orang hanya bisa menang sekali`, step: "sesi" });

  const empty = state.sessions.filter((s) => s.prizes.length === 0);
  if (empty.length && prizes.length) out.push({ level: "warn", text: `${empty.map((s) => s.name || "Sesi tanpa nama").join(", ")} belum punya hadiah dan akan dilewati`, step: "sesi" });
  const noName = prizes.filter((p) => !p.name.trim() || p.name.trim() === "Hadiah baru");
  if (noName.length) out.push({ level: "warn", text: `${noName.length} hadiah belum diberi nama`, step: "sesi" });
  const noPhoto = prizes.filter((p) => !p.photo);
  if (noPhoto.length) out.push({ level: "warn", text: `${noPhoto.length} dari ${prizes.length} hadiah belum ada fotonya (tampil ikon hadiah)`, step: "sesi" });
  if (!state.settings.eventTitle.trim()) out.push({ level: "warn", text: "Judul acara masih kosong", step: "acara" });
  if (n > 0 && totalQty > n * 0.9 && totalQty <= n) out.push({ level: "warn", text: `Hampir semua peserta akan menang (${totalQty} hadiah untuk ${n} peserta). Sisa cadangan untuk hangus sedikit`, step: "sesi" });

  if (!state.settings.logo) out.push({ level: "info", text: "Logo klien belum diupload (tampil inisial perusahaan)", step: "acara" });
  if (n > 0 && !state.participants.some((p) => p.name)) out.push({ level: "info", text: "Peserta tanpa nama: hanya nomor yang tampil saat pemenang diumumkan", step: "peserta" });
  return out;
}

export function preflightOk(checks: Check[]): boolean {
  return !checks.some((c) => c.level === "error");
}
