import { uid } from "@/engine/rng";
import type { Participant } from "@/engine/types";

/** Batas karakter nama sebelum ditandai "disingkat di layar". */
export const LONG_NAME = 28;

/** Baca file xlsx/xls/csv menjadi baris & kolom (sheet pertama). */
export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
    const text = await file.text();
    const sep = text.includes("\t") ? "\t" : (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
    return text.split(/\r?\n/).map((l) => splitCsv(l, sep));
  }
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" });
}

function splitCsv(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === sep && !q) { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out;
}

export type ParseResult = {
  people: Participant[];
  dup: number;
  blank: number;
  long: number;
  preview: { number: string; name: string; info: string; flag?: "dup" | "long" }[];
};

/** Ubah baris menjadi peserta + bersihkan: lewati baris tanpa nomor & duplikat, tandai nama panjang. */
export function parseRows(rows: string[][], map: { number: number; name: number; info: number }): ParseResult {
  const seen = new Set<string>();
  const people: Participant[] = [];
  const preview: ParseResult["preview"] = [];
  let dup = 0, blank = 0, long = 0;
  const get = (r: string[], i: number) => (i >= 0 ? String(r[i] ?? "").trim().replace(/\s+/g, " ") : "");
  for (const r of rows) {
    const number = get(r, map.number), name = get(r, map.name), info = get(r, map.info);
    if (!number) { blank++; continue; }
    const isDup = seen.has(number);
    const isLong = name.length > LONG_NAME;
    if (preview.length < 8) preview.push({ number, name, info, flag: isDup ? "dup" : isLong ? "long" : undefined });
    if (isDup) { dup++; continue; }
    if (isLong) long++;
    seen.add(number);
    people.push({ id: uid(), number, name: name || undefined, info: info || undefined });
  }
  return { people, dup, blank, long, preview };
}
