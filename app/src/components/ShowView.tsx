"use client";

import { SCENE_MOOD, eligible, getDraw, getParticipant, getPrize, sahCount } from "@/engine/engine";
import type { ShowState } from "@/engine/types";
import { fit } from "@/lib/fit";
import { DrawAnim } from "./DrawAnim";

/**
 * Tampilan show (3 layer). Prototipe: visual seadanya.
 * Dipakai di jendela show, pratinjau operator, dan mode satu layar.
 */
export function ShowView({ state }: { state: ShowState }) {
  const sc = state.scene;
  const mood = SCENE_MOOD[sc.kind];
  const compactBrand = sc.kind === "draw" || sc.kind === "reveal";

  return (
    <div className="stage">
      {/* Layer 1: background (nanti WebGL generatif) */}
      <div className="bg bg-tenang" />
      <div className={`bg bg-intens ${mood === "intens" ? "on" : ""}`} />

      {/* Layer 3: brand */}
      <div className={`brand ${compactBrand ? "compact" : ""}`}>
        <div className="logo">LOGO</div>
        <div className="event-title">{state.settings.eventTitle}</div>
      </div>

      {/* Layer 2: konten, di area aman tengah */}
      <div className={`content ${state.blank ? "hidden" : ""}`}>
        <div className="scene" key={state.sceneSeq}>
          <SceneContent state={state} />
        </div>
      </div>

      <div className="scene-tag">{sc.kind}</div>
    </div>
  );
}

function SceneContent({ state }: { state: ShowState }) {
  const sc = state.scene;
  switch (sc.kind) {
    case "looping": {
      const session = state.sessions[sc.session];
      const featured = session.prizes[session.prizes.length - 1];
      return (
        <div className="stack">
          <div className="kicker">Sesi berikutnya</div>
          <div className="title" style={{ fontSize: fit(session.name, 12) }}>{session.name}</div>
          <div className="photo blur">{featured?.name}</div>
          <div className="sub">{session.prizes.reduce((n, p) => n + p.qty, 0)} hadiah menanti</div>
        </div>
      );
    }
    case "end":
      return (
        <div className="stack">
          <div className="title" style={{ fontSize: "10cqmin" }}>Terima kasih</div>
          <div className="sub">Selamat kepada semua pemenang</div>
        </div>
      );
    case "opener": {
      const session = state.sessions[sc.session];
      return (
        <div className="stack opener">
          <div className="kicker">Sesi {sc.session + 1}</div>
          <div className="title" style={{ fontSize: fit(session.name, 16) }}>{session.name}</div>
        </div>
      );
    }
    case "showcase": {
      const session = state.sessions[sc.session];
      const prize = getPrize(state, sc.session, sc.prize)!;
      return (
        <div className="stack">
          <div className="photo">FOTO HADIAH</div>
          <div className="title" style={{ fontSize: fit(prize.name, 8) }}>{prize.name}</div>
          <div className="sub">
            {prize.qty} pemenang · Hadiah {sc.prize + 1} dari {session.prizes.length}
          </div>
        </div>
      );
    }
    case "ready": {
      const prize = getPrize(state, sc.session, sc.prize)!;
      const n = eligible(state).length;
      return (
        <div className="stack">
          <div className="kicker">{prize.name}</div>
          {n === 0 ? (
            <div className="title" style={{ fontSize: "9cqmin" }}>Peserta habis</div>
          ) : (
            <>
              <div className="big-number" style={{ fontSize: "18cqmin" }}>{n}</div>
              <div className="sub">peserta siap diundi</div>
            </>
          )}
          <div className="sub small">
            Pemenang ke-{sahCount(state, prize.id) + 1} dari {prize.qty}
          </div>
        </div>
      );
    }
    case "draw": {
      const draw = getDraw(state, sc.drawId);
      const who = draw && getParticipant(state, draw.participantId);
      const prize = getPrize(state, sc.session, sc.prize)!;
      if (!who) return null;
      return (
        <div className="stack">
          <div className="kicker">{prize.name}</div>
          <DrawAnim state={state} winner={who.number} />
        </div>
      );
    }
    case "reveal": {
      const draw = getDraw(state, sc.drawId);
      const who = draw && getParticipant(state, draw.participantId);
      const prize = getPrize(state, sc.session, sc.prize)!;
      if (!who) return null;
      return (
        <div className="stack reveal">
          <div className="kicker">Selamat!</div>
          <div className="big-number" style={{ fontSize: fit(who.number, 26) }}>{who.number}</div>
          {who.name && <div className="name" style={{ fontSize: fit(who.name, 7) }}>{who.name}</div>}
          {who.info && <div className="sub small">{who.info}</div>}
          <div className="prize-tag">{prize.name}</div>
        </div>
      );
    }
  }
}
