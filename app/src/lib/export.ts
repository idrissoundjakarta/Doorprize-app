import { getParticipant } from "@/engine/engine";
import type { ShowState } from "@/engine/types";

/** Daftar pemenang (termasuk yang hangus) sebagai CSV yang rapi dibuka di Excel. */
export function winnersCsv(state: ShowState): string {
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
      d.status === "pending" ? "sedang tampil" : d.status,
      d.source,
      new Date(d.at).toLocaleString("id-ID"),
    ]);
  });
  const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // Pemisah ";" + BOM supaya Excel berbahasa Indonesia langsung membaca kolom & huruf dengan benar.
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

export function download(filename: string, content: string, type = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
