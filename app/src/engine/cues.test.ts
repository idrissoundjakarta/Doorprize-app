import { describe, expect, it } from "vitest";
import { cueList } from "./cues";
import { DEBOUNCE_MS, reduce } from "./engine";
import { createShow, generateRange } from "./sample";
import type { ShowState } from "./types";

let t = 2_000_000;
const step = (s: ShowState, ty: "NEXT" | "AUTO" | "HANGUS") => {
  t += DEBOUNCE_MS + 1;
  return reduce(s, ty === "AUTO" ? { type: "AUTO_DONE", seq: s.sceneSeq, now: t } : { type: ty, now: t });
};
const show = () =>
  createShow(
    [
      { id: "s1", name: "Sesi 1", prizes: [{ id: "a", name: "A", qty: 2 }] },
      { id: "s2", name: "Grand", prizes: [{ id: "b", name: "B", qty: 1 }] },
    ],
    generateRange(1, 20),
    undefined,
    t,
  );
const flat = (s: ShowState) => cueList(s).flatMap((g) => g.cues);
const current = (s: ShowState) => flat(s).find((c) => c.status === "current")!;

describe("urutan show (cue list)", () => {
  it("disusun dari sesi & hadiah, dengan penutup", () => {
    expect(flat(show()).map((c) => c.id)).toEqual(["l0", "o0", "s0.0", "r0.0", "u0.0.0", "u0.0.1", "l1", "o1", "s1.0", "r1.0", "u1.0.0", "end"]);
  });

  it("mengikuti posisi show: undi kedua hadiah yang sama", () => {
    let s = show();
    expect(current(s).id).toBe("l0");
    expect(flat(s)[1].status).toBe("next");
    for (const a of ["NEXT", "AUTO", "NEXT", "NEXT", "AUTO"] as const) s = step(s, a);
    expect(current(s).id).toBe("u0.0.0"); // reveal pertama
    s = step(s, "NEXT"); // sah → undi kedua
    expect(current(s).id).toBe("u0.0.1");
    expect(flat(s).find((c) => c.id === "u0.0.0")!.status).toBe("done");
  });

  it("hangus tidak memajukan urutan", () => {
    let s = show();
    for (const a of ["NEXT", "AUTO", "NEXT", "NEXT", "AUTO", "HANGUS"] as const) s = step(s, a);
    expect(current(s).id).toBe("r0.0");
    s = step(s, "NEXT");
    expect(current(s).id).toBe("u0.0.0");
  });
});

describe("mode gladi", () => {
  it("hasil gladi dibersihkan saat gladi selesai", () => {
    let s = reduce(show(), { type: "START_REHEARSAL", now: (t += 1000) });
    expect(s.rehearsal).toBe(true);
    for (const a of ["NEXT", "AUTO", "NEXT", "NEXT", "AUTO", "NEXT"] as const) s = step(s, a);
    expect(s.draws.length).toBeGreaterThan(0);
    s = reduce(s, { type: "END_REHEARSAL", now: (t += 1000) });
    expect(s.rehearsal).toBe(false);
    expect(s.draws).toHaveLength(0);
    expect(s.scene).toEqual({ kind: "looping", session: 0 });
  });

  it("gladi tidak bisa dimulai kalau show asli sudah berjalan", () => {
    let s = show();
    for (const a of ["NEXT", "AUTO", "NEXT", "NEXT", "AUTO"] as const) s = step(s, a);
    expect(reduce(s, { type: "START_REHEARSAL", now: (t += 1000) })).toBe(s);
  });
});
