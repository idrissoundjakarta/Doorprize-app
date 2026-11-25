"use client";

import { useEffect, useState } from "react";
import { SCENE_LABEL, SCENE_MODE, describeNext, eligible, getDraw, getParticipant, getPrize, lockablePositions } from "@/engine/engine";
import type { ShowState } from "@/engine/types";
import { download, winnersCsv } from "@/lib/export";
import { keyToCommand, toggleFullscreen } from "@/lib/keys";
import { useShowController } from "@/lib/useShowController";
import { ledOf, sameAspect } from "@/lib/led";
import { LedStage } from "@/show/LedStage";
import { unlockAudio } from "@/show/sound";
import { Setup } from "./Setup";
import { preflight, preflightOk } from "@/engine/preflight";
import { CueList } from "./CueList";
import { PreflightList } from "./Preflight";
import { SoloShow } from "./SoloShow";
import { Welcome } from "./Welcome";
import { Dialog, Logo, useToast } from "./ui";
import { useOffline, type OfflineStatus } from "@/lib/pwa";

/** Teks tombol NEXT sesuai adegan, supaya operator tahu persis apa yang terjadi kalau ditekan. */
function nextButton(state: ShowState): { label: string; sub: string; enabled: boolean } {
  const sc = state.scene;
  if (state.draws.length === 0 && (sc.kind === "looping" || sc.kind === "end") && !preflightOk(preflight(state))) return { label: "Lengkapi data dulu", sub: "Lihat cek sebelum show", enabled: false };
  switch (sc.kind) {
    case "looping":
      return { label: "Mulai sesi", sub: `Opener ${state.sessions[sc.session]?.name ?? ""}`, enabled: true };
    case "opener":
      return { label: "Opener berjalan…", sub: "Otomatis lanjut ke showcase", enabled: false };
    case "showcase":
      return { label: "Siap undi", sub: "Tampilkan jumlah peserta", enabled: true };
    case "ready":
      return eligible(state).length === 0 ? { label: "Peserta habis", sub: "Tidak ada peserta yang bisa diundi", enabled: false } : { label: "Undi sekarang", sub: `${eligible(state).length} peserta`, enabled: true };
    case "draw": {
      if (sc.manual) {
        const total = lockablePositions(getParticipant(state, getDraw(state, sc.drawId)?.participantId ?? "")?.number ?? "");
        const n = sc.revealed ?? 0;
        if (n >= total) return { label: "Semua digit terbuka", sub: "Sebentar lagi layar pemenang", enabled: false };
        return { label: `Stop digit ${n + 1}`, sub: `${n} dari ${total} terbuka · tekan saat MC bilang "stop"`, enabled: true };
      }
      return { label: "Mengundi…", sub: "Otomatis ke layar pemenang", enabled: false };
    }
    case "reveal":
      return { label: "Sah · Lanjut", sub: describeNext(state).replace(/^NEXT \(sah\) → /, "Berikutnya: ").replace(/ · H×2 → Hangus$/, ""), enabled: true };
    case "end":
      return { label: "Show selesai", sub: "Export daftar pemenang", enabled: false };
  }
}

