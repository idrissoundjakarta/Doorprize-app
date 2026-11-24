"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ShowState } from "@/engine/types";
import { LedStage } from "@/show/LedStage";
import { unlockAudio } from "@/show/sound";

const LONG_PRESS_MS = 550;

/**
 * Mode satu layar / Mode HP: show memenuhi layar, kontrol lewat sentuhan.
 * - Tap di mana saja = lanjut (NEXT). Engine sudah mengabaikan tap ganda & tap saat animasi undi.
 * - Tahan ±0,5 dtk = buka/tutup menu operator (hangus, layar hitam, keluar).
 * - Keyboard & clicker tetap berfungsi (M = menu).
 * - Layar dijaga tetap menyala selama show (Wake Lock).
 */
export function SoloShow({ state, onNext, panel, setPanel, children }: { state: ShowState; onNext: () => void; panel: ReactNode | null; setPanel: (fn: (open: boolean) => boolean) => void; children?: ReactNode }) {
  const [hint, setHint] = useState(true);
  const press = useRef<{ t: ReturnType<typeof setTimeout>; x: number; y: number; long: boolean } | null>(null);

  // Petunjuk singkat di awal, hilang sendiri.
  useEffect(() => {
    const id = setTimeout(() => setHint(false), 4500);
    return () => clearTimeout(id);
  }, []);

  // Jaga layar tetap menyala (HP/tablet/laptop yang mendukung).
  useEffect(() => {
    type WakeLock = { release: () => Promise<void> };
    let lock: WakeLock | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLock> } };
    const req = async () => {
      try {
        lock = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        /* tidak didukung atau ditolak */
      }
    };
    void req();
    const onVis = () => document.visibilityState === "visible" && void req();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, []);

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    unlockAudio();
    const p = { x: e.clientX, y: e.clientY, long: false, t: setTimeout(() => {
      p.long = true;
      setPanel((o) => !o);
      if ("vibrate" in navigator) navigator.vibrate?.(15);
    }, LONG_PRESS_MS) };
    press.current = p;
  };
  const up = () => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.t);
    if (p.long) return;
    setHint(false);
    if (panel) setPanel(() => false); // tap di luar menu = tutup menu
    else onNext();
  };
  const move = (e: React.PointerEvent) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 24) {
      clearTimeout(p.t);
      press.current = null; // geser = bukan tap
    }
  };

  return (
    <main className="solo" onContextMenu={(e) => e.preventDefault()}>
      <div className="solo-touch" onPointerDown={down} onPointerUp={up} onPointerMove={move} onPointerCancel={() => { if (press.current) clearTimeout(press.current.t); press.current = null; }}>
        <LedStage state={state} audio />
      </div>
      {hint && !panel && (
        <div className="solo-hint">
          <b>Tap layar</b> = lanjut · <b>Tahan</b> = menu operator
        </div>
      )}
      <div className="rotate-hint">↻ Putar HP ke posisi mendatar (landscape) supaya pas di layar LED</div>
      {panel && <div className="solo-panel">{panel}</div>}
      {children}
    </main>
  );
}
