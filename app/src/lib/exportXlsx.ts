import { getParticipant } from "@/engine/engine";
import type { ShowState } from "@/engine/types";

const STATUS = { sah: "Sah", hangus: "Hangus", pending: "Sedang tampil" } as const;

/** Baris sheet "Pemenang": semua hasil undian berurutan, termasuk yang hangus. */
export function winnerRows(state: ShowState): string[][] {
  const rows: string[][] = [["No", "Sesi", "Hadiah", "Nomor", "Nama", "Info", "Status", "Sumber", "Waktu"]];
  state.draws.forEach((d, i) => {
    const session = state.sessions.find((s) => s.id === d.sessionId);
    const prize = session?.prizes.find((p) => p.id === d.prizeId);
    const who = getParticipant(state, d.participantId);
    rows.push([
      String(i + 1),
      session?.name ?? "",
      prize?.name ?? "",
      who?.number ?? "",
      who?.name ?? "",
      who?.info ?? "",
      STATUS[d.status],
      d.source === "acak" ? "Diundi" : "Manual",
      new Date(d.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
    ]);
  });
  return rows;
}

/** Baris sheet "Ringkasan": info acara + jumlah sah/hangus per hadiah. */
export function summaryRows(state: ShowState, now = new Date()): string[][] {
  const st = state.settings;
  const rows: string[][] = [
    ["Acara", st.eventTitle || "-"],
    ["Klien", st.companyName || "-"],
    ["Diexport", now.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })],
    ["Jumlah peserta", String(state.participants.length)],
    [],
    ["Sesi", "Hadiah", "Jumlah hadiah", "Pemenang sah", "Hangus", "Belum diundi"],
  ];
  let tq = 0, ts = 0, th = 0;
  for (const s of state.sessions)
    for (const p of s.prizes) {
      const sah = state.draws.filter((d) => d.prizeId === p.id && d.status === "sah").length;
      const hangus = state.draws.filter((d) => d.prizeId === p.id && d.status === "hangus").length;
      rows.push([s.name, p.name, String(p.qty), String(sah), String(hangus), String(Math.max(0, p.qty - sah))]);
      tq += p.qty;
      ts += sah;
      th += hangus;
    }
  rows.push(["Total", "", String(tq), String(ts), String(th), String(Math.max(0, tq - ts))]);
  return rows;
}

export function xlsxFilename(state: ShowState, now = new Date()): string {
  const slug = (state.settings.eventTitle || "acara").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "acara";
  return `pemenang-${slug}-${now.toISOString().slice(0, 10)}.xlsx`;
}

/** Buat file .xlsx (pembaca/penulis Excel dimuat hanya saat dibutuhkan). */
export async function winnersXlsx(state: ShowState): Promise<Blob> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const toSheet = (rows: string[][], widths: number[], numeric: number[] = []) => {
    // Semua sel teks (nomor kupon 007 tetap 007), kecuali kolom angka yang ditandai.
    const ws = XLSX.utils.aoa_to_sheet(rows.map((r, i) => r.map((v, c) => (i > 0 && numeric.includes(c) && /^\d+$/.test(v) ? Number(v) : v))));
    ws["!cols"] = widths.map((wch) => ({ wch }));
    return ws;
  };
  const w = winnerRows(state);
  const pemenang = toSheet(w, [5, 16, 28, 10, 26, 16, 14, 9, 20], [0]);
  pemenang["!autofilter"] = { ref: `A1:I${w.length}` };
  XLSX.utils.book_append_sheet(wb, pemenang, "Pemenang");
  XLSX.utils.book_append_sheet(wb, toSheet(summaryRows(state), [18, 28, 14, 14, 10, 14]), "Ringkasan");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
