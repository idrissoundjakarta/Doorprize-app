"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { TEMPO_MS } from "@/engine/engine";
import { uid } from "@/engine/rng";
import { preflight, preflightOk } from "@/engine/preflight";
import { createShow, emptyShow, generateRange, sampleParticipants, sampleSessions } from "@/engine/sample";
import type { DrawStyle, Palette, Participant, Session, Settings, ShowState, Template, Theme } from "@/engine/types";
import { paletteFromImage } from "@/lib/color";
import { fileToDataUrl } from "@/lib/image";
import { parseRows, readSpreadsheet } from "@/lib/import";
import { FONTS, STYLE_INFO, TEMPLATE_PRESET } from "@/show/presets";
import { ShowView } from "@/show/ShowView";
import { PreflightList } from "./Preflight";
import { Dialog, Toggle } from "./ui";

type Props = { state: ShowState; setState: (s: ShowState) => void; onDone: () => void; toast: (m: string) => void };
type Step = "acara" | "tampilan" | "peserta" | "sesi" | "gaya";
type PreviewKind = "looping" | "showcase" | "draw" | "reveal";

const STEPS: { id: Step; label: string }[] = [
  { id: "acara", label: "Acara" },
  { id: "tampilan", label: "Tampilan" },
  { id: "peserta", label: "Peserta" },
  { id: "sesi", label: "Sesi & hadiah" },
  { id: "gaya", label: "Gaya undian" },
];

