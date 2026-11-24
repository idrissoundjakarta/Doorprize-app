"use client";

import { useEffect, useRef } from "react";
import type { ShowState } from "@/engine/types";
import { isLightPalette } from "@/lib/color";

/** Podium 3D + sorot lampu di belakang foto hadiah (adegan Showcase). */
export function Podium3D({ state, grand }: { state: ShowState; grand: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pal = state.settings.theme.palette;
  const light = isLightPalette(pal);
  const hemat = state.settings.theme.quality === "hemat";
  const { sceneAt } = state;
  useEffect(() => {
    let alive = true, raf = 0, dispose = () => {};
    const cv = ref.current!;
    void import("./three/podiumScene").then(({ createPodiumScene }) => {
      if (!alive) return;
      const mobile = window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 900;
      const low = hemat || mobile;
      const g = createPodiumScene(cv, { metal: pal.primary, glow: pal.primary2, light, hemat: low, sparkles: (grand ? 260 : 150) * (low ? 0.5 : 1) });
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
  }, [sceneAt, pal.primary, pal.primary2, light, hemat, grand]);
  return <canvas ref={ref} className="podium-canvas" />;
}
