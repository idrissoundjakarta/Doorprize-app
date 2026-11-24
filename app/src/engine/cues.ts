import { firstOpenPrize, getDraw, sahCount } from "./engine";
import type { SceneKind, ShowState } from "./types";

export type CueStatus = "done" | "current" | "next" | "upcoming" | "skipped";
export type Cue = {
  id: string;
  kind: Exclude<SceneKind, "draw" | "reveal" | "end"> | "undi" | "end";
  label: string;
  sub?: string;
  session: number;
  status: CueStatus;
};
export type CueGroup = { session: number; name: string; done: boolean; cues: Cue[] };

/**
 * Urutan show lengkap, disusun dari sesi & hadiah (cue list).
 * Undi + reveal digabung jadi satu baris per pemenang. Dipakai jendela operator.
 */
export function cueList(state: ShowState): CueGroup[] {
  const groups: CueGroup[] = [];
  const flat: Cue[] = [];
  state.sessions.forEach((s, si) => {
    if (s.prizes.length === 0) return;
    const cues: Cue[] = [];
    const add = (c: Omit<Cue, "status" | "session">) => {
      const cue = { ...c, session: si, status: "upcoming" as CueStatus };
      cues.push(cue);
      flat.push(cue);
    };
    add({ id: `l${si}`, kind: "looping", label: "Looping", sub: `Teaser ${s.name}` });
    add({ id: `o${si}`, kind: "opener", label: "Opener", sub: s.name });
    s.prizes.forEach((p, pi) => {
      add({ id: `s${si}.${pi}`, kind: "showcase", label: "Showcase", sub: p.name });
      add({ id: `r${si}.${pi}`, kind: "ready", label: "Ready", sub: p.name });
      for (let k = 0; k < p.qty; k++) add({ id: `u${si}.${pi}.${k}`, kind: "undi", label: `Undi${p.qty > 1 ? ` ${k + 1}/${p.qty}` : ""}`, sub: p.name });
    });
    groups.push({ session: si, name: s.name, done: firstOpenPrize(state, si) === null, cues });
  });
  const end: Cue = { id: "end", kind: "end", label: "Penutup", sub: "Terima kasih", session: -1, status: "upcoming" };
  flat.push(end);

  // Cari posisi adegan sekarang.
  const sc = state.scene;
  let cur = -1;
  if (sc.kind === "end") cur = flat.length - 1;
  else if (sc.kind === "looping") cur = flat.findIndex((c) => c.id === `l${sc.session}`);
  else if (sc.kind === "opener") cur = flat.findIndex((c) => c.id === `o${sc.session}`);
  else if (sc.kind === "showcase") cur = flat.findIndex((c) => c.id === `s${sc.session}.${sc.prize}`);
  else if (sc.kind === "ready") cur = flat.findIndex((c) => c.id === `r${sc.session}.${sc.prize}`);
  else {
    const prize = state.sessions[sc.session].prizes[sc.prize];
    const k = Math.min(prize.qty - 1, sahCount(state, prize.id) - (getDraw(state, sc.drawId)?.status === "sah" ? 1 : 0));
    cur = flat.findIndex((c) => c.id === `u${sc.session}.${sc.prize}.${k}`);
  }

  // Status: sesi yang sudah tuntas = selesai; sebelum posisi sekarang tapi belum tuntas = dilewati (lompat sesi).
  flat.forEach((c, i) => {
    const sessDone = c.session >= 0 && firstOpenPrize(state, c.session) === null;
    if (i === cur) c.status = "current";
    else if (sessDone) c.status = "done";
    else if (i < cur) c.status = c.session === flat[cur]?.session ? "done" : "skipped";
    else if (i === cur + 1) c.status = "next";
  });
  // Undi per hadiah yang sudah sah = selesai (walaupun urutannya dilompati).
  state.sessions.forEach((s, si) =>
    s.prizes.forEach((p, pi) => {
      const n = sahCount(state, p.id);
      for (let k = 0; k < n; k++) {
        const c = flat.find((x) => x.id === `u${si}.${pi}.${k}`);
        if (c && c.status !== "current") c.status = "done";
      }
    }),
  );
  groups.push({ session: -1, name: "Penutup", done: sc.kind === "end", cues: [end] });
  return groups;
}
