"use client";

import { useEffect, useState } from "react";
import { SCENE_LABEL, SCENE_MODE, describeNext, firstOpenPrize, getParticipant, remaining } from "@/engine/engine";
import { download, winnersCsv } from "@/lib/export";
import { keyToCommand, toggleFullscreen } from "@/lib/keys";
import { useShowController } from "@/lib/useShowController";
import { Setup } from "./Setup";
import { ShowView } from "./ShowView";

/** Jendela operator (layar laptop). Mode satu layar tersedia sebagai cadangan. */
export function Operator() {
  const { state, setState, dispatch, command, hangusArmed, showConnected, saveFailed } = useShowController();
  const [tab, setTab] = useState<"show" | "setup">("show");
  const [solo, setSolo] = useState(false);
  const [panel, setPanel] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = keyToCommand(e);
      if (!cmd) return;
      if (tab === "setup" && !solo) return; // jangan ganggu pengisian setup
      e.preventDefault();
      if (cmd === "fullscreen") toggleFullscreen();
      else if (cmd === "panel") setPanel((p) => !p);
      else command(cmd);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [command, tab, solo]);

  if (!state) return <div className="waiting">Memuat…</div>;

  const sc = state.scene;

  const controls = (
    <div className="controls">
      <button onClick={() => command("back")} title="PageUp / ←">◀ BACK</button>
      <button className="primary next" disabled={SCENE_MODE[sc.kind] === "auto"} onClick={() => command("next")} title="PageDown / → / Spasi">NEXT ▶</button>
      <button className={`danger ${hangusArmed ? "armed" : ""}`} disabled={sc.kind !== "reveal"} onClick={() => command("hangus")} title="H dua kali">
        {hangusArmed ? "Yakin? Klik lagi" : "Hangus → undi ulang"}
      </button>
      <button className={state.blank ? "active" : ""} onClick={() => command("blank")} title="B">
        {state.blank ? "Tampilkan konten" : "Layar hitam"}
      </button>
    </div>
  );

  const status = (
    <div className="status">
      <div><b>{SCENE_LABEL[sc.kind]}</b> <span className="mode">{SCENE_MODE[sc.kind]}</span></div>
      <div className="next-hint">{describeNext(state)}</div>
      {hangusArmed && <div className="warn">Tekan H sekali lagi (3 detik) untuk menghanguskan pemenang ini.</div>}
      {saveFailed && <div className="warn">Gagal menyimpan otomatis!</div>}
    </div>
  );

  // ---------- Mode satu layar (cadangan) ----------
  if (solo) {
    return (
      <main className="show-window">
        <ShowView state={state} />
        {panel && (
          <div className="solo-panel">
            {status}
            {controls}
            <button onClick={() => { setSolo(false); setPanel(false); if (document.fullscreenElement) void document.exitFullscreen(); }}>Keluar mode satu layar</button>
          </div>
        )}
      </main>
    );
  }

  // ---------- Mode dua layar (utama) ----------
  const openShowWindow = async () => {
    const url = new URL("show/", window.location.href).toString();
    let features = "popup,width=1280,height=720";
    try {
      // Chrome/Edge: taruh jendela show langsung di layar kedua (butuh izin "kelola jendela").
      const w = window as Window & { getScreenDetails?: () => Promise<{ screens: ScreenDetailed[]; currentScreen: ScreenDetailed }> };
      if (w.getScreenDetails) {
        const sd = await w.getScreenDetails();
        const other = sd.screens.find((s) => s !== sd.currentScreen);
        if (other) features = `popup,fullscreen,left=${other.availLeft},top=${other.availTop},width=${other.availWidth},height=${other.availHeight}`;
      }
    } catch {
      /* izin ditolak: buka biasa, operator seret ke LED lalu tekan F */
    }
    window.open(url, "doorprize-show", features);
  };

  const exportCsv = () => download(`pemenang-${new Date().toISOString().slice(0, 10)}.csv`, winnersCsv(state));
  const restart = () => confirm("Mulai ulang show dari awal? Semua hasil undian akan dihapus.") && dispatch({ type: "RESTART", now: Date.now() });

  return (
    <div className="operator">
      <header className="topbar">
        <strong>Doorprize · Operator</strong>
        <nav>
          <button className={tab === "show" ? "active" : ""} onClick={() => setTab("show")}>Show</button>
          <button className={tab === "setup" ? "active" : ""} onClick={() => setTab("setup")}>Setup</button>
        </nav>
        <span className={`conn ${showConnected ? "ok" : ""}`}>{showConnected ? "● Layar show terhubung" : "○ Layar show belum dibuka"}</span>
        <button onClick={openShowWindow}>Buka jendela show</button>
        <button onClick={() => { setSolo(true); setPanel(false); toggleFullscreen(); }}>Mode satu layar</button>
      </header>

      {tab === "setup" ? (
        <Setup state={state} setState={setState} />
      ) : (
        <div className="show-tab">
          <div className="left">
            <div className="preview"><ShowView state={state} /></div>
            {status}
            {controls}
            <p className="hint">Tombol: NEXT = PageDown/→/Spasi · BACK = PageUp/← · B = layar hitam · H×2 = hangus · F = fullscreen (di jendela show)</p>
          </div>
          <div className="right">
            <h3>Sesi</h3>
            <ul className="sessions">
              {state.sessions.map((s, i) => {
                const left = s.prizes.reduce((n, p) => n + remaining(state, p), 0);
                const total = s.prizes.reduce((n, p) => n + p.qty, 0);
                const done = firstOpenPrize(state, i) === null;
                return (
                  <li key={s.id} className={"session" in sc && sc.session === i ? "current" : ""}>
                    <span>{s.name}</span>
                    <span className="muted">{total - left}/{total}</span>
                    <button disabled={done || sc.kind === "draw" || sc.kind === "reveal"} onClick={() => dispatch({ type: "JUMP_SESSION", session: i, now: Date.now() })}>Lompat</button>
                  </li>
                );
              })}
            </ul>
            <h3>Pemenang <span className="count">{state.draws.filter((d) => d.status === "sah").length}</span></h3>
            <table className="winners">
              <tbody>
                {[...state.draws].reverse().map((d) => {
                  const who = getParticipant(state, d.participantId);
                  const prize = state.sessions.flatMap((s) => s.prizes).find((p) => p.id === d.prizeId);
                  return (
                    <tr key={d.id} className={d.status}>
                      <td>{who?.number}</td>
                      <td>{who?.name}</td>
                      <td>{prize?.name}</td>
                      <td>{d.status === "pending" ? "tampil" : d.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="row">
              <button onClick={exportCsv} disabled={state.draws.length === 0}>Export CSV</button>
              <button className="danger" onClick={restart}>Mulai ulang show</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ScreenDetailed = Screen & { availLeft: number; availTop: number };
