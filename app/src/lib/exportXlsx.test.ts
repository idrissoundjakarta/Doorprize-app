import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { DEBOUNCE_MS, reduce } from "@/engine/engine";
import { createShow } from "@/engine/sample";
import type { ShowState } from "@/engine/types";
import { summaryRows, winnerRows, winnersXlsx, xlsxFilename } from "./exportXlsx";

let t = 9_000_000;
const step = (s: ShowState, ty: "NEXT" | "AUTO" | "HANGUS") => {
  t += DEBOUNCE_MS + 1;
  return reduce(s, ty === "AUTO" ? { type: "AUTO_DONE", seq: s.sceneSeq, now: t } : { type: ty, now: t }, () => 0);
};
const people = ["007", "012", "345"].map((n, i) => ({ id: `p${i}`, number: n, name: `Orang ${i}`, info: "IT" }));
function played(): ShowState {
  let s = createShow([{ id: "s", name: "Grand Prize", prizes: [{ id: "a", name: "Motor", qty: 1 }] }], people, undefined, t);
  s = { ...s, settings: { ...s.settings, eventTitle: "Family Day 2026" } };
  for (const a of ["NEXT", "AUTO", "NEXT", "NEXT", "AUTO", "HANGUS", "NEXT", "AUTO", "NEXT"] as const) s = step(s, a);
  return s;
}

describe("export Excel", () => {
  it("memuat semua hasil termasuk hangus, nomor tetap teks", () => {
    const rows = winnerRows(played());
    expect(rows[0]).toEqual(["No", "Sesi", "Hadiah", "Nomor", "Nama", "Info", "Status", "Sumber", "Waktu"]);
    expect(rows.slice(1).map((r) => r[6])).toEqual(["Hangus", "Sah"]);
    expect(rows[1][3]).toBe("007");
  });

  it("ringkasan per hadiah", () => {
    const r = summaryRows(played());
    expect(r.find((x) => x[1] === "Motor")).toEqual(["Grand Prize", "Motor", "1", "1", "1", "0"]);
    expect(r[r.length - 1][0]).toBe("Total");
  });

  it("file .xlsx bisa dibaca kembali dengan 2 sheet, 007 tidak berubah jadi 7", async () => {
    const blob = await winnersXlsx(played());
    const wb = XLSX.read(new Uint8Array(await blob.arrayBuffer()), { type: "array" });
    expect(wb.SheetNames).toEqual(["Pemenang", "Ringkasan"]);
    const data = XLSX.utils.sheet_to_json<string[]>(wb.Sheets.Pemenang, { header: 1, raw: false });
    expect(data[1][3]).toBe("007");
    expect(xlsxFilename(played(), new Date("2026-11-25"))).toBe("pemenang-family-day-2026-2026-11-25.xlsx");
  });
});