export function Setup({ state, setState, onDone, toast }: Props) {
  const [step, setStep] = useState<Step>("acara");
  const [sessions, setSessions] = useState<Session[]>(state.sessions);
  const [participants, setParticipants] = useState<Participant[]>(state.participants);
  const [preview, setPreview] = useState<PreviewKind>("reveal");
  const [previewStyle, setPreviewStyle] = useState<DrawStyle | null>(null);
  const [confirm, setConfirm] = useState(false);
  const dirty = sessions !== state.sessions || participants !== state.participants;
  const st = state.settings;

  // Pengaturan tampilan & gaya berlaku langsung (tanpa mengulang show).
  const setSettings = (patch: Partial<Settings>) => setState({ ...state, settings: { ...st, ...patch } });
  const setTheme = (patch: Partial<Theme>) => setSettings({ theme: { ...st.theme, ...patch } });

  const apply = () => {
    setState({ ...createShow(sessions, participants, st), sceneAt: Date.now() - 10_000 });
    setConfirm(false);
    toast("Data tersimpan, show siap dari awal");
  };
  const save = () => (state.draws.length > 0 ? setConfirm(true) : apply());

  // Selama show belum dimulai, perubahan peserta/sesi langsung tersimpan (tanpa tombol Simpan).
  const running = state.draws.length > 0;
  useEffect(() => {
    if (!running && (sessions !== state.sessions || participants !== state.participants)) {
      setState({ ...createShow(sessions, participants, st), sceneAt: Date.now() - 10_000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat draf berubah
  }, [sessions, participants]);

  const checks = preflight({ settings: st, sessions, participants });
  const [newEvent, setNewEvent] = useState(false);

  const summary: Record<Step, string> = {
    acara: st.eventTitle || "Belum diisi",
    tampilan: `${TEMPLATE_PRESET[st.theme.template].label}`,
    peserta: `${participants.length} peserta`,
    sesi: `${sessions.length} sesi · ${sessions.reduce((n, s) => n + s.prizes.length, 0)} hadiah`,
    gaya: `${STYLE_INFO[st.style].label} · ${st.tempo}`,
  };
  const done: Record<Step, boolean> = {
    acara: !!st.eventTitle,
    tampilan: true,
    peserta: participants.length > 0,
    sesi: sessions.some((s) => s.prizes.length > 0),
    gaya: true,
  };

  return (
    <div className="setup">
      <nav className="card steps">
        <div className="lbl" style={{ margin: "4px 10px 10px" }}>Langkah setup</div>
        <div className="steps-list">
        {STEPS.map((s, i) => (
          <button key={s.id} className={`step ${step === s.id ? "on" : done[s.id] ? "done" : ""}`} onClick={() => setStep(s.id)}>
            <span className="n">{done[s.id] && step !== s.id ? "✓" : i + 1}</span>
            <span>
              <b style={{ fontSize: 14 }}>{s.label}</b>
              <small>{summary[s.id]}</small>
            </span>
          </button>
        ))}
        </div>
        <div style={{ height: 10 }} />
        {dirty && running ? (
          <>
            <button className="btn b-pri" onClick={save}>Simpan perubahan <span className="go-ico" style={{ width: 26, height: 26 }}>✓</span></button>
            <span className="chip c-warn" style={{ marginTop: 8, whiteSpace: "normal" }}>! Show sudah berjalan. Perubahan peserta/sesi belum disimpan</span>
          </>
        ) : (
          <button className="btn b-pri" onClick={onDone} disabled={!preflightOk(checks)}>Ke layar show <span className="go-ico" style={{ width: 26, height: 26 }}>→</span></button>
        )}
        <div className="pf-box">
          <div className="lbl" style={{ margin: "14px 10px 6px" }}>Cek sebelum show</div>
          <PreflightList checks={checks} onGo={setStep} compact />
        </div>
        <button className="btn b-sm b-ghost" style={{ marginTop: 10 }} onClick={() => setNewEvent(true)}>Mulai acara baru</button>
      </nav>

      <main className="col">
        {step === "acara" && <StepAcara st={st} setSettings={setSettings} />}
        {step === "tampilan" && <StepTampilan st={st} setTheme={setTheme} />}
        {step === "peserta" && <StepPeserta participants={participants} setParticipants={setParticipants} toast={toast} />}
        {step === "sesi" && <StepSesi sessions={sessions} setSessions={setSessions} />}
        {step === "gaya" && <StepGaya st={st} setSettings={setSettings} onPreview={(s) => { setPreviewStyle(s); setPreview("draw"); }} />}
        <div className="row">
          {STEPS.findIndex((s) => s.id === step) > 0 && <button className="btn b-sec" onClick={() => setStep(STEPS[STEPS.findIndex((s) => s.id === step) - 1].id)}>◀ Sebelumnya</button>}
          {STEPS.findIndex((s) => s.id === step) < STEPS.length - 1 && <button className="btn b-pri right" onClick={() => setStep(STEPS[STEPS.findIndex((s) => s.id === step) + 1].id)}>Lanjut <span className="go-ico" style={{ width: 26, height: 26 }}>→</span></button>}
        </div>
      </main>

      <aside className={`side-preview s-${step}`}>
        <div className="card col" style={{ padding: 16 }}>
          <div className="row"><div className="lbl">Pratinjau langsung</div><span className="small muted right">data contoh</span></div>
          <div className="preview"><PreviewStage state={state} sessions={sessions} participants={participants} kind={preview} style={previewStyle ?? undefined} /></div>
          <div className="seg g" style={{ alignSelf: "start" }}>
            {(["looping", "showcase", "draw", "reveal"] as PreviewKind[]).map((k) => (
              <button key={k} className={preview === k ? "on" : ""} onClick={() => { setPreview(k); setPreviewStyle(null); }}>{{ looping: "Looping", showcase: "Showcase", draw: "Undi", reveal: "Reveal" }[k]}</button>
            ))}
          </div>
          <div className="small muted" style={{ lineHeight: 1.6 }}>Perubahan warna, font, dan gaya langsung terlihat di sini dan di layar LED.</div>
        </div>
      </aside>

      {newEvent && (
        <Dialog title="Mulai acara baru?" confirm="Ya, mulai dari kosong" onCancel={() => setNewEvent(false)} onConfirm={() => { const e = emptyShow(); setSessions(e.sessions); setParticipants(e.participants); setState(e); setNewEvent(false); setStep("acara"); toast("Acara baru siap diisi"); }}>
          Semua data acara ini (peserta, sesi, hadiah, logo, warna, <b style={{ color: "var(--ink)" }}>dan daftar pemenang</b>) akan dihapus dari perangkat ini. Export dulu daftar pemenang kalau masih dibutuhkan.
        </Dialog>
      )}
      {confirm && (
        <Dialog title="Simpan dan mulai ulang show?" confirm="Ya, simpan" onCancel={() => setConfirm(false)} onConfirm={apply}>
          Show sudah berjalan ({state.draws.length} hasil undian). Mengubah peserta atau sesi akan <b style={{ color: "var(--ink)" }}>mengosongkan daftar pemenang</b> dan memulai show dari awal. Export dulu kalau masih dibutuhkan.
        </Dialog>
      )}
    </div>
  );
}

// ================= Pratinjau =================
function PreviewStage({ state, sessions, participants, kind, style }: { state: ShowState; sessions: Session[]; participants: Participant[]; kind: PreviewKind; style?: DrawStyle }) {
  const [tick, setTick] = useState(0);
  const dur = TEMPO_MS[state.settings.tempo];
  // Undi & reveal diputar ulang terus supaya animasinya bisa dilihat.
  useEffect(() => {
    if (kind !== "draw" && kind !== "reveal") return;
    const id = setInterval(() => setTick((t) => t + 1), kind === "draw" ? dur + 1500 : 6000);
    return () => clearInterval(id);
  }, [kind, dur]);
  const ps = useMemo(() => {
    const sess = sessions.length && sessions.some((s) => s.prizes.length) ? sessions : sampleSessions();
    const people = participants.length ? participants : sampleParticipants(50);
    const s = Math.max(0, sess.findIndex((x) => x.prizes.length));
    const prize = sess[s].prizes[sess[s].prizes.length - 1];
    const winner = people.find((p) => p.name) ?? people[0];
    const draw = { id: "preview", sessionId: sess[s].id, prizeId: prize.id, participantId: winner.id, source: "acak" as const, status: "pending" as const, at: 0 };
    // eslint-disable-next-line react-hooks/purity -- pratinjau sengaja mulai ulang dari "sekarang"
    const base: ShowState = { ...state, sessions: sess, participants: people, draws: [draw], blank: false, sceneSeq: 1000 + tick, sceneAt: Date.now() };
    const settings = style ? { ...state.settings, style } : state.settings;
    const p = sess[s].prizes.length - 1;
    const scene: ShowState["scene"] =
      kind === "looping" ? { kind: "looping", session: s } : kind === "showcase" ? { kind: "showcase", session: s, prize: p } : kind === "draw" ? { kind: "draw", session: s, prize: p, drawId: "preview" } : { kind: "reveal", session: s, prize: p, drawId: "preview" };
    return { ...base, settings: { ...settings, sound: false }, scene };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick sengaja memicu ulang animasi
  }, [state.settings, sessions, participants, kind, style, tick]);
  return <ShowView state={ps} />;
}

// ================= Langkah 1: Acara =================
function StepAcara({ st, setSettings }: { st: Settings; setSettings: (p: Partial<Settings>) => void }) {
  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setSettings({ logo: await fileToDataUrl(f, 600, "image/png") });
    e.target.value = "";
  };
  return (
    <>
      <Head n={1} title="Acara" desc="Nama perusahaan, judul acara, dan logo klien tampil di semua layar show." />
      <div className="card col">
        <label className="f">Nama perusahaan / klien<input className="field" value={st.companyName} onChange={(e) => setSettings({ companyName: e.target.value })} placeholder="PT Contoh Sejahtera" /></label>
        <label className="f">Judul acara<input className="field" value={st.eventTitle} onChange={(e) => setSettings({ eventTitle: e.target.value })} placeholder="Annual Gathering 2026" /></label>
        <div className="f" style={{ fontSize: 12, color: "var(--mut)" }}>Logo klien</div>
        <label className="drop">
          <div className="thumb" style={{ background: st.logo ? "#222" : undefined }}>{st.logo ? <img src={st.logo} alt="" style={{ objectFit: "contain" }} /> : "+"}</div>
          <div className="grow"><b style={{ fontSize: 15 }}>{st.logo ? "Logo terpasang" : "Upload logo"}</b><div className="small muted">PNG transparan paling bagus. Kalau kosong, tampil inisial perusahaan.</div></div>
          {st.logo && <button className="btn b-sm b-dng" onClick={(e) => { e.preventDefault(); setSettings({ logo: undefined }); }}>Hapus</button>}
          <input type="file" accept="image/*" hidden onChange={onLogo} />
        </label>
      </div>
    </>
  );
}

// ================= Langkah 2: Tampilan =================
const ROLE: { k: keyof Palette; label: string }[] = [
  { k: "bg1", label: "Dasar tengah" },
  { k: "bg2", label: "Dasar pinggir" },
  { k: "primary", label: "Aksen" },
  { k: "primary2", label: "Kilau" },
  { k: "text", label: "Teks" },
  { k: "muted", label: "Teks samar" },
];

function StepTampilan({ st, setTheme }: { st: Settings; setTheme: (p: Partial<Theme>) => void }) {
  const th = st.theme;
  const [kv, setKv] = useState<{ src: string; swatches: string[] } | null>(null);
  const isPreset = (p: Palette) => Object.values(TEMPLATE_PRESET).some((t) => JSON.stringify(t.palette) === JSON.stringify(p));
  const onKv = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const src = await fileToDataUrl(f, 800);
    const { palette, swatches } = await paletteFromImage(src);
    setKv({ src, swatches });
    setTheme({ palette });
  };
  const pickTemplate = (t: Template) => (isPreset(th.palette) ? setTheme({ template: t, palette: TEMPLATE_PRESET[t].palette, fontTitle: TEMPLATE_PRESET[t].fontTitle }) : setTheme({ template: t }));
  return (
    <>
      <Head n={2} title="Tampilan show" desc="Warna layar LED mengikuti KV klien. Background digambar live, jadi tidak butuh file video." />
      <div className="card row wrap" style={{ gap: 18 }}>
        <label className="drop grow" style={{ minWidth: 280 }}>
          <div className="thumb" style={{ width: 96, height: 64 }}>{kv ? <img src={kv.src} alt="" /> : "KV"}</div>
          <div className="grow"><b style={{ fontSize: 15 }}>Ambil warna dari KV</b><div className="small muted">KV hanya dipakai untuk mengambil palet, tidak ditampilkan di layar.</div></div>
          <input type="file" accept="image/*" hidden onChange={onKv} />
        </label>
        {kv && (
          <div className="col" style={{ gap: 8 }}>
            <div className="row" style={{ gap: 6 }}>{kv.swatches.map((c) => <div key={c} className="swatch" style={{ background: c }} />)}</div>
            <span className="chip c-go">✓ Palet diterapkan</span>
          </div>
        )}
      </div>

      <div className="card col">
        <div className="lbl">Template background</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {(Object.keys(TEMPLATE_PRESET) as Template[]).map((t) => {
            const pr = TEMPLATE_PRESET[t];
            const pal = isPreset(th.palette) ? pr.palette : th.palette;
            const bgImg = t === "gala" ? `radial-gradient(circle at 30% 40%, ${pal.primary}88, transparent 35%), radial-gradient(circle at 75% 65%, ${pal.primary2}55, transparent 30%)` : t === "neon" ? `linear-gradient(115deg, transparent 35%, ${pal.primary}88 47%, transparent 55%), linear-gradient(65deg, transparent 40%, ${pal.primary2}77 52%, transparent 62%)` : `repeating-linear-gradient(90deg, ${pal.primary}33 0 1px, transparent 1px 22px), repeating-linear-gradient(0deg, ${pal.primary}33 0 1px, transparent 1px 22px)`;
            return (
              <button key={t} className={`tpl ${th.template === t ? "on" : ""}`} onClick={() => pickTemplate(t)}>
                <div className="sw" style={{ background: `${bgImg}, radial-gradient(ellipse at 50% 45%, ${pal.bg1}, ${pal.bg2})` }} />
                <div style={{ fontWeight: 600, fontSize: 14, margin: "10px 4px 2px" }}>{pr.label}</div>
                <div className="small muted" style={{ margin: "0 4px 4px" }}>{pr.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card col">
        <div className="row"><div className="lbl">Warna</div><button className="btn b-sm b-ghost right" onClick={() => setTheme({ palette: TEMPLATE_PRESET[th.template].palette })}>Pakai warna bawaan template</button></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {ROLE.map(({ k, label }) => (
            <label key={k} className="row" style={{ background: "var(--g)", borderRadius: 16, padding: 8, gap: 10 }}>
              <input type="color" value={th.palette[k]} onChange={(e) => setTheme({ palette: { ...th.palette, [k]: e.target.value.toUpperCase() } })} />
              <span><b style={{ fontSize: 13 }}>{label}</b><div className="small muted" style={{ fontSize: 11 }}>{th.palette[k]}</div></span>
            </label>
          ))}
        </div>
      </div>

      <div className="card col">
        <div className="grid2">
          <label className="f">Font judul<select className="field" value={th.fontTitle} onChange={(e) => setTheme({ fontTitle: e.target.value })} style={{ fontFamily: th.fontTitle, fontSize: 18 }}>{FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
          <label className="f">Font nomor & nama<select className="field" value={th.fontBody} onChange={(e) => setTheme({ fontBody: e.target.value })} style={{ fontFamily: th.fontBody, fontSize: 16, fontWeight: 700 }}>{FONTS.filter((f) => f.kind === "sans").map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
        </div>
        <label className="f">Peredup background · {Math.round(th.dim * 100)}%<input type="range" min={0} max={0.8} step={0.05} value={th.dim} onChange={(e) => setTheme({ dim: +e.target.value })} /></label>
        <Toggle on={th.quality === "hemat"} onChange={(v) => setTheme({ quality: v ? "hemat" : "tinggi" })} label="Mode hemat (untuk laptop yang kurang kuat)" />
      </div>
    </>
  );
}

// ================= Langkah 3: Peserta =================
function StepPeserta({ participants, setParticipants, toast }: { participants: Participant[]; setParticipants: (p: Participant[]) => void; toast: (m: string) => void }) {
  const [mode, setMode] = useState<"range" | "paste" | "file">("range");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(500);
  const [paste, setPaste] = useState("");
  const [rows, setRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [header, setHeader] = useState(true);
  const [map, setMap] = useState({ number: 0, name: 1, info: 2 });

  const load = (r: string[][], name: string) => {
    const cleaned = r.filter((x) => x.some((c) => String(c ?? "").trim()));
    setRows(cleaned);
    setFileName(name);
    const first = cleaned[0] ?? [];
    setHeader(first.length > 0 && !/^\d+$/.test(String(first[0]).trim()));
    const cols = Math.max(...cleaned.slice(0, 20).map((x) => x.length));
    setMap({ number: 0, name: cols > 1 ? 1 : -1, info: cols > 2 ? 2 : -1 });
  };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) load(await readSpreadsheet(f), f.name);
  };

  const result = useMemo(() => (rows ? parseRows(header ? rows.slice(1) : rows, map) : null), [rows, header, map]);
  const headers = rows ? (header ? rows[0] : rows[0].map((_, i) => `Kolom ${String.fromCharCode(65 + i)}`)) : [];
  const colCount = rows ? Math.max(...rows.slice(0, 20).map((r) => r.length)) : 0;
  const colOpts = Array.from({ length: colCount }, (_, i) => ({ i, label: `${String.fromCharCode(65 + i)} · ${headers[i] ?? ""}` }));

  return (
    <>
      <Head n={3} title="Peserta" desc="Nomor kupon tampil besar. Kalau ada nama, nama tampil di bawahnya saat pemenang diumumkan." right={<span className="chip c-champ">★ {participants.length} peserta</span>} />
      <div className="seg" style={{ alignSelf: "start" }}>
        <button className={mode === "range" ? "on" : ""} onClick={() => setMode("range")}>Buat nomor kupon</button>
        <button className={mode === "paste" ? "on" : ""} onClick={() => setMode("paste")}>Paste dari Excel</button>
        <button className={mode === "file" ? "on" : ""} onClick={() => setMode("file")}>Upload file</button>
      </div>

      {mode === "range" && (
        <div className="card row wrap" style={{ gap: 14, alignItems: "end" }}>
          <label className="f" style={{ width: 140 }}>Dari nomor<input className="field" type="number" value={from} onChange={(e) => setFrom(+e.target.value)} /></label>
          <label className="f" style={{ width: 140 }}>Sampai nomor<input className="field" type="number" value={to} onChange={(e) => setTo(+e.target.value)} /></label>
          <button className="btn b-pri" disabled={to < from || to - from > 50000} onClick={() => { setParticipants(generateRange(from, to)); toast(`${to - from + 1} nomor kupon dibuat`); }}>Buat {Math.max(0, to - from + 1)} nomor</button>
          <div className="small muted grow">Contoh: 1–500 menjadi 001 … 500.</div>
        </div>
      )}
      {mode === "paste" && (
        <div className="card col">
          <label className="f">Copy kolom dari Excel / Google Sheets lalu paste di sini<textarea className="field" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"No Kupon\tNama\tDivisi\n001\tAndi Pratama\tFinance\n002\tBudi Santoso\tIT"} /></label>
          <button className="btn b-sec" style={{ alignSelf: "start" }} disabled={!paste.trim()} onClick={() => load(paste.split(/\r?\n/).map((l) => l.split(l.includes("\t") ? "\t" : /[;,]/)), "Data paste")}>Baca data</button>
        </div>
      )}
      {mode === "file" && (
        <label className="card drop">
          <div className="thumb" style={{ background: "var(--go-bg)", color: "var(--go-t)", fontWeight: 700, fontSize: 13 }}>XLS</div>
          <div className="grow"><b style={{ fontSize: 15 }}>{fileName && rows ? fileName : "Pilih file Excel atau CSV"}</b><div className="small muted">{rows ? `${rows.length} baris terbaca` : ".xlsx, .xls, atau .csv · sheet pertama yang dibaca"}</div></div>
          {rows && <span className="chip c-go">✓ Terbaca</span>}
          <input type="file" accept=".xlsx,.xls,.csv,text/csv" hidden onChange={onFile} />
        </label>
      )}

      {rows && result && mode !== "range" && (
        <div className="card col">
          <div className="row wrap">
            <div className="lbl">Pilih kolom</div>
            <span className="right"><Toggle on={header} onChange={setHeader} label="Baris pertama adalah judul kolom" /></span>
          </div>
          <div className="grid3">
            {(["number", "name", "info"] as const).map((k) => (
              <label key={k} className="f">{{ number: "Nomor (wajib)", name: "Nama", info: "Info tambahan" }[k]}
                <select className="field" value={map[k]} onChange={(e) => setMap({ ...map, [k]: +e.target.value })} style={k === "number" ? { background: "var(--ink)", color: "#fff" } : undefined}>
                  {k !== "number" && <option value={-1}>— Tidak dipakai —</option>}
                  {colOpts.map((o) => <option key={o.i} value={o.i}>{o.label}</option>)}
                </select>
              </label>
            ))}
          </div>
          <table className="t">
            <thead><tr><th>Nomor</th><th>Nama</th><th>Info</th><th /></tr></thead>
            <tbody>
              {result.preview.map((r, i) => (
                <tr key={i} className={r.flag === "dup" ? "warn" : ""}>
                  <td><b>{r.number}</b></td><td>{r.name}</td><td className="muted">{r.info}</td>
                  <td style={{ textAlign: "right" }}>{r.flag === "dup" ? <span className="chip c-warn">! Duplikat</span> : r.flag === "long" ? <span className="chip c-info">i Disingkat di layar</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="chip c-go">✓ {result.people.length} peserta siap</span>
            {result.dup > 0 && <span className="chip c-warn">! {result.dup} duplikat dilewati</span>}
            {result.blank > 0 && <span className="chip c-warn">! {result.blank} baris tanpa nomor dilewati</span>}
            {result.long > 0 && <span className="chip c-info">i {result.long} nama panjang disingkat di layar</span>}
            <button className="btn b-pri right" disabled={!result.people.length} onClick={() => { setParticipants(result.people); toast(`${result.people.length} peserta dipakai`); }}>Pakai data ini</button>
          </div>
        </div>
      )}

      <div className="card row">
        <div className="grow"><b>Data peserta sekarang</b><div className="small muted">{participants.length} peserta{participants.some((p) => p.name) ? " · dengan nama" : " · nomor saja"}</div></div>
        <button className="btn b-sm b-ghost" onClick={() => { setParticipants(sampleParticipants()); toast("Data contoh 500 peserta dimuat"); }}>Pakai data contoh</button>
      </div>
    </>
  );
}

// ================= Langkah 4: Sesi & hadiah =================
function StepSesi({ sessions, setSessions }: { sessions: Session[]; setSessions: (s: Session[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<{ s: number; p: number } | null>(null);
  const upd = (i: number, s: Session) => setSessions(sessions.map((x, j) => (j === i ? s : x)));
  const move = <T,>(arr: T[], i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return arr;
    const a = [...arr];
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  };
  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    const t = target.current;
    if (!f || !t) return;
    const photo = await fileToDataUrl(f, 900);
    const s = sessions[t.s];
    upd(t.s, { ...s, prizes: s.prizes.map((x, k) => (k === t.p ? { ...x, photo } : x)) });
  };
  return (
    <>
      <Head n={4} title="Sesi & hadiah" desc="Bagi hadiah ke beberapa sesi supaya penonton tetap penasaran sampai akhir. Urutan di sini = urutan di show." right={<button className="btn b-sm b-ghost" onClick={() => setSessions(sampleSessions())}>Pakai data contoh</button>} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
      {sessions.map((s, i) => (
        <div key={s.id} className="card col">
          <div className="row">
            <input className="field grow" style={{ fontWeight: 600, fontSize: 17 }} value={s.name} onChange={(e) => upd(i, { ...s, name: e.target.value })} />
            {/grand/i.test(s.name) && <span className="chip c-champ">★ Grand</span>}
            <button className="icon-btn" title="Naik" onClick={() => setSessions(move(sessions, i, -1))}>↑</button>
            <button className="icon-btn" title="Turun" onClick={() => setSessions(move(sessions, i, 1))}>↓</button>
            <button className="icon-btn dng" title="Hapus sesi" onClick={() => setSessions(sessions.filter((_, j) => j !== i))}>✕</button>
          </div>
          {s.prizes.map((p, k) => (
            <div key={p.id} className="prize-row">
              <button className="thumb" title="Upload foto hadiah" onClick={() => { target.current = { s: i, p: k }; fileRef.current?.click(); }}>{p.photo ? <img src={p.photo} alt="" /> : "+"}</button>
              <div className="col grow" style={{ gap: 4 }}>
                <input className="field" value={p.name} onChange={(e) => upd(i, { ...s, prizes: s.prizes.map((x, j) => (j === k ? { ...x, name: e.target.value } : x)) })} />
                {!p.photo && <span className="small" style={{ color: "var(--warn-t)", paddingLeft: 4 }}>! Foto belum diupload</span>}
              </div>
              <label className="row small muted" style={{ gap: 6 }}>×<input className="field" type="number" min={1} value={p.qty} onChange={(e) => upd(i, { ...s, prizes: s.prizes.map((x, j) => (j === k ? { ...x, qty: Math.max(1, +e.target.value) } : x)) })} /></label>
              <select className="field" value={p.style ?? ""} title="Gaya undian khusus hadiah ini" onChange={(e) => upd(i, { ...s, prizes: s.prizes.map((x, j) => (j === k ? { ...x, style: (e.target.value || undefined) as DrawStyle | undefined } : x)) })}>
                <option value="">Gaya: ikut acara</option>
                {(Object.keys(STYLE_INFO) as DrawStyle[]).map((d) => <option key={d} value={d}>{STYLE_INFO[d].label}</option>)}
              </select>
              <div className="acts">
                <button className="icon-btn" title="Naik" onClick={() => upd(i, { ...s, prizes: move(s.prizes, k, -1) })}>↑</button>
                <button className="icon-btn" title="Turun" onClick={() => upd(i, { ...s, prizes: move(s.prizes, k, 1) })}>↓</button>
                <button className="icon-btn dng" title="Hapus hadiah" onClick={() => upd(i, { ...s, prizes: s.prizes.filter((_, j) => j !== k) })}>✕</button>
              </div>
            </div>
          ))}
          <button className="btn b-ghost" onClick={() => upd(i, { ...s, prizes: [...s.prizes, { id: uid(), name: "Hadiah baru", qty: 1 }] })}>+ Tambah hadiah</button>
        </div>
      ))}
      <button className="card drop" style={{ justifyContent: "center" }} onClick={() => setSessions([...sessions, { id: uid(), name: `Sesi ${sessions.length + 1}`, prizes: [] }])}>
        <span className="thumb" style={{ background: "var(--ink)", color: "#fff" }}>+</span><b>Tambah sesi</b>
      </button>
    </>
  );
}

// ================= Langkah 5: Gaya undian =================
function StepGaya({ st, setSettings, onPreview }: { st: Settings; setSettings: (p: Partial<Settings>) => void; onPreview: (s: DrawStyle) => void }) {
  return (
    <>
      <Head n={5} title="Gaya undian" desc="Gaya bawaan untuk semua hadiah. Hadiah tertentu bisa memakai gaya lain di langkah Sesi & hadiah." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {(Object.keys(STYLE_INFO) as DrawStyle[]).map((d) => (
          <button key={d} className={`stylecard ${st.style === d ? "on" : ""}`} onClick={() => { setSettings({ style: d }); onPreview(d); }}>
            <div className="row"><b style={{ fontSize: 16 }}>{STYLE_INFO[d].label}</b>{st.style === d && <span className="chip c-go right">✓ Dipakai</span>}</div>
            <div className="small muted" style={{ marginTop: 6 }}>{STYLE_INFO[d].desc}</div>
          </button>
        ))}
      </div>
      <div className="card col">
        <div className="lbl">Tempo undian</div>
        <div className="seg g" style={{ alignSelf: "start" }}>
          {(["cepat", "normal", "dramatis"] as const).map((t) => <button key={t} className={st.tempo === t ? "on" : ""} onClick={() => setSettings({ tempo: t })}>{{ cepat: "Cepat · 4 dtk", normal: "Normal · 6 dtk", dramatis: "Dramatis · 8 dtk" }[t]}</button>)}
        </div>
        <Toggle on={st.sound} onChange={(v) => setSettings({ sound: v })} label="Suara (fanfare pemenang, efek undian)" />
      </div>
    </>
  );
}

function Head({ n, title, desc, right }: { n: number; title: string; desc: string; right?: ReactNode }) {
  return (
    <div className="row wrap" style={{ alignItems: "end" }}>
      <div className="grow">
        <div className="lbl">Langkah {n}</div>
        <div className="h1">{title}</div>
        <div className="muted small" style={{ marginTop: 4, maxWidth: 640, lineHeight: 1.6 }}>{desc}</div>
      </div>
      {right}
    </div>
  );
}

