"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { ShowState } from "@/engine/types";
import { ledOf, showRect } from "@/lib/led";
import { loadAsset } from "@/lib/storage";
import { Background } from "./Background";
import { ShowView, useIntensity } from "./ShowView";

/** URL gambar frame custom dari penyimpanan aset (dibaca sekali per id). */
export function useFrameUrl(frameId?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null, alive = true;
    if (!frameId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset saat frame dihapus
      setUrl(null);
      return;
    }
    void loadAsset(frameId).then((b) => {
      if (!alive || !b) return;
      u = URL.createObjectURL(b);
      setUrl(u);
    });
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [frameId]);
  return url;
}

/**
 * Kanvas LED penuh sesuai resolusi venue. Area show 16:9 selalu utuh di tengah;
 * ruang tersisa diisi frame (bawaan dari palet, atau gambar custom yang ukurannya cocok).
 * Dipakai di jendela LED, pratinjau operator, mode satu layar, dan setup — batasnya selalu sama.
 */
export function LedStage({ state, audio = false, guides = false }: { state: ShowState; audio?: boolean; guides?: boolean }) {
  const led = ledOf(state.settings);
  const r = showRect(led.width, led.height);
  const custom = !!led.frameId && led.frameW === led.width && led.frameH === led.height;
  const frameUrl = useFrameUrl(custom ? led.frameId : undefined);
  const intensity = useIntensity(state);
  const full = r.w === led.width && r.h === led.height;
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const area: CSSProperties = { left: pct(r.x, led.width), top: pct(r.y, led.height), width: pct(r.w, led.width), height: pct(r.h, led.height) };
  const pal = state.settings.theme.palette;

  return (
    <div className="led-outer">
      <div className="led-canvas" style={{ "--ar": `${led.width} / ${led.height}`, "--arn": led.width / led.height, "--fp": pal.primary, "--fb2": pal.bg2 } as CSSProperties}>
        {!full && (frameUrl ? (
          <img className="led-frame-img" src={frameUrl} alt="" />
        ) : (
          <>
            {/* Frame bawaan: background yang sama menerus di seluruh LED + garis halus di tepi area show */}
            <Background theme={state.settings.theme} intensity={intensity} />
            <div className="led-frame-default" />
          </>
        ))}
        <div className={`led-show ${!full && !frameUrl ? "on-default" : ""}`} style={area}>
          <ShowView state={state} audio={audio} bare={!full && !frameUrl} />
        </div>
        {guides && !full && (
          <div className="led-guide" style={area}>
            <span>Area show {r.w}×{r.h}</span>
          </div>
        )}
      </div>
    </div>
  );
}