export function Operator() {
  const { state, setState, dispatch, command, hangusNow, hangusArmed, showConnected, saveFailed, welcome, start, blockedAt, showSize } = useShowController();
  const [tab, setTab] = useState<"show" | "setup">("show");
  const [solo, setSolo] = useState(false);
  const [panel, setPanel] = useState(false);
  const [dialog, setDialog] = useState<null | "hangus" | "restart" | "endGladi">(null);
  const [toast, showToast] = useToast();
  const offline = useOffline();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      unlockAudio();
      const cmd = keyToCommand(e);
      if (!cmd || dialog) return;
      if (tab === "setup" && !solo) return; // jangan ganggu pengisian setup
      e.preventDefault();
      if (cmd === "fullscreen") toggleFullscreen();
      else if (cmd === "panel") setPanel((p) => !p);
      else command(cmd);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [command, tab, solo, dialog]);

  useEffect(() => {
    if (blockedAt) showToast("Data belum lengkap. Cek daftar di atas tombol, lalu perbaiki di Setup", "warn");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockedAt]);

  if (welcome) return <Welcome onStart={(k) => { start(k); setTab(k === "baru" ? "setup" : "show"); }} />;
  if (!state) return <div className="waiting">Memuat…</div>;
  const checks = preflight(state);
  const notStarted = state.draws.length === 0 && (state.scene.kind === "looping" || state.scene.kind === "end");

  const sc = state.scene;
  const nb = nextButton(state);
  const manualDraw = sc.kind === "draw" && !!sc.manual;
  const led = ledOf(state.settings);
  const ratioMismatch = showConnected && showSize && !sameAspect(showSize.w, showSize.h, led.width, led.height);
  const revealDraw = sc.kind === "reveal" ? getDraw(state, sc.drawId) : undefined;
  const revealWho = revealDraw && getParticipant(state, revealDraw.participantId);
  const revealPrize = sc.kind === "reveal" ? getPrize(state, sc.session, sc.prize) : undefined;

  const gladiButton = state.rehearsal ? (
    <button className="btn b-sm b-pri" onClick={() => setDialog("endGladi")}>Selesai gladi</button>
  ) : state.draws.length === 0 ? (
    <button className="btn b-sm b-sec" onClick={() => { dispatch({ type: "START_REHEARSAL", now: Date.now() }); showToast("Mode gladi dimulai. Hasilnya tidak disimpan"); }}>Mulai gladi</button>
  ) : null;

  const controls = (
    <div className="op-controls">
      <button className="btn b-sec" onClick={() => command("back")} disabled={!(sc.kind === "ready" || sc.kind === "showcase")}>◀ Kembali <span className="kbd">PgUp</span></button>
      <button className="btn b-pri btn-next" disabled={!nb.enabled} onClick={() => command("next")}>
        <span>
          {nb.label}
          <small>{nb.sub}</small>
        </span>
        <span className="go-ico">{SCENE_MODE[sc.kind] === "auto" && !manualDraw ? "…" : "→"}</span>
      </button>
      <button className="btn b-dng" disabled={sc.kind !== "reveal"} onClick={() => setDialog("hangus")}>Hangus <span className="kbd">H×2</span></button>
    </div>
  );

  const status = (
    <div className="row wrap">
      <div className="grow op-status-title">
        <div className="lbl">Sedang tampil di LED</div>
        <div className="h2" style={{ marginTop: 3 }}>
          {SCENE_LABEL[sc.kind]}
          {"session" in sc && state.sessions[sc.session] ? ` · ${state.sessions[sc.session].name}` : ""}
        </div>
      </div>
      <span className="chip c-ink"><span className="dot" style={{ background: "#ff6b5b" }} />LIVE</span>
      <span className="chip c-neu">{manualDraw ? "MANUAL · menunggu aba-aba MC" : SCENE_MODE[sc.kind] === "auto" ? "AUTO · berjalan sendiri" : "HOLD · menunggu MC"}</span>
      {state.blank && <span className="chip c-warn">! Layar hitam aktif</span>}
    </div>
  );

  const dialogs = (
    <>
      {dialog === "hangus" && (
        <Dialog title="Hanguskan pemenang ini?" confirm="Ya, hanguskan" onCancel={() => setDialog(null)} onConfirm={() => { hangusNow(); setDialog(null); showToast("Pemenang dihanguskan, siap undi ulang"); }}>
          <b style={{ color: "var(--ink)" }}>{revealWho?.number}{revealWho?.name ? ` · ${revealWho.name}` : ""}</b> tidak hadir. Tetap tercatat sebagai hangus dan tidak ikut diundi lagi. Hadiah <b style={{ color: "var(--ink)" }}>{revealPrize?.name}</b> akan diundi ulang.
        </Dialog>
      )}
      {dialog === "restart" && (
        <Dialog title="Mulai ulang show?" confirm="Ya, mulai ulang" onCancel={() => setDialog(null)} onConfirm={() => { dispatch({ type: "RESTART", now: Date.now() }); setDialog(null); showToast("Show dimulai dari awal"); }}>
          Semua hasil undian (termasuk yang hangus) akan dihapus. Biasanya dipakai setelah gladi. Export dulu kalau masih dibutuhkan.
        </Dialog>
      )}
      {dialog === "endGladi" && (
        <Dialog tone="go" icon="✓" title="Selesaikan gladi?" confirm="Ya, show siap" onCancel={() => setDialog(null)} onConfirm={() => { dispatch({ type: "END_REHEARSAL", now: Date.now() }); setDialog(null); showToast("Gladi selesai. Hasil latihan dihapus, show siap untuk acara"); }}>
          Semua hasil undian gladi ({state.draws.length}) dihapus dan show kembali ke awal. Pengaturan, peserta, dan hadiah tetap.
        </Dialog>
      )}
      {toast}
    </>
  );

  // ---------- Mode satu layar / Mode HP ----------
  const exitSolo = () => {
    setSolo(false);
    setPanel(false);
    if (document.fullscreenElement) void document.exitFullscreen();
  };
  if (solo) {
    return (
      <SoloShow
        state={state}
        onNext={() => command("next")}
        setPanel={setPanel}
        panel={
          panel ? (
            <>
              {status}
              {hangusArmed && <span className="chip c-dng">✕ Tekan H sekali lagi untuk hangus</span>}
              {controls}
              <div className="row wrap">
                <button className={`btn b-sm ${state.blank ? "b-pri" : "b-sec"}`} onClick={() => command("blank")}>{state.blank ? "Tampilkan lagi" : "Layar hitam"} <span className="kbd hide-m">B</span></button>
                {gladiButton}
                <button className="btn b-sm b-ghost" onClick={() => setPanel(false)}>Tutup menu</button>
                <button className="btn b-sm b-ghost right" onClick={exitSolo}>Keluar dari show</button>
              </div>
            </>
          ) : null
        }
      >
        {dialogs}
      </SoloShow>
    );
  }

  const startSolo = () => {
    setSolo(true);
    setPanel(false);
    unlockAudio();
    toggleFullscreen();
    // Di HP: kunci layar mendatar (Android Chrome, hanya saat fullscreen).
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    setTimeout(() => void o.lock?.("landscape").catch(() => {}), 300);
  };

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

  const exportCsv = () => {
    download(`pemenang-${new Date().toISOString().slice(0, 10)}.csv`, winnersCsv(state));
    showToast("Daftar pemenang diexport");
  };
  const allPrizes = state.sessions.flatMap((s) => s.prizes);

  return (
    <div className="op">
      <header className="topbar">
        <Logo />
        <div className="seg">
          <button className={tab === "setup" ? "on" : ""} onClick={() => setTab("setup")}>Setup</button>
          <button className={tab === "show" ? "on" : ""} onClick={() => setTab("show")}>Show</button>
        </div>
        {state.sample && <span className="chip c-warn">! Data contoh</span>}
        {state.rehearsal && <span className="chip c-info"><span className="dot" style={{ background: "var(--info-t)" }} />Mode gladi</span>}
        <div className="grow" />
        <OfflineChip {...offline} />
        <span className="hide-m">{showConnected ? <span className="chip c-go"><span className="dot" style={{ background: "var(--go-t)" }} />LED terhubung</span> : <span className="chip c-neu">○ LED belum dibuka</span>}</span>
        {saveFailed ? <span className="chip c-dng">✕ Gagal menyimpan</span> : <span className="small muted hide-m" title="Semua perubahan tersimpan otomatis di perangkat ini">✓ Tersimpan</span>}
        {tab === "show" && (
          <>
            {gladiButton}
            <button className={`btn b-sm hide-m ${state.blank ? "b-pri" : "b-sec"}`} onClick={() => command("blank")}>Layar hitam <span className="kbd">B</span></button>
            <button className="btn b-sm b-sec hide-m" onClick={openShowWindow}>Buka layar LED</button>
            <button className="btn b-sm b-ghost hide-m" onClick={startSolo} title="Show di layar ini (laptop tanpa layar kedua, atau HP)">Satu layar</button>
          </>
        )}
      </header>

      {tab === "setup" ? (
        <Setup state={state} setState={setState} onDone={() => setTab("show")} toast={showToast} />
      ) : (
        <div className="op-main">
          <div className="col">
            <button className="btn b-pri only-m btn-next" onClick={startSolo}>
              <span>Tampilkan show di HP ini<small>Layar penuh · tap = lanjut · tahan = menu</small></span>
              <span className="go-ico">▶</span>
            </button>
            <div className="card col" style={{ padding: 18 }}>
              {status}
              <div className="preview" style={{ position: "relative", aspectRatio: `${led.width} / ${led.height}` }}>
                <LedStage state={state} />
                {notStarted && !preflightOk(checks) && (
                  <div className="preview-empty">
                    <b>Data acara belum lengkap</b>
                    <span>Isi peserta dan hadiah di Setup untuk melihat show di sini.</span>
                    <button className="btn b-sm b-sec" onClick={() => setTab("setup")}>Buka Setup</button>
                  </div>
                )}
              </div>
            </div>
            {hangusArmed && <span className="chip c-dng" style={{ alignSelf: "start" }}>✕ Tekan H sekali lagi (3 detik) untuk menghanguskan</span>}
            {ratioMismatch && showSize && (
              <div className="card row wrap" style={{ padding: 16, background: "var(--warn-bg)", color: "var(--warn-t)" }}>
                <b style={{ fontSize: 18 }}>!</b>
                <div className="grow" style={{ minWidth: 220 }}>
                  <b>Rasio layar LED berbeda dari setup</b>
                  <div className="small" style={{ opacity: 0.9 }}>Jendela LED sekarang {showSize.w}×{showSize.h} px, setup {led.width}×{led.height} px. Show tetap utuh, tapi ada bingkai hitam. Pastikan jendela LED fullscreen di layar LED, atau sesuaikan resolusi di Setup → Layar LED.</div>
                </div>
                <button className="btn b-sm b-sec" onClick={() => setTab("setup")}>Buka Setup</button>
              </div>
            )}
            {state.rehearsal && (
              <div className="card row wrap" style={{ padding: 16, background: "var(--info-bg)", color: "var(--info-t)" }}>
                <span className="dot" style={{ background: "var(--info-t)", width: 12, height: 12 }} />
                <div className="grow" style={{ minWidth: 200 }}><b>Mode gladi</b><div className="small" style={{ opacity: .85 }}>Undian di sini hanya latihan. Tanda GLADI tampil kecil di layar LED. Hasilnya dihapus saat gladi selesai.</div></div>
                <button className="btn b-sm b-pri" onClick={() => setDialog("endGladi")}>Selesai gladi</button>
              </div>
            )}
            {notStarted && checks.some((c) => c.level !== "info") && (
              <div className="card col" style={{ padding: 16, gap: 8 }}>
                <div className="row"><div className="lbl">Cek sebelum show</div>{!preflightOk(checks) && <span className="chip c-dng right">✕ Belum bisa dimulai</span>}</div>
                <PreflightList checks={checks} compact onGo={() => setTab("setup")} />
              </div>
            )}
            {controls}
            <div className="small muted hide-m">Clicker: <b>PageDown/→/Spasi</b> = lanjut · <b>PageUp/←</b> = kembali · <b>B</b> = layar hitam · <b>H×2</b> = hangus · <b>F</b> = fullscreen di jendela show</div>
          </div>

          <div className="col">
            <div className="card col">
              <div className="row"><div className="lbl">Urutan show</div><span className="small muted right">{state.sessions.filter((x) => x.prizes.length).length} sesi</span></div>
              <CueList state={state} onJump={(i) => dispatch({ type: "JUMP_SESSION", session: i, now: Date.now() })} />
            </div>

            <div className="card col">
              <div className="row">
                <div className="lbl">{state.rehearsal ? "Pemenang gladi" : "Pemenang"}</div>
                <span className="chip c-champ">★ {state.draws.filter((d) => d.status === "sah").length}</span>
                <button className="btn b-sm b-sec right" onClick={exportCsv} disabled={state.draws.length === 0 || !!state.rehearsal} title={state.rehearsal ? "Hasil gladi tidak diexport" : undefined}>Export Excel</button>
              </div>
              <div className="winners">
                {state.draws.length === 0 ? (
                  <div className="muted small" style={{ padding: "18px 0", textAlign: "center" }}>Belum ada pemenang. Tekan <b>Mulai sesi</b> untuk memulai.</div>
                ) : (
                  <table className="t">
                    <tbody>
                      {[...state.draws].reverse().map((d) => {
                        // Selama undian berjalan, identitas pemenang belum ditampilkan (termasuk ke operator).
                        if (d.status === "pending" && sc.kind === "draw")
                          return (
                            <tr key={d.id}><td colSpan={3}><span className="chip c-ink">● Sedang diundi…</span></td></tr>
                          );
                        const who = getParticipant(state, d.participantId);
                        const prize = allPrizes.find((p) => p.id === d.prizeId);
                        return (
                          <tr key={d.id} className={d.status}>
                            <td style={{ width: 76 }}>{d.status === "pending" ? <span className="chip c-champ">★ {who?.number}</span> : <b className="strike">{who?.number}</b>}</td>
                            <td><b className="strike">{who?.name ?? "—"}</b><div className="small muted">{prize?.name}</div></td>
                            <td style={{ textAlign: "right" }}>
                              {d.status === "pending" ? <span className="chip c-ink">Tampil</span> : d.status === "sah" ? <span className="chip c-go">✓ Sah</span> : <span className="chip c-dng">✕ Hangus</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {!state.rehearsal && <button className="btn b-sm b-ghost" onClick={() => setDialog("restart")}>Mulai ulang show</button>}
            </div>
          </div>
        </div>
      )}
      {dialogs}
    </div>
  );
}

type ScreenDetailed = Screen & { availLeft: number; availTop: number };

/** Status offline: operator tahu aplikasi sudah tersimpan dan aman dipakai tanpa internet di venue. */
function OfflineChip({ status, update }: { status: OfflineStatus; update: boolean }) {
  if (status === "dev") return null;
  if (update) return <span className="chip c-info" title="Muat ulang aplikasi saat tidak sedang show">i Versi baru siap · muat ulang nanti</span>;
  if (status === "ready") return <span className="chip c-go" title="Semua file aplikasi tersimpan di perangkat ini. Bisa dibuka & dijalankan tanpa internet.">✓ Siap offline</span>;
  if (status === "installing") return <span className="chip c-neu">◌ Menyiapkan offline…</span>;
  return <span className="chip c-warn" title="Browser ini tidak mendukung mode offline. Pakai Chrome/Edge terbaru dan pastikan internet tersedia di venue.">! Belum bisa offline</span>;
}
