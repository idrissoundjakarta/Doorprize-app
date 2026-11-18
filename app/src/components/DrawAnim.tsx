"use client";

import { useEffect, useMemo, useState } from "react";
import { TEMPO_MS } from "@/engine/engine";
import type { ShowState } from "@/engine/types";
import { fit } from "@/lib/fit";

/**
 * Animasi undi (prototipe kasar). Pemenang SUDAH dipilih oleh engine;
 * angka acak di sini hanya hiasan tampilan (pakai hash sederhana, bukan pengacak undian).
 * Waktu dihitung dari awal adegan, jadi jendela show & pratinjau selalu sinkron.
 */
export function DrawAnim({ state, winner }: { state: ShowState; winner: string }) {
  const duration = TEMPO_MS[state.settings.tempo];
  const t = useElapsed(state.sceneAt, duration);
  return state.settings.style === "reel" ? (
    <Reel state={state} winner={winner} progress={t} />
  ) : (
    <Digits winner={winner} progress={t} frame={Math.floor((t * duration) / 60)} />
  );
}

function useElapsed(start: number, duration: number): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = Math.min(1, (Date.now() - start) / duration);
      setP(v);
      if (v < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, duration]);
  return p;
}

/** Angka semu yang stabil untuk hiasan animasi (hasil sama untuk input sama). */
function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

const CHARS = "0123456789";
const LETTERS = "ABCDEFGHIJKLMNOPRSTUW";

/** Buka digit: tiap karakter berputar lalu terkunci satu per satu, digit terakhir paling lama. */
function Digits({ winner, progress, frame }: { winner: string; progress: number; frame: number }) {
  const chars = [...winner];
  const n = chars.length;
  return (
    <div className="digits" style={{ fontSize: fit(winner, 26) }}>
      {chars.map((c, i) => {
        // Kunci tersebar 30%–75%, digit terakhir menunggu sampai 95%.
        const lockAt = i === n - 1 ? 0.95 : 0.3 + (0.45 * i) / Math.max(1, n - 1);
        const locked = progress >= lockAt;
        const pool = /\d/.test(c) ? CHARS : /[A-Za-z]/.test(c) ? LETTERS : c;
        const shown = locked || c === " " ? c : pool[hash(frame, i) % pool.length];
        return (
          <span key={i} className={`digit ${locked ? "locked" : ""}`}>
            {shown}
          </span>
        );
      })}
    </div>
  );
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 4);

/** Slot reel: kolom nomor meluncur lalu melambat ke pemenang. */
function Reel({ state, winner, progress }: { state: ShowState; winner: string; progress: number }) {
  const ROWS = 40;
  const ps = state.participants;
  const seq = state.sceneSeq;
  const list = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < ROWS - 1; i++) out.push(ps[hash(seq, i) % ps.length]?.number ?? "");
    out.push(winner);
    return out;
  }, [ps, seq, winner]);
  const pos = easeOut(progress) * (ROWS - 1);
  return (
    <div className="reel" style={{ fontSize: fit(winner, 14) }}>
      <div className="reel-strip" style={{ transform: `translateY(${-pos * 1.2}em)` }}>
        {list.map((v, i) => (
          <div key={i} className={`reel-item ${i === ROWS - 1 && progress >= 1 ? "locked" : ""}`}>
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}
