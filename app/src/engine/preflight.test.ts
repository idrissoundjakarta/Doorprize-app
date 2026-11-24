import { describe, expect, it } from "vitest";
import { preflight, preflightOk } from "./preflight";
import { emptyShow, generateRange, sampleShow } from "./sample";

describe("cek sebelum show", () => {
  it("acara baru yang kosong tidak bisa dimulai", () => {
    const c = preflight(emptyShow());
    expect(preflightOk(c)).toBe(false);
    expect(c.map((x) => x.text)).toEqual(expect.arrayContaining(["Belum ada peserta", "Belum ada hadiah"]));
  });

  it("hadiah lebih banyak dari peserta = error", () => {
    const s = { ...sampleShow(), participants: generateRange(1, 5) };
    const c = preflight(s);
    expect(preflightOk(c)).toBe(false);
    expect(c.some((x) => x.text.includes("lebih banyak dari peserta"))).toBe(true);
  });

  it("data contoh bisa dimulai, tapi ada peringatan foto & sesi", () => {
    const s = sampleShow();
    s.sessions.push({ id: "x", name: "Sesi kosong", prizes: [] });
    const c = preflight(s);
    expect(preflightOk(c)).toBe(true);
    expect(c.some((x) => x.level === "warn" && x.text.includes("foto"))).toBe(true);
    expect(c.some((x) => x.text.includes("Sesi kosong"))).toBe(true);
  });
});
