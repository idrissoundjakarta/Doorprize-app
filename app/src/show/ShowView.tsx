"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SCENE_MOOD, TEMPO_MS, eligible, getDraw, getParticipant, getPrize, sahCount } from "@/engine/engine";
import type { Prize, ShowState } from "@/engine/types";
import { fit } from "@/lib/fit";
import { isLightPalette } from "@/lib/color";
import { Background } from "./Background";
import { Confetti } from "./Confetti";
import { Ornaments3D } from "./Ornaments3D";
import { Podium3D } from "./Podium3D";
import { DrawStyleView, useProgress } from "./DrawStyles";
import { sfxFanfare, sfxRise, sfxSwell } from "./sound";

/**
 * Tampilan show (3 layer): background WebGL, konten, brand.
 * Dipakai di jendela show (audio aktif), pratinjau operator, dan mode satu layar.
 */
/** Intensitas background per adegan (0 = tenang, 1 = intens). Dipakai juga oleh frame LED. */
export function useIntensity(state: ShowState): number {
  const sc = state.scene;
  // Reveal: intens di awal, lalu turun supaya MC bisa bicara.
  const [calmReveal, setCalmReveal] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset per adegan
    setCalmReveal(false);
    if (sc.kind !== "reveal") return;
    const id = setTimeout(() => setCalmReveal(true), Math.max(0, 2500 - (Date.now() - state.sceneAt)));
    return () => clearTimeout(id);
  }, [sc.kind, state.sceneSeq, state.sceneAt]);
  return sc.kind === "draw" ? 1 : sc.kind === "reveal" ? (calmReveal ? 0.5 : 1) : sc.kind === "opener" ? 0.45 : SCENE_MOOD[sc.kind] === "intens" ? 1 : 0;
}

/**
 * bare = tanpa background sendiri (dipakai di dalam frame LED bawaan,
 * yang menggambar satu background menerus di seluruh layar LED).
 */
export function ShowView({ state, audio = false, bare = false }: { state: ShowState; audio?: boolean; bare?: boolean }) {
  const sc = state.scene;
  const th = state.settings.theme;
  const pal = th.palette;
  const grand = isGrand(state);
  const intensity = useIntensity(state);

  // Suara saat adegan baru dimulai (tidak diputar ulang setelah refresh).
  useEffect(() => {
    if (!audio || !state.settings.sound || Date.now() - state.sceneAt > 1200) return;
    if (sc.kind === "opener") sfxSwell();
    if (sc.kind === "draw") sfxRise(TEMPO_MS[state.settings.tempo] / 1000);
    if (sc.kind === "reveal") sfxFanfare(grand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sceneSeq]);

  const vars = {
    "--bg1": pal.bg1,
    "--bg2": pal.bg2,
    "--p": pal.primary,
    "--p2": pal.primary2,
    "--t": pal.text,
    "--m": pal.muted,
    "--ft": `${th.fontTitle}, serif`,
    "--fb": `${th.fontBody}, sans-serif`,
  } as CSSProperties;

  const confettiColors = useMemo(() => [pal.primary, pal.primary2, pal.text, pal.muted, ...(grand ? ["#ffffff"] : [])], [pal, grand]);

  return (
    <div className={`stage ${isLightPalette(pal) ? "light" : "dark"}`} style={vars}>
      {!bare && <Background theme={th} intensity={intensity} />}
      {sc.kind === "reveal" && !state.blank && <Ornaments3D key={`o${state.sceneSeq}`} state={state} grand={grand} />}
      {sc.kind === "reveal" && !state.blank && <Confetti key={state.sceneSeq} colors={confettiColors} seed={state.sceneSeq} big={grand} />}

      <Brand state={state} compact={sc.kind === "draw" || sc.kind === "reveal"} />
      {state.rehearsal && <div className="rehearsal-badge">GLADI</div>}

      <div className={`content ${state.blank ? "hidden" : ""}`}>
        <div className={`scene scene-${sc.kind}`} key={state.sceneSeq}>
          <SceneContent state={state} audio={audio && state.settings.sound} />
        </div>
      </div>
    </div>
  );
}

function isGrand(state: ShowState): boolean {
  const sc = state.scene;
  if (!("session" in sc)) return false;
  return /grand/i.test(state.sessions[sc.session]?.name ?? "");
}

function Brand({ state, compact }: { state: ShowState; compact: boolean }) {
  const { logo, companyName, eventTitle } = state.settings;
  const initials = companyName.replace(/^(PT|CV)\.?\s+/i, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`brand ${compact ? "compact" : ""}`}>
      {logo ? <img className="brand-logo" src={logo} alt="" /> : <div className="brand-mark">{initials || "★"}</div>}
      <div>
        <div className="brand-co">{companyName}</div>
        <div className="brand-ev">{eventTitle}</div>
      </div>
    </div>
  );
}

function PrizePhoto({ prize, className = "" }: { prize?: Prize; className?: string }) {
  return (
    <div className={`photo ${className}`}>
      {prize?.photo ? (
        <img src={prize.photo} alt="" />
      ) : (
        <svg viewBox="0 0 300 230" className="photo-ph">
          <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="70" y="100" width="160" height="110" rx="8" />
            <rect x="58" y="72" width="184" height="34" rx="8" />
            <path d="M150 72 V210" />
            <path d="M150 72 C130 40 95 40 100 60 C104 74 135 72 150 72 C165 72 196 74 200 60 C205 40 170 40 150 72" />
          </g>
        </svg>
      )}
      <div className="photo-shine" />
    </div>
  );
}

