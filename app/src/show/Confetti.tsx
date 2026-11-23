"use client";

import { useEffect, useRef } from "react";

type P = { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string; wob: number; round: boolean };

/** Confetti dengan fisika sederhana (gravitasi, hambatan udara, berputar). Ditaruh di belakang teks. */
export function Confetti({ colors, seed, big = false }: { colors: string[]; seed: number; big?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const W = (cv.width = cv.clientWidth * Math.min(devicePixelRatio, 1.5));
    const H = (cv.height = cv.clientHeight * Math.min(devicePixelRatio, 1.5));
    const u = H / 1080;
    const ps: P[] = [];
    const add = (x: number, y: number, ang: number, spread: number, speed: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = ang + (Math.random() - 0.5) * spread, s = speed * (0.5 + Math.random() * 0.7);
        ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: (8 + Math.random() * 10) * u, h: (5 + Math.random() * 8) * u, c: colors[i % colors.length], wob: Math.random() * 6, round: Math.random() < 0.25 });
      }
    };
    const n = big ? 240 : 150;
    add(0, H * 0.85, -Math.PI / 3, 0.7, 30 * u, n / 2); // meriam kiri
    add(W, H * 0.85, (-Math.PI * 2) / 3, 0.7, 30 * u, n / 2); // meriam kanan
    let rain = big ? 260 : 120, raf = 0, prev = performance.now();
    const t0 = prev;
    // Fisika berbasis waktu (k = 1 pada 60 fps), jadi kecepatannya sama di laptop cepat maupun lambat.
    const loop = (now: number) => {
      const el = (now - t0) / 1000;
      const k = Math.min(4, (now - prev) / 16.67);
      prev = now;
      if (rain > 0 && el > 0.4) {
        for (let i = 0; i < Math.ceil(4 * k) && rain > 0; i++, rain--) add(Math.random() * W, -20, Math.PI / 2, 0.6, 3 * u, 1);
      }
      ctx.clearRect(0, 0, W, H);
      const drag = Math.pow(0.985, k);
      for (const p of ps) {
        p.vx *= drag;
        p.vy = p.vy * drag + 0.35 * u * k;
        if (p.vy > 6 * u) p.vy = 6 * u;
        p.wob += 0.08 * k;
        p.x += (p.vx + Math.sin(p.wob) * 0.8 * u) * k;
        p.y += p.vy * k;
        p.r += p.vr * k;
        if (p.y > H + 40) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.scale(1, Math.cos(p.wob));
        ctx.fillStyle = p.c;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.h / 2, 0, 7);
          ctx.fill();
        } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (el < 9) raf = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [colors, seed, big]);
  return <canvas ref={ref} className="confetti-canvas" />;
}
