"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DrawStyle, Participant, ShowState } from "@/engine/types";
import { fit } from "@/lib/fit";
import { hexToRgb, isLightPalette, mix, rgbToHex } from "@/lib/color";
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
    case "kado":
      return <Kado {...props} />;
    default:
      return <Digits {...props} />;
  }
}

// ---------- 1. Buka digit ----------
function Digits(props: DrawProps) {
  const sc = props.state.scene;
  return sc.kind === "draw" && sc.manual ? <ManualDigits {...props} revealed={sc.revealed ?? 0} /> : <AutoDigits {...props} />;
}

/** Detik berjalan terus (untuk putaran digit yang menunggu aba-aba tanpa batas waktu). */
function useClock(start: number): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setT((Date.now() - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start]);
  return t;
}

/**
 * Buka digit Manual: digit yang sudah dibuka tetap terlihat, digit berikutnya berputar
 * menunggu aba-aba MC, sisanya tertutup (•) supaya tidak bocor sebelum waktunya.
 */
function ManualDigits({ winner, audio, state, revealed }: DrawProps & { revealed: number }) {
  const t = useClock(state.sceneAt);
  useTickOn(revealed, audio, [...winner.number].filter((c) => c !== " ").length);
  let k = -1;
  return (
    <div className="digits" style={{ fontSize: fit(winner.number, 22, 70) }}>
      {[...winner.number].map((c, i) => {
        if (c === " ") return <div key={i} className="dgap" />;
        k++;
        const open = k < revealed;
        const spinning = k === revealed;
        const pos = t * 14 + i * 3.7;
        const pool = /\d/.test(c) ? 10 : 26;
        const sym = (n: number) => (pool === 10 ? String(hash(n, i) % 10) : String.fromCharCode(65 + (hash(n, i) % 26)));
        return (
          <div key={i} className={`dbox ${open ? "locked" : spinning ? "suspense" : "closed"}`}>
            {open ? (
              <span className="gold-text">{c}</span>
            ) : spinning ? (
              <div className="dstrip" style={{ transform: `translateY(${-(pos % 1) * 100}%)`, filter: "blur(0.02em)" }}>
                <span>{sym(Math.floor(pos))}</span>
                <span>{sym(Math.floor(pos) + 1)}</span>
              </div>
            ) : (
              <span className="dot-ph">•</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AutoDigits({ winner, p, audio, duration }: DrawProps) {
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
        <div className="env-card" style={{ transform: `translateY(${-card * 62}%)`, opacity: flap > 0.55 ? 1 : 0 }}>
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
      const rad = H * (0.18 + (hash(i, 2) / 4294967296) * 0.55);
      return { tx, ty, sx: W / 2 + Math.cos(ang) * rad * 1.7, sy: H / 2 + Math.sin(ang) * rad * 0.9, d: 0.05 + (hash(i, 3) / 4294967296) * 0.3, s: 0.8 + (hash(i, 4) / 4294967296) * 1.8, c: cols[i % 3], tw: hash(i, 5) % 100 };
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
        const t = easeInOut(clamp((p - q.d) / (0.72 - q.d)));
        const sw = (1 - t) * 2.6 + (1 - t) * p * 3;
        const cx = W / 2, cy = H / 2;
        const rx = q.sx - cx, ry = q.sy - cy;
        const sx = cx + rx * Math.cos(sw) - ry * Math.sin(sw), sy = cy + rx * Math.sin(sw) + ry * Math.cos(sw);
        const x = sx + (q.tx - sx) * t, y = sy + (q.ty - sy) * t;
        const glow = clamp((p - 0.72) / 0.2);
        ctx.globalAlpha = (0.35 + 0.65 * t) * (0.75 + 0.25 * Math.sin(now / 160 + q.tw));
        ctx.fillStyle = q.c;
        ctx.beginPath();
        ctx.arc(x, y, q.s * u * (1.5 - 0.4 * t + glow * 0.6), 0, 7);
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
  const sweep = easeInOut(seg(p, 0.06, 0.8));
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
        <div className="engrave full gold-text" style={{ fontSize: fs, opacity: sweep * 0.35 * (1 - full) }}>{winner.number}</div>
        <div className="engrave lit" style={{ fontSize: fs, backgroundPosition: `${100 - sweep * 100}% 0` }}>{winner.number}</div>
        <div className="engrave full gold-text" style={{ fontSize: fs, opacity: full }}>{winner.number}</div>
      </div>
    </div>
  );
}

// ---------- 6. Kado kejutan (3D) ----------
function Kado({ state, winner, p, audio, duration }: DrawProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pal = state.settings.theme.palette;
  const light = isLightPalette(pal);
  const hemat = state.settings.theme.quality === "hemat";
  const { sceneAt } = state;
  useEffect(() => {
    if (audio) sfxSwell();
  }, [audio]);
  useTickOn(p >= 0.7 ? 1 : 0, audio, 1);
  useEffect(() => {
    let alive = true, raf = 0, dispose = () => {};
    const cv = ref.current!;
    void import("./three/giftScene").then(({ createGiftScene }) => {
      if (!alive) return;
      const mobile = window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 900;
      // KV gelap: kotak putih mutiara + pita aksen (emas). KV terang: kotak warna aksen + pita putih.
      const box = light ? pal.primary : rgbToHex(mix(hexToRgb(pal.text), [255, 255, 255], 0.5));
      const g = createGiftScene(cv, { box, ribbon: light ? "#F2F2F2" : pal.primary, glow: pal.primary2, hemat: hemat || mobile });
      dispose = g.dispose;
      const t0 = performance.now();
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const cw = cv.clientWidth, ch = cv.clientHeight;
        const [w, h] = g.size();
        if (cw !== w || ch !== h) g.resize(cw, ch);
        g.update(Math.min(1, (Date.now() - sceneAt) / duration), (performance.now() - t0) / 1000);
      };
      loop();
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      dispose();
    };
  }, [sceneAt, duration, pal.text, pal.primary, pal.primary2, light, hemat]);
  const rise = easeOut(seg(p, 0.76, 0.97));
  return (
    <>
      <canvas ref={ref} className="gift-canvas" />
      <div className="kado-num gold-text" style={{ fontSize: fit(winner.number, 26, 70), opacity: Math.min(1, rise * 2.5), transform: `translateY(${(1 - rise) * 30}cqh) scale(${0.3 + rise * 0.7})` }}>
        {winner.number}
      </div>
    </>
  );
}