function useCountUp(target: number, start: number, ms = 1100): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, ms]);
  return v;
}

function SceneContent({ state, audio }: { state: ShowState; audio: boolean }) {
  const sc = state.scene;
  switch (sc.kind) {
    case "looping": {
      const session = state.sessions[sc.session];
      const featured = session.prizes[session.prizes.length - 1];
      const total = session.prizes.reduce((n, p) => n + p.qty, 0);
      return (
        <div className="stack">
          <div className="kicker a-up">Sesi berikutnya</div>
          <div className="title gold-text shimmer a-blur" style={{ fontSize: fit(session.name, 14, 80) }}>{session.name}</div>
          <PrizePhoto prize={featured} className="teaser a-up d2" />
          <div className="sub a-up d3">{total} hadiah menanti</div>
        </div>
      );
    }
    case "end":
      return (
        <div className="stack">
          <div className="kicker a-up">Sampai jumpa</div>
          <div className="title gold-text shimmer a-blur" style={{ fontSize: "16cqmin" }}>Terima kasih</div>
          <div className="sub a-up d2">Selamat kepada semua pemenang</div>
        </div>
      );
    case "opener": {
      const session = state.sessions[sc.session];
      return (
        <div className="stack opener">
          <div className="burst" />
          <div className="kicker a-up">Sesi {sc.session + 1}</div>
          <div className="title gold-text opener-title" style={{ fontSize: fit(session.name, 21, 85) }}>{session.name}</div>
        </div>
      );
    }
    case "showcase": {
      const session = state.sessions[sc.session];
      const prize = getPrize(state, sc.session, sc.prize)!;
      return (
        <>
          <Podium3D state={state} grand={/grand/i.test(session.name)} />
          <div className="corner a-fade">{session.name} · Hadiah {sc.prize + 1} dari {session.prizes.length}</div>
          <div className="showcase-title title a-up" style={{ fontSize: fit(prize.name, 8.5, 80) }}>{prize.name}</div>
          <div className="podium-photo float-wrap a-photo"><PrizePhoto prize={prize} className="float" /></div>
          <div className="showcase-pill pill a-up d3">{prize.qty} pemenang</div>
        </>
      );
    }
    case "ready":
      return <Ready state={state} />;
    case "draw": {
      const draw = getDraw(state, sc.drawId);
      const who = draw && getParticipant(state, draw.participantId);
      const prize = getPrize(state, sc.session, sc.prize)!;
      if (!who) return null;
      return <Draw state={state} who={who} prizeName={prize.name} style={prize.style ?? state.settings.style} audio={audio} />;
    }
    case "reveal": {
      const draw = getDraw(state, sc.drawId);
      const who = draw && getParticipant(state, draw.participantId);
      const prize = getPrize(state, sc.session, sc.prize)!;
      if (!who) return null;
      return (
        <div className="stack reveal">
          <div className="kicker a-up">Selamat</div>
          <div className="big-number gold-text hit glow" style={{ fontSize: fit(who.number, 28, 78) }}>{who.number}</div>
          {who.name && <div className="name a-up d2" style={{ fontSize: fit(who.name, 8, 80) }}>{who.name}</div>}
          {who.info && <div className="sub a-up d3">{who.info}</div>}
          <div className="pill a-up d4">{prize.name}</div>
        </div>
      );
    }
  }
}

function Ready({ state }: { state: ShowState }) {
  const sc = state.scene as Extract<ShowState["scene"], { kind: "ready" }>;
  const prize = getPrize(state, sc.session, sc.prize)!;
  const n = eligible(state).length;
  const v = useCountUp(n, state.sceneAt);
  return (
    <>
      <div className="corner a-fade">{prize.name} · Pemenang {sahCount(state, prize.id) + 1} dari {prize.qty}</div>
      <div className="stack ready">
        {n === 0 ? (
          <div className="title" style={{ fontSize: "9cqmin" }}>Peserta habis</div>
        ) : (
          <div className="ring-wrap a-fade">
            <svg className="ring" viewBox="0 0 640 640">
              <circle cx="320" cy="320" r="300" className="ring-base" />
              <circle cx="320" cy="320" r="300" className="ring-arc" />
              <circle cx="320" cy="320" r="268" className="ring-dots" />
            </svg>
            <div className="ring-inner">
              <div className="big-number gold-text" style={{ fontSize: fit(String(n), 22, 40) }}>{v}</div>
              <div className="sub">peserta siap diundi</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Draw({ state, who, prizeName, style, audio }: { state: ShowState; who: NonNullable<ReturnType<typeof getParticipant>>; prizeName: string; style: ShowState["settings"]["style"]; audio: boolean }) {
  const duration = TEMPO_MS[state.settings.tempo];
  const p = useProgress(state.sceneAt, duration);
  return (
    <div className={`stack draw draw-${style}`}>
      {style !== "amplop" && <div className="kicker draw-kicker">{prizeName}</div>}
      <DrawStyleView style={style} state={state} winner={who} p={p} audio={audio} duration={duration} />
    </div>
  );
}
