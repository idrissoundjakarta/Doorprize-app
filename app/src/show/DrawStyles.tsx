"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DrawStyle, Participant, ShowState } from "@/engine/types";
import { fit } from "@/lib/fit";
import { isLightPalette } from "@/lib/color";
import { sfxSwell, sfxTick } from "./sound";

/**
 * 5 gaya undian. Pemenang SUDAH dipilih engine sebelum animasi dimulai;
 * semua angka acak di sini hanya hiasan (hash, bukan pengacak undian).
 * Waktu dihitung dari awal adegan, jadi jendela show & pratinjau selalu sinkron.
 */
export type DrawProps = { state: ShowState; winner: Participant; p: number; audio: boolean; duration: number };

export function useProgress(start: number, duration: number): number {
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

export function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Bunyikan sekali ketika `n` bertambah. */
function useTickOn(n: number, audio: boolean, strongAt?: number) {
  const prev = useRef(n);
  useEffect(() => {
    if (audio && n > prev.current) sfxTick(strongAt !== undefined && n >= strongAt);
    prev.current = n;
  }, [n, audio, strongAt]);
}

export function DrawStyleView({ style, ...props }: DrawProps & { style: DrawStyle }) {
  switch (style) {
    case "reel":
      return <Reel {...props} />;
    case "amplop":
      return <Amplop {...props} />;
    case "debu":
      return <Debu {...props} />;
    case "sorot":
      return <Sorot {...props} />;
    default:
      return <Digits {...props} />;
  }
}

// ---------- 1. Buka digit ----------
function Digits({ winner, p, audio, duration }: DrawProps) {
  const chars = [...winner.number];
  const n = chars.length;
  const lockAt = (i: number) => (i === n - 1 ? 0.9 : 0.22 + (0.4 * i) / Math.max(1, n - 1));
  const locked = chars.filter((_, i) => p >= lockAt(i)).length;
  useTickOn(locked, audio, n);
  // Putaran melambat menjelang akhir.
  const spin = (duration / 1000) * (14 * p - 5 * p * p);
  return (
    <div className="digits" style={{ fontSize: fit(winner.number, 22, 70) }}>
      {chars.map((c, i) => {
        const isLocked = p >= lockAt(i);
        const isNum = /\d/.test(c);
        const pos = spin * (1 + i * 0.13) + i * 3.7;
        const a = isNum ? (hash(Math.floor(pos), i) % 10).toString() : c;
        const b = isNum ? (hash(Math.floor(pos) + 1, i) % 10).toString() : c;
        const frac = pos % 1;
        return (
          <div key={i} className={`dbox ${isLocked ? "locked" : ""} ${i === n - 1 && !isLocked && p > 0.6 ? "suspense" : ""}`}>
            {isLocked || !isNum ? (
              <span className="gold-text">{c}</span>
            ) : (
              <div className="dstrip" style={{ transform: `translateY(${-frac * 100}%)`, filter: `blur(${0.025 * (1 - p * 0.6)}em)` }}>
                <span>{a}</span>
                <span>{b}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- 2. Slot reel ----------
const ROWS = 48;
function Reel({ state, winner, p, audio }: DrawProps) {
  const ps = state.participants;
  const seq = state.sceneSeq;
  const list = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < ROWS - 1; i++) out.push(ps[hash(seq, i) % ps.length]?.number ?? "");
    out.push(winner.number);
    return out;
  }, [ps, seq, winner.number]);
  const e = 1 - Math.pow(1 - p, 4);
  const pos = e * (ROWS - 1);
  const speed = 4 * Math.pow(1 - p, 3) * (ROWS - 1);
  useTickOn(p > 0.55 ? Math.floor(pos) : 0, audio, ROWS - 1);
  return (
    <div className="reel-wrap" style={{ fontSize: fit(winner.number, 17, 60) }}>
      <div className="reel-band" />
      <div className="reel">
        <div className="reel-strip" style={{ transform: `translateY(${(-pos + 1) * 1.25}em)`, filter: `blur(${Math.min(0.06, speed * 0.0006)}em)` }}>
          {list.map((v, i) => (
            <div key={i} className={`reel-item ${i === ROWS - 1 && p > 0.97 ? "gold-text win" : ""}`}>
              {v}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- 3. Amplop emas ----------
function Amplop({ state, winner, p, audio, duration }: DrawProps) {
  const prize = state.scene.kind === "draw" ? state.sessions[state.scene.session].prizes[state.scene.prize] : undefined;
  const a = easeOut(seg(p, 0, 0.3)); // amplop mendekat
  const seal = seg(p, 0.3, 0.38);
  const flap = easeInOut(seg(p, 0.36, 0.5));
  const card = easeInOut(seg(p, 0.5, 0.82));
  const zoom = easeInOut(seg(p, 0.84, 1));
  const opened = p >= 0.33 ? 1 : 0;
  useTickOn(opened, audio);
  useEffect(() => {
    if (audio) sfxSwell();
  }, [audio]);
  const float = Math.sin((p * duration) / 600) * 0.6 * (1 - card);
  return (
    <div className="env-stage" style={{ transform: `translateY(${(1 - a) * 40 + float + card * 10}cqmin) scale(${0.6 + 0.4 * a + zoom * 0.12})`, opacity: a }}>
      <div className="env">
        <div className="env-back" />
        <div className="env-card" style={{ transform: `translateY(${-card * 62}%)` }}>
          <div className="env-lbl">PEMENANG</div>
          <div className="env-rule" />
          <div className="env-num" style={{ fontSize: fit(winner.number, 17, 34) }}>{winner.number}</div>
          <div className="env-rule" />
          <div className="env-prize">{prize?.name}</div>
        </div>
        <div className="env-front" />
        <div className="env-flap" style={{ transform: `rotateX(${flap * 180}deg)`, zIndex: flap > 0.5 ? 0 : 4 }} />
        <div className="env-seal" style={{ transform: `translate(-50%,-50%) scale(${1 + seal * 0.6})`, opacity: 1 - seal }} />
      </div>
    </div>
  );
}

// ---------- 4. Debu emas ----------
function Debu({ state, winner, audio }: DrawProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { sceneAt } = state;
  const duration = useMemo(() => ({ cepat: 4000, normal: 6000, dramatis: 8000 })[state.settings.tempo], [state.settings.tempo]);
  const { primary, primary2 } = state.settings.theme.palette;
  const light = isLightPalette(state.settings.theme.palette);
  const font = state.settings.theme.fontBody;
  useEffect(() => {
    if (audio) sfxSwell();
  }, [audio]);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const W = (cv.width = Math.round(cv.clientWidth * Math.min(devicePixelRatio, 1.5)));
    const H = (cv.height = Math.round(cv.clientHeight * Math.min(devicePixelRatio, 1.5)));
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const o = off.getContext("2d")!;
    const size = Math.min(H * 0.36, (W * 0.8) / Math.max(1, winner.number.length * 0.62));
    o.font = `800 ${size}px ${font}, sans-serif`;
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.fillText(winner.number, W / 2, H * 0.53);
    const data = o.getImageData(0, 0, W, H).data;
    const step = Math.max(3, Math.round(H / 260));
    let pts: [number, number][] = [];
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
    if (pts.length > 3200) pts = pts.filter((_, i) => hash(i, 7) % pts.length < 3200);
    const cols = [primary2, primary, light ? primary : "#FFF6DD"];
    const parts = pts.map(([tx, ty], i) => {
      const ang = (hash(i, 1) / 4294967296) * Math.PI * 2;
      const rad = H * (0.45 + (hash(i, 2) / 4294967296) * 0.9);
      return { tx, ty, sx: W / 2 + Math.cos(ang) * rad * 1.5, sy: H / 2 + Math.sin(ang) * rad * 0.8, d: (hash(i, 3) / 4294967296) * 0.32, s: 0.8 + (hash(i, 4) / 4294967296) * 1.8, c: cols[i % 3], tw: hash(i, 5) % 100 };
    });
    const dust = Array.from({ length: 160 }, (_, i) => ({ x: (hash(i, 9) / 4294967296) * W, y: (hash(i, 10) / 4294967296) * H, s: 0.6 + (hash(i, 11) % 100) / 60 }));
    const u = H / 1080;
    let raf = 0;
    const draw = () => {
      const now = Date.now();
      const p = clamp((now - sceneAt) / duration);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";
      for (const d of dust) {
        ctx.globalAlpha = 0.15 + 0.15 * Math.sin(now / 700 + d.x);
        ctx.fillStyle = primary2;
        ctx.beginPath();
        ctx.arc(d.x, (d.y - now * 0.01 * u) % H < 0 ? H + ((d.y - now * 0.01 * u) % H) : (d.y - now * 0.01 * u) % H, d.s * u, 0, 7);
        ctx.fill();
      }
      for (const q of parts) {
        const t = easeInOut(clamp((p - q.d) / (0.84 - q.d)));
        const sw = (1 - t) * 2.2;
        const cx = W / 2, cy = H / 2;
        const rx = q.sx - cx, ry = q.sy - cy;
        const sx = cx + rx * Math.cos(sw) - ry * Math.sin(sw), sy = cy + rx * Math.sin(sw) + ry * Math.cos(sw);
        const x = sx + (q.tx - sx) * t, y = sy + (q.ty - sy) * t;
        ctx.globalAlpha = (0.25 + 0.75 * t) * (0.75 + 0.25 * Math.sin(now / 160 + q.tw));
        ctx.fillStyle = q.c;
        ctx.beginPath();
        ctx.arc(x, y, q.s * u * (1.6 - 0.5 * t), 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [winner.number, sceneAt, duration, primary, primary2, font, light]);
  return <canvas ref={ref} className="dust-canvas" />;
}

// ---------- 5. Sorot cahaya ----------
function Sorot({ winner, p, audio }: DrawProps) {
  const sweep = easeInOut(seg(p, 0.08, 0.78));
  const full = easeOut(seg(p, 0.78, 0.96));
  useTickOn(p >= 0.8 ? 1 : 0, audio);
  useEffect(() => {
    if (audio) sfxSwell();
  }, [audio]);
  const fs = fit(winner.number, 26, 62);
  return (
    <div className="plate-wrap">
      <div className="beam" style={{ transform: `translateX(${-70 + sweep * 140}cqw) rotate(14deg)`, opacity: 1 - full * 0.8 }} />
      <div className="plate">
        <div className="engrave" style={{ fontSize: fs }}>{winner.number}</div>
        <div className="engrave lit" style={{ fontSize: fs, backgroundPosition: `${100 - sweep * 100}% 0` }}>{winner.number}</div>
        <div className="engrave full gold-text" style={{ fontSize: fs, opacity: full }}>{winner.number}</div>
      </div>
    </div>
  );
}
