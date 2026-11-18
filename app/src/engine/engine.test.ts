import { describe, expect, it } from "vitest";
import { DEBOUNCE_MS, eligible, reduce, resumeAfterReload, sahCount } from "./engine";
import { secureRandomInt } from "./rng";
import { createShow, generateRange, sampleShow } from "./sample";
import type { Action, ShowState } from "./types";

let t = 1_000_000;
const later = () => (t += DEBOUNCE_MS + 1);

function run(state: ShowState, ...types: ("NEXT" | "BACK" | "AUTO" | "HANGUS")[]): ShowState {
  for (const ty of types) {
    const now = later();
    const a: Action = ty === "AUTO" ? { type: "AUTO_DONE", seq: state.sceneSeq, now } : { type: ty, now };
    state = reduce(state, a);
  }
  return state;
}

function tiny(): ShowState {
  return createShow(
    [
      { id: "s1", name: "Sesi 1", prizes: [{ id: "a", name: "A", qty: 2 }, { id: "b", name: "B", qty: 1 }] },
      { id: "s2", name: "Grand", prizes: [{ id: "c", name: "C", qty: 1 }] },
    ],
    generateRange(1, 10),
    undefined,
    t,
  );
}

describe("flow adegan", () => {
  it("mengikuti urutan MVP dari looping sampai penutup", () => {
    let s = tiny();
    expect(s.scene).toEqual({ kind: "looping", session: 0 });
    s = run(s, "NEXT");
    expect(s.scene.kind).toBe("opener");
    s = run(s, "AUTO");
    expect(s.scene).toEqual({ kind: "showcase", session: 0, prize: 0 });
    s = run(s, "NEXT", "NEXT");
    expect(s.scene.kind).toBe("draw");
    s = run(s, "AUTO");
    expect(s.scene.kind).toBe("reveal");
    // A masih tersisa 1 → langsung undi tanpa showcase
    s = run(s, "NEXT");
    expect(s.scene.kind).toBe("draw");
    s = run(s, "AUTO", "NEXT");
    // A habis → showcase B
    expect(s.scene).toEqual({ kind: "showcase", session: 0, prize: 1 });
    s = run(s, "NEXT", "NEXT", "AUTO", "NEXT");
    // sesi 1 selesai → looping dengan teaser sesi 2
    expect(s.scene).toEqual({ kind: "looping", session: 1 });
    s = run(s, "NEXT", "AUTO", "NEXT", "NEXT", "AUTO", "NEXT");
    expect(s.scene.kind).toBe("end");
    expect(s.draws.filter((d) => d.status === "sah")).toHaveLength(4);
  });

  it("hangus: tercatat, keluar dari undian, kembali ke Ready", () => {
    let s = run(tiny(), "NEXT", "AUTO", "NEXT", "NEXT", "AUTO");
    const loser = s.draws[0].participantId;
    s = run(s, "HANGUS");
    expect(s.scene.kind).toBe("ready");
    expect(s.draws[0].status).toBe("hangus");
    expect(eligible(s).map((p) => p.id)).not.toContain(loser);
    expect(eligible(s)).toHaveLength(9);
    expect(sahCount(s, "a")).toBe(0);
    s = run(s, "NEXT", "AUTO", "NEXT");
    expect(sahCount(s, "a")).toBe(1);
  });

  it("satu peserta tidak bisa menang dua kali", () => {
    let s = sampleShow(t);
    for (let i = 0; i < 200; i++) s = run(s, s.scene.kind === "opener" || s.scene.kind === "draw" ? "AUTO" : "NEXT");
    const ids = s.draws.map((d) => d.participantId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(s.scene.kind).toBe("end");
  });

  it("peserta habis: Ready tidak bisa lanjut", () => {
    let s = createShow([{ id: "s", name: "S", prizes: [{ id: "a", name: "A", qty: 3 }] }], generateRange(1, 1), undefined, t);
    s = run(s, "NEXT", "AUTO", "NEXT", "NEXT", "AUTO", "NEXT");
    expect(s.scene.kind).toBe("ready");
    expect(run(s, "NEXT").scene.kind).toBe("ready");
  });

  it("anti dobel-tekan: NEXT kedua yang terlalu cepat diabaikan", () => {
    let s = tiny();
    s = reduce(s, { type: "NEXT", now: later() });
    const again = reduce(s, { type: "NEXT", now: s.sceneAt + 100 });
    expect(again).toBe(s);
  });

  it("NEXT diabaikan selama adegan auto", () => {
    const s = run(tiny(), "NEXT", "AUTO", "NEXT", "NEXT");
    expect(s.scene.kind).toBe("draw");
    expect(run(s, "NEXT").scene.kind).toBe("draw");
  });

  it("sinyal auto basi tidak berpengaruh", () => {
    const s = run(tiny(), "NEXT");
    expect(reduce(s, { type: "AUTO_DONE", seq: s.sceneSeq - 1, now: later() })).toBe(s);
  });

  it("refresh di tengah undian → lanjut Reveal dengan pemenang yang sama", () => {
    const s = run(tiny(), "NEXT", "AUTO", "NEXT", "NEXT");
    const r = resumeAfterReload(JSON.parse(JSON.stringify(s)), later());
    expect(r.scene.kind).toBe("reveal");
    expect(r.draws).toEqual(s.draws);
  });

  it("BACK hanya sebelum undian", () => {
    let s = run(tiny(), "NEXT", "AUTO", "NEXT");
    expect(run(s, "BACK").scene.kind).toBe("showcase");
    s = run(s, "NEXT", "AUTO");
    expect(run(s, "BACK").scene.kind).toBe("reveal");
  });
});

describe("pengacakan", () => {
  it("merata (uji kasar)", () => {
    const n = 7, N = 70_000, c = new Array(n).fill(0);
    for (let i = 0; i < N; i++) c[secureRandomInt(n)]++;
    for (const x of c) expect(Math.abs(x - N / n)).toBeLessThan(N / n * 0.05);
  });
});
