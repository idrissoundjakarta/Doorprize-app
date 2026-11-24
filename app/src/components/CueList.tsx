"use client";

import { useEffect, useRef, useState } from "react";
import { cueList, type CueStatus } from "@/engine/cues";
import { firstOpenPrize, remaining } from "@/engine/engine";
import type { ShowState } from "@/engine/types";

const ICON: Record<CueStatus, string> = { done: "✓", current: "●", next: "→", upcoming: "", skipped: "↷" };

/**
 * Urutan show (cue list) di jendela operator: semua adegan dari awal sampai penutup,
 * dikelompokkan per sesi. Posisi sekarang disorot dan otomatis terlihat.
 */
export function CueList({ state, onJump }: { state: ShowState; onJump: (session: number) => void }) {
  const groups = cueList(state);
  const sc = state.scene;
  const curSession = "session" in sc ? sc.session : -1;
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const box = useRef<HTMLDivElement>(null);

  // Gulung otomatis ke adegan yang sedang tampil.
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(".cue.current");
    const parent = box.current;
    if (el && parent) parent.scrollTo({ top: el.offsetTop - parent.offsetTop - parent.clientHeight / 3, behavior: "smooth" });
  }, [state.sceneSeq]);

  const busy = sc.kind === "draw" || sc.kind === "reveal";
  return (
    <div className="cues" ref={box}>
      {groups.map((g) => {
        const isCur = g.session === curSession || (g.session === -1 && sc.kind === "end");
        const expanded = open[g.session] ?? (isCur || !g.done);
        const s = state.sessions[g.session];
        const total = s ? s.prizes.reduce((n, p) => n + p.qty, 0) : 0;
        const done = s ? total - s.prizes.reduce((n, p) => n + remaining(state, p), 0) : 0;
        return (
          <div key={g.session} className={`cue-group ${isCur ? "current" : ""}`}>
            <div className="row cue-head">
              <button className="row grow" style={{ gap: 8, textAlign: "left" }} onClick={() => setOpen({ ...open, [g.session]: !expanded })}>
                <span className="muted small" style={{ width: 12 }}>{expanded ? "▾" : "▸"}</span>
                <b style={{ fontSize: 15 }}>{g.name}</b>
              </button>
              {g.session >= 0 && (g.done ? <span className="chip c-go">✓ Selesai</span> : <span className="small" style={{ fontWeight: 600 }}>{done}/{total}</span>)}
              {g.session >= 0 && !g.done && !isCur && firstOpenPrize(state, g.session) !== null && (
                <button className="btn b-sm b-ghost" disabled={busy} onClick={() => onJump(g.session)} title="Lompat ke sesi ini">Lompat</button>
              )}
            </div>
            {g.session >= 0 && !g.done && <div className="progress" style={{ margin: "6px 0 4px 20px" }}><i style={{ width: `${(done / Math.max(1, total)) * 100}%` }} /></div>}
            {expanded && (
              <div className="cue-items">
                {g.cues.map((c) => (
                  <div key={c.id} className={`cue ${c.status}`}>
                    <span className="cue-ico">{ICON[c.status]}</span>
                    <span className="cue-label">{c.label}</span>
                    <span className="cue-sub">{c.sub}</span>
                    {c.status === "current" && <span className="chip c-ink" style={{ padding: "3px 8px", fontSize: 10 }}>LIVE</span>}
                    {c.status === "next" && <span className="muted" style={{ fontSize: 11 }}>berikutnya</span>}
                    {c.status === "skipped" && <span className="muted" style={{ fontSize: 11 }}>dilewati</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
