import { describe, expect, it } from "vitest";
import { DEBOUNCE_MS, DIGIT_FINAL_HOLD_MS, DIGIT_LOCK_MS, FINAL_HOLD_MS, autoDuration, getDraw, getParticipant, manualStepLabel, manualSteps, reduce, resumeAfterReload } from "./engine";
import { createShow, DEFAULT_SETTINGS } from "./sample";
import type { Participant, ShowState } from "./types";

let t = 5_000_000;
const people = (nums: string[]): Participant[] => nums.map((n, i) => ({ id: `p${i}`, number: n, name: `Orang ${i}` }));
const show = (nums: string[], mode: "auto" | "manual" = "manual", qty = 1): ShowState =>
  createShow([{ id: "s", name: "Sesi", prizes: [{ id: "a", name: "A", qty }] }], people(nums), { ...DEFAULT_SETTINGS, style: "digit", drawMode: mode }, t);
const next = (s: ShowState, gap = DEBOUNCE_MS + 1) => reduce(s, { type: "NEXT", now: (t += gap) }, () => 0);
const auto = (s: ShowState) => reduce(s, { type: "AUTO_DONE", seq: s.sceneSeq, now: (t += 10) });
/** looping → opener → showcase → ready → undi */
const toDraw = (s: ShowState) => next(next(auto(next(s))));
const sc = (s: ShowState) => s.scene as Extract<ShowState["scene"], { kind: "draw" }>;

