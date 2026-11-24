"use client";

import { useEffect, useRef } from "react";
import type { ShowState } from "@/engine/types";
import { hexToRgb, isLightPalette, mix, rgbToHex } from "@/lib/color";
import type { OrnamentOptions } from "./three/ornamentScene";

/** Pilihan ornamen per template: Gala elegan, Neon meriah, Navy paling sedikit. */
function ornamentsFor(state: ShowState, grand: boolean, low: boolean): OrnamentOptions {
  const { template, palette: p } = state.settings.theme;
  const light = isLightPalette(p);
  const pearl = rgbToHex(mix(hexToRgb(light ? p.bg1 : p.text), [255, 255, 255], 0.5));
  let balloons: string[], gifts: number, curls: number;
  if (template === "neon") {
    balloons = [p.primary, p.primary2, "#FFFFFF", `metal:${p.primary2}`, p.primary, `metal:${p.primary}`];
    gifts = 3;
    curls = 3;
  } else if (template === "navy") {
    balloons = [`metal:${p.primary}`, pearl];
    gifts = 2;
    curls = 0;
  } else {
    balloons = [`metal:${p.primary}`, pearl, `metal:${p.primary}`, pearl];
    gifts = 3;
    curls = 2;
  }
  if (grand) balloons = [...balloons, `metal:${p.primary}`, pearl];
  if (low) {
    balloons = balloons.slice(0, Math.ceil(balloons.length / 2));
    gifts = Math.ceil(gifts / 2);
    curls = Math.floor(curls / 2);
  }
  return { balloons, gift: light ? p.primary : pearl, ribbon: light ? "#F2F2F2" : p.primary, gifts, curls, hemat: low };
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
