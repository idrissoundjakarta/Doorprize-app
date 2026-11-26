"use client";

import { useEffect, useRef } from "react";
import type { ShowState } from "@/engine/types";
import { hexToRgb, isLightPalette, mix, rgbToHex } from "@/lib/color";
import type { OrnamentOptions } from "./three/ornamentScene";

/** Pilihan ornamen per template: Gala elegan, Neon paling meriah, Navy paling kalem. */
function ornamentsFor(state: ShowState, grand: boolean, low: boolean): OrnamentOptions {
  const { template, palette: p } = state.settings.theme;
  const light = isLightPalette(p);
  const pearl = rgbToHex(mix(hexToRgb(light ? p.bg1 : p.text), [255, 255, 255], 0.55));
  const champagne = rgbToHex(mix(hexToRgb(p.primary), [255, 255, 255], 0.35));
  let balloons: string[], stars: number, gifts: number, curls: number, confettiCount: number;
  if (template === "neon") {
    balloons = [p.primary, `metal:${p.primary2}`, "#FFFFFF", p.primary2, `metal:${p.primary}`];
    stars = 1;
    gifts = 4;
    curls = 6;
    confettiCount = 420;
  } else if (template === "navy") {
    balloons = [`metal:${p.primary}`, pearl, `metal:${champagne}`];
    stars = 0;
    gifts = 2;
    curls = 2;
    confettiCount = 220;
  } else {
    balloons = [`metal:${p.primary}`, pearl, `metal:${champagne}`, pearl];
    stars = 1;
    gifts = 4;
    curls = 4;
    confettiCount = 340;
  }
  if (grand) {
    balloons = [...balloons, `metal:${p.primary}`];
    stars += 1;
    curls += 2;
    confettiCount = Math.round(confettiCount * 1.5);
  }
  if (low) {
    balloons = balloons.slice(0, Math.max(2, Math.ceil(balloons.length * 0.6)));
    stars = Math.min(stars, 1);
    gifts = Math.ceil(gifts / 2);
    curls = Math.floor(curls / 2);
    confettiCount = Math.round(confettiCount * 0.35);
  }
  const confetti = [p.primary, p.primary2, champagne, "#FFFFFF", pearl];
  return { balloons, stars, starColor: p.primary, gift: light ? p.primary : pearl, ribbon: light ? "#F2F2F2" : p.primary, gifts, curls, confetti, confettiCount, hemat: low };
}

/** Ornamen 3D di layar pemenang (di belakang teks). */
export function Ornaments3D({ state, grand }: { state: ShowState; grand: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { sceneAt } = state;
  const key = JSON.stringify([state.settings.theme.template, state.settings.theme.palette, state.settings.theme.quality, grand]);
  useEffect(() => {
    let alive = true, raf = 0, dispose = () => {};
    const cv = ref.current!;
    void import("./three/ornamentScene").then(({ createOrnamentScene }) => {
      if (!alive) return;
      const mobile = window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 900;
      const g = createOrnamentScene(cv, ornamentsFor(state, grand, state.settings.theme.quality === "hemat" || mobile));
      dispose = g.dispose;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const cw = cv.clientWidth, ch = cv.clientHeight;
        const [w, h] = g.size();
        if (cw !== w || ch !== h) g.resize(cw, ch);
        g.update(Math.max(0, (Date.now() - sceneAt) / 1000));
      };
      loop();
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dibuat ulang hanya saat tampilan/adegan berubah
  }, [sceneAt, key]);
  return <canvas ref={ref} className="ornament-canvas" />;
}