describe("Mode Manual (aba-aba MC)", () => {
  it("satu klik = satu digit, lalu reveal setelah jeda", () => {
    let s = toDraw(show(["347"]));
    expect(sc(s).manual).toBe(true);
    expect(sc(s).revealed).toBe(0);
    expect(autoDuration(s)).toBeNull(); // menunggu aba-aba, tanpa batas waktu
    s = next(s, DIGIT_LOCK_MS + 1);
    expect(sc(s).revealed).toBe(1);
    s = next(s, DIGIT_LOCK_MS + 1);
    s = next(s, DIGIT_LOCK_MS + 1);
    expect(sc(s).revealed).toBe(3);
    expect(s.scene.kind).toBe("draw"); // digit terakhir ditahan sebentar
    expect(autoDuration(s)).toBe(sc(s).lockedAt! - s.sceneAt + DIGIT_FINAL_HOLD_MS);
    s = auto(s);
    expect(s.scene.kind).toBe("reveal");
  });

  it("klik ganda / tertahan tidak melompati digit", () => {
    let s = toDraw(show(["347"]));
    s = next(s, DIGIT_LOCK_MS + 1);
    s = next(s, 50);
    s = next(s, 50);
    expect(sc(s).revealed).toBe(1);
  });

  it("menunggu MC walau lebih lama dari tempo Auto; sinyal auto tidak membuka reveal", () => {
    let s = toDraw(show(["347"]));
    s = reduce(s, { type: "AUTO_DONE", seq: s.sceneSeq, now: (t += 60_000) });
    expect(s.scene.kind).toBe("draw");
    expect(sc(s).revealed).toBe(0);
  });

  it("nol di depan dihitung (007 = 3 digit)", () => {
    let s = toDraw(show(["007"]));
    for (let i = 0; i < 3; i++) s = next(s, DIGIT_LOCK_MS + 1);
    expect(sc(s).revealed).toBe(3);
    expect(getParticipant(s, getDraw(s, sc(s).drawId)!.participantId)!.number).toBe("007");
  });

  it("panjang nomor berbeda (12345)", () => {
    let s = toDraw(show(["12345"]));
    for (let i = 0; i < 4; i++) s = next(s, DIGIT_LOCK_MS + 1);
    expect(s.scene.kind).toBe("draw");
    s = auto(s);
    expect(s.scene.kind).toBe("draw");
    s = auto(next(s, DIGIT_LOCK_MS + 1));
    expect(s.scene.kind).toBe("reveal");
  });

  it("pemenang sudah ditentukan sebelum digit pertama dibuka; timing tidak mengubah hasil", () => {
    const a = toDraw(show(["111", "222", "333"]));
    const winner = a.draws[0].participantId;
    let b = a;
    for (let i = 0; i < 3; i++) b = next(b, DIGIT_LOCK_MS + 1 + i * 5000);
    expect(b.draws[0].participantId).toBe(winner);
  });

  it("refresh di tengah: tetap menunggu, digit yang sudah terbuka tetap", () => {
    let s = toDraw(show(["347"]));
    s = next(s, DIGIT_LOCK_MS + 1);
    const r = resumeAfterReload(JSON.parse(JSON.stringify(s)), (t += 1000));
    expect(r.scene.kind).toBe("draw");
    expect(sc(r).revealed).toBe(1);
  });

  it("hangus → undi ulang mulai lagi dari digit pertama", () => {
    let s = toDraw(show(["111", "222"]));
    for (let i = 0; i < 3; i++) s = next(s, DIGIT_LOCK_MS + 1);
    s = auto(s);
    s = reduce(s, { type: "HANGUS", now: (t += 1000) });
    s = next(s); // ready → undi lagi
    expect(s.scene.kind).toBe("draw");
    expect(sc(s).revealed).toBe(0);
    expect(s.draws).toHaveLength(2);
    expect(s.draws[1].participantId).not.toBe(s.draws[0].participantId);
  });

  it("Auto tetap seperti sebelumnya (dan default untuk acara lama)", () => {
    const s = toDraw(show(["347"], "auto"));
    expect(sc(s).manual).toBeUndefined();
    const old = toDraw(createShow([{ id: "s", name: "S", prizes: [{ id: "a", name: "A", qty: 1 }] }], people(["347"]), { ...DEFAULT_SETTINGS, style: "digit" }, t));
    expect(sc(old).manual).toBeUndefined();
    expect(next(s).scene.kind).toBe("draw"); // NEXT diabaikan saat animasi Auto
  });

  it("gaya lain punya langkah sendiri: Slot reel = Perlambat → Stop!", () => {
    let s = toDraw(createShow([{ id: "s", name: "S", prizes: [{ id: "a", name: "A", qty: 1, style: "reel" }] }], people(["34715"]), { ...DEFAULT_SETTINGS, style: "digit", drawMode: "manual" }, t));
    expect(sc(s).manual).toBe(true);
    expect(manualStepLabel("reel", 0)).toBe("Perlambat");
    s = next(s, DIGIT_LOCK_MS + 1);
    expect(autoDuration(s)).toBeNull(); // masih menunggu "Stop!"
    s = next(s, DIGIT_LOCK_MS + 1);
    expect(sc(s).revealed).toBe(2);
    expect(sc(s).stepTimes).toHaveLength(2);
    expect(autoDuration(s)).toBe(sc(s).lockedAt! - s.sceneAt + FINAL_HOLD_MS.reel);
    expect(auto(s).scene.kind).toBe("reveal");
  });

  it("jumlah langkah per gaya", () => {
    expect(manualSteps("digit", "007")).toBe(3);
    expect(manualSteps("debu", "12345")).toBe(5);
    expect(manualSteps("sorot", "12 34")).toBe(4);
    expect(manualSteps("reel", "12345")).toBe(2);
    expect(manualSteps("amplop", "1")).toBe(2);
    expect(manualSteps("kado", "123")).toBe(2);
    expect(manualStepLabel("kado", 1)).toBe("Buka kado!");
    expect(manualStepLabel("amplop", 0)).toBe("Buka segel");
  });

  it("Amplop & Kado Manual: menunggu, 2 klik, lalu reveal", () => {
    for (const style of ["amplop", "kado"] as const) {
      let s = toDraw(createShow([{ id: "s", name: "S", prizes: [{ id: "a", name: "A", qty: 1, style }] }], people(["347"]), { ...DEFAULT_SETTINGS, drawMode: "manual" }, t));
      s = reduce(s, { type: "AUTO_DONE", seq: s.sceneSeq, now: (t += 30_000) });
      expect(s.scene.kind).toBe("draw");
      s = next(next(s, DIGIT_LOCK_MS + 1), DIGIT_LOCK_MS + 1);
      expect(auto(s).scene.kind).toBe("reveal");
    }
  });
});
