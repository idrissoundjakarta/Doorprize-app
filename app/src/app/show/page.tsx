"use client";

import { useEffect, useState } from "react";
import type { ShowState } from "@/engine/types";
import { openChannel } from "@/lib/channel";
import { keyToCommand, toggleFullscreen } from "@/lib/keys";
import { loadShow } from "@/lib/storage";
import { useOffline } from "@/lib/pwa";
import { ShowView } from "@/show/ShowView";
import { unlockAudio } from "@/show/sound";

/**
 * Jendela show (untuk LED/proyektor). Hanya menampilkan state dari jendela
 * operator dan meneruskan tombol keyboard/clicker ke sana. Suara diputar di sini.
 */
export default function ShowPage() {
  const [state, setState] = useState<ShowState | null>(null);
  const [isFull, setIsFull] = useState(false);
  useOffline(); // jendela LED juga memakai salinan offline

  useEffect(() => {
    // Tampilkan data tersimpan dulu, lalu ikuti jendela operator.
    void loadShow().then((s) => setState((cur) => cur ?? s));
    const ch = openChannel((m) => {
      if (m.t === "state") setState(m.state);
    });
    ch.send({ t: "hello" });
    const alive = setInterval(() => ch.send({ t: "alive" }), 1000);

    const onKey = (e: KeyboardEvent) => {
      unlockAudio();
      const cmd = keyToCommand(e);
      if (!cmd) return;
      e.preventDefault();
      if (cmd === "fullscreen") toggleFullscreen();
      else if (cmd !== "panel") ch.send({ t: "cmd", cmd });
    };
    const onFs = () => setIsFull(!!document.fullscreenElement);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", unlockAudio);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      clearInterval(alive);
      ch.close();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  return (
    <main className="show-window" onDoubleClick={toggleFullscreen}>
      {state ? <ShowView state={state} audio /> : <div className="waiting">Menunggu jendela operator…</div>}
      {!isFull && <div className="fs-hint">Klik sekali untuk mengaktifkan suara · tekan F atau klik dua kali untuk fullscreen</div>}
    </main>
  );
}
