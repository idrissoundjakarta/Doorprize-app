"use client";

import { useState } from "react";
import { uid } from "@/engine/rng";
import { createShow, generateRange, sampleParticipants, sampleSessions } from "@/engine/sample";
import type { Participant, Session, Settings, ShowState } from "@/engine/types";

type Props = { state: ShowState; setState: (s: ShowState) => void };

/** Setup sederhana untuk prototipe: pengaturan, peserta, sesi & hadiah. */
export function Setup({ state, setState }: Props) {
  const [sessions, setSessions] = useState<Session[]>(state.sessions);
  const [participants, setParticipants] = useState<Participant[]>(state.participants);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(500);
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState("");
  const dirty = sessions !== state.sessions || participants !== state.participants;

  // Pengaturan tampilan berlaku langsung, tanpa mengulang show.
  const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setState({ ...state, settings: { ...state.settings, [k]: v } });

  const apply = () => {
    if (state.draws.length > 0 && !confirm("Show sudah berjalan. Terapkan perubahan dan mulai ulang show dari awal? Daftar pemenang akan dikosongkan.")) return;
    setState(createShow(sessions, participants, state.settings));
    setNote("Tersimpan. Show dimulai dari awal.");
  };

  const parsePaste = () => {
    const seen = new Set<string>();
    let blank = 0, dup = 0;
    const out: Participant[] = [];
    for (const line of paste.split(/\r?\n/)) {
      const cols = line.split(/\t|;/).map((c) => c.trim());
      if (!cols[0]) { blank++; continue; }
      if (seen.has(cols[0])) { dup++; continue; }
      seen.add(cols[0]);
      out.push({ id: uid(), number: cols[0], name: cols[1] || undefined, info: cols[2] || undefined });
    }
    setParticipants(out);
    setNote(`${out.length} peserta dibaca. ${dup} duplikat dan ${blank} baris kosong dilewati.`);
  };

  const updSession = (i: number, s: Session) => setSessions(sessions.map((x, j) => (j === i ? s : x)));
  const move = <T,>(arr: T[], i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return arr;
    const a = [...arr];
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  };

  return (
    <div className="setup">
      <section>
        <h2>Acara & tampilan</h2>
        <label>Judul acara
          <input value={state.settings.eventTitle} onChange={(e) => setSetting("eventTitle", e.target.value)} />
        </label>
        <label>Gaya undian
          <select value={state.settings.style} onChange={(e) => setSetting("style", e.target.value as Settings["style"])}>
            <option value="digit">Buka digit</option>
            <option value="reel">Slot reel</option>
          </select>
        </label>
        <label>Tempo undian
          <select value={state.settings.tempo} onChange={(e) => setSetting("tempo", e.target.value as Settings["tempo"])}>
            <option value="cepat">Cepat (4 dtk)</option>
            <option value="normal">Normal (6 dtk)</option>
            <option value="dramatis">Dramatis (8 dtk)</option>
          </select>
        </label>
        <p className="hint">Logo, foto hadiah, warna, font, dan template menyusul di tahap visual.</p>
      </section>

      <section>
        <h2>Peserta <span className="count">{participants.length}</span></h2>
        <div className="row">
          <label>Dari <input type="number" value={from} onChange={(e) => setFrom(+e.target.value)} /></label>
          <label>Sampai <input type="number" value={to} onChange={(e) => setTo(+e.target.value)} /></label>
          <button onClick={() => { setParticipants(generateRange(from, to)); setNote(`${to - from + 1} nomor kupon dibuat.`); }}>Buat nomor kupon</button>
        </div>
        <label>…atau paste dari Excel (kolom: Nomor, Nama, Info)
          <textarea rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"001\tAndi Pratama\tFinance\n002\tBudi Santoso\tIT"} />
        </label>
        <button onClick={parsePaste} disabled={!paste.trim()}>Baca data paste</button>
        <p className="hint">Upload xlsx/csv dan pilih kolom menyusul.</p>
      </section>

      <section>
        <h2>Sesi & hadiah</h2>
        {sessions.map((s, i) => (
          <div key={s.id} className="session-card">
            <div className="row">
              <input className="grow" value={s.name} onChange={(e) => updSession(i, { ...s, name: e.target.value })} />
              <button onClick={() => setSessions(move(sessions, i, -1))}>↑</button>
              <button onClick={() => setSessions(move(sessions, i, 1))}>↓</button>
              <button className="danger" onClick={() => setSessions(sessions.filter((_, j) => j !== i))}>Hapus sesi</button>
            </div>
            {s.prizes.map((p, k) => (
              <div key={p.id} className="row prize-row">
                <input className="grow" value={p.name} onChange={(e) => updSession(i, { ...s, prizes: s.prizes.map((x, j) => (j === k ? { ...x, name: e.target.value } : x)) })} />
                <input type="number" min={1} className="qty" value={p.qty} onChange={(e) => updSession(i, { ...s, prizes: s.prizes.map((x, j) => (j === k ? { ...x, qty: Math.max(1, +e.target.value) } : x)) })} />
                <button onClick={() => updSession(i, { ...s, prizes: move(s.prizes, k, -1) })}>↑</button>
                <button onClick={() => updSession(i, { ...s, prizes: move(s.prizes, k, 1) })}>↓</button>
                <button className="danger" onClick={() => updSession(i, { ...s, prizes: s.prizes.filter((_, j) => j !== k) })}>×</button>
              </div>
            ))}
            <button onClick={() => updSession(i, { ...s, prizes: [...s.prizes, { id: uid(), name: "Hadiah baru", qty: 1 }] })}>+ Tambah hadiah</button>
          </div>
        ))}
        <button onClick={() => setSessions([...sessions, { id: uid(), name: `Sesi ${sessions.length + 1}`, prizes: [] }])}>+ Tambah sesi</button>
      </section>

      <div className="setup-actions">
        <button onClick={() => { setSessions(sampleSessions()); setParticipants(sampleParticipants()); setNote("Data contoh dimuat (500 kupon, 3 sesi, 10 hadiah). Klik Terapkan."); }}>Pakai data contoh</button>
        <button className="primary" disabled={!dirty} onClick={apply}>Terapkan & mulai show dari awal</button>
        {note && <span className="hint">{note}</span>}
      </div>
    </div>
  );
}
