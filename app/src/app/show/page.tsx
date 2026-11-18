"use client";

import { useEffect, useState } from "react";
import { ShowView } from "@/components/ShowView";
import type { ShowState } from "@/engine/types";
import { openChannel } from "@/lib/channel";
import { keyToCommand, toggleFullscreen } from "@/lib/keys";
import { loadShow } from "@/lib/storage";

/**
 * Jendela show (untuk LED/proyektor). Hanya menampilkan state dari jendela
 * operator dan meneruskan tombol keyboard/clicker ke sana.
 */
export default function ShowPage() {
  const [state, setState] = useState<ShowState | null>(null);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    // Tampilkan data tersimpan dulu, lalu ikuti jendela operator.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hanya ada di browser
    setState(loadShow());
    const ch = openChannel((m) => {
      if (m.t === "state") setState(m.state);
    });
    ch.send({ t: "hello" });
    const alive = setInterval(() => ch.send({ t: "alive" }), 1000);

    const onKey = (e: KeyboardEvent) => {
      const cmd = keyToCommand(e);
      if (!cmd) return;
      e.preventDefault();
      if (cmd === "fullscreen") toggleFullscreen();
      else if (cmd !== "panel") ch.send({ t: "cmd", cmd });
    };
    const onFs = () => setIsFull(!!document.fullscreenElement);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      clearInterval(alive);
      ch.close();
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  return (
    <main className="show-window" onDoubleClick={toggleFullscreen}>
      {state ? <ShowView state={state} /> : <div className="waiting">Menunggu jendela operator…</div>}
      {!isFull && <div className="fs-hint">Tekan F atau klik dua kali untuk fullscreen</div>}
    </main>
  );
}
