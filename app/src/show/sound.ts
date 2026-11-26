/**
 * Suara yang dibuat lewat kode (WebAudio), tanpa file audio.
 * Browser baru mengizinkan suara setelah ada interaksi (klik/tombol) di jendela itu,
 * jadi `unlockAudio()` dipanggil dari handler tombol/klik.
 *
 * Semua bunyi lewat satu jalur: kompresor (keras tapi tidak pecah) + gema ruangan
 * (supaya terdengar "besar" seperti di ballroom, bukan bunyi HP).
 */
let ctx: AudioContext | null = null;
let bus: { dry: GainNode; wet: GainNode } | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Jalur keluaran bersama: dry + reverb → kompresor → speaker. */
function out(c: AudioContext): { dry: GainNode; wet: GainNode } {
  if (bus) return bus;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  const master = c.createGain();
  master.gain.value = 1.15;
  comp.connect(master).connect(c.destination);

  // Gema ruangan: impulse noise yang meluruh (±2,2 dtk), stereo.
  const len = Math.floor(c.sampleRate * 2.2);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  const verb = c.createConvolver();
  verb.buffer = ir;
  const verbOut = c.createGain();
  verbOut.gain.value = 0.32;
  verb.connect(verbOut).connect(comp);

  const dry = c.createGain();
  dry.connect(comp);
  const wet = c.createGain();
  wet.connect(verb);
  bus = { dry, wet };
  return bus;
}

export function unlockAudio(): void {
  void ac()?.resume();
}

function ready(): AudioContext | null {
  const c = ac();
  return c && c.state === "running" ? c : null;
}

/** Sambungkan sumber ke jalur keluaran, dengan porsi gema `wet` (0..1) dan posisi kiri-kanan `pan`. */
function route(c: AudioContext, node: AudioNode, wet = 0.4, pan = 0) {
  const b = out(c);
  let n: AudioNode = node;
  if (pan) {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    node.connect(p);
    n = p;
  }
  n.connect(b.dry);
  if (wet > 0) {
    const g = c.createGain();
    g.gain.value = wet;
    n.connect(g).connect(b.wet);
  }
}

function tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = "sine", wet = 0.4, pan = 0) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  route(c, g, wet, pan);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noiseSrc(c: AudioContext): AudioBufferSourceNode {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  return s;
}

/** Desis dengan filter yang bergerak (hembusan, kilau, simbal). `swell` = naik pelan lalu putus. */
function noise(start: number, dur: number, vol: number, from: number, to: number, opts: { type?: BiquadFilterType; swell?: boolean; wet?: number; pan?: number; q?: number } = {}) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + start;
  const src = noiseSrc(c), f = c.createBiquadFilter(), g = c.createGain();
  f.type = opts.type ?? "bandpass";
  f.Q.value = opts.q ?? 1;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  if (opts.swell) {
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.85);
    g.gain.linearRampToValueAtTime(0, t + dur);
  } else {
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  src.connect(f).connect(g);
  route(c, g, opts.wet ?? 0.4, opts.pan ?? 0);
  src.start(t, Math.random() * 2);
  src.stop(t + dur + 0.05);
}

/** Dentuman bass (seperti kick drum besar / boom panggung). */
function boom(start: number, vol: number, from = 140, to = 42, dur = 0.55) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  route(c, g, 0.15);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Akor "brass" (gergaji lewat filter yang membuka): terdengar seperti tiupan terompet. */
function brass(freqs: number[], start: number, dur: number, vol: number) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + start;
  const f = c.createBiquadFilter(), g = c.createGain();
  f.type = "lowpass";
  f.Q.value = 2;
  f.frequency.setValueAtTime(500, t);
  f.frequency.exponentialRampToValueAtTime(4200, t + 0.12);
  f.frequency.exponentialRampToValueAtTime(1600, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.04);
  g.gain.setValueAtTime(vol * 0.8, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g);
  route(c, g, 0.45);
  freqs.forEach((fr, i) => {
    for (const det of [-7, 7]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = fr;
      o.detune.value = det + i;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  });
}

/** Kilau lonceng berurutan (sparkle) di nada tinggi, menyebar kiri-kanan. */
function sparkle(start: number, n: number, base: number, vol: number) {
  const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  for (let i = 0; i < n; i++) {
    const semi = scale[(i * 3 + 1) % scale.length];
    const f = base * Math.pow(2, semi / 12);
    const pan = Math.sin(i * 2.3) * 0.7;
    tone(f, start + i * 0.055, 0.7, vol, "sine", 0.6, pan);
    tone(f * 2.01, start + i * 0.055, 0.35, vol * 0.4, "sine", 0.6, pan);
  }
}

/** Klik halus (reel lewat, putaran). */
export const sfxTick = (strong = false) => tone(strong ? 1320 : 1760, 0, strong ? 0.25 : 0.06, strong ? 0.12 : 0.04, "triangle", 0.15);

// Nada dasar langkah undian: naik satu tingkat setiap digit/langkah (tangga nada mayor) supaya makin tegang.
const STEP_SEMI = [0, 4, 7, 12, 16, 19, 24, 28];

/**
 * "Hit" saat satu digit/langkah terbuka: dentuman + akor + desis simbal + kilau.
 * Nadanya naik setiap langkah (k = 1, 2, 3…). Langkah terakhir (`final`) paling besar.
 */
export const sfxHit = (k: number, final = false) => {
  const semi = STEP_SEMI[Math.min(STEP_SEMI.length - 1, Math.max(0, k - 1))];
  const root = 261.63 * Math.pow(2, semi / 12); // C4 naik bertahap
  boom(0, final ? 0.9 : 0.7, final ? 160 : 130, 40, final ? 0.8 : 0.5);
  noise(0, final ? 1.4 : 0.6, final ? 0.32 : 0.2, 9000, 5000, { type: "highpass", wet: 0.5 }); // simbal
  noise(0, 0.08, 0.35, 2500, 1200, { wet: 0.2 }); // tepukan / clap
  brass(final ? [root, root * 1.26, root * 1.5, root * 2] : [root, root * 1.5], 0, final ? 0.9 : 0.42, final ? 0.13 : 0.1);
  tone(root * 4, 0, 0.5, 0.06, "triangle", 0.6);
  sparkle(0.03, final ? 9 : 4, root * 2, final ? 0.05 : 0.04);
};

/** Hembusan naik untuk opener. */
export const sfxSwell = () => {
  noise(0, 1.6, 0.12, 300, 3000, { swell: true });
  boom(1.55, 0.6);
  brass([392, 493.88, 587.33], 1.55, 1.4, 0.08);
  sparkle(1.6, 6, 783.99, 0.04);
};

/** Ketegangan saat undian dimulai: desis naik + drum roll halus. */
export const sfxRise = (dur: number) => {
  noise(0, dur, 0.07, 200, 2400, { swell: true });
  // Drum roll (snare cepat) yang makin keras, berhenti sedikit sebelum akhir.
  const n = Math.floor((dur - 0.3) / 0.055);
  for (let i = 0; i < n; i++) {
    const p = i / Math.max(1, n);
    noise(i * 0.055, 0.07, 0.03 + p * 0.09, 1800, 1500, { wet: 0.25, q: 0.7 });
  }
};

/** Fanfare pemenang: dentuman, terompet, simbal, letupan confetti, kilau. */
export const sfxFanfare = (grand = false) => {
  boom(0, 1);
  noise(0, 2.4, 0.3, 10000, 6000, { type: "highpass", wet: 0.6 }); // simbal crash
  // Letupan party popper kiri & kanan
  noise(0.02, 0.12, 0.45, 1800, 600, { pan: -0.8, wet: 0.3 });
  noise(0.06, 0.12, 0.45, 1800, 600, { pan: 0.8, wet: 0.3 });
  // Terompet: ta-ta-taaa
  const C = 523.25;
  brass([C, C * 1.26, C * 1.5], 0, 0.16, 0.12);
  brass([C, C * 1.26, C * 1.5], 0.18, 0.16, 0.12);
  brass([C * 1.12, C * 1.414, C * 1.68], 0.36, 0.2, 0.12);
  brass([C, C * 1.26, C * 1.5, C * 2], 0.58, grand ? 2.2 : 1.6, 0.15);
  boom(0.58, 0.8, 120, 38, 0.9);
  noise(0.58, 2, 0.22, 9000, 5000, { type: "highpass", wet: 0.6 });
  sparkle(0.6, grand ? 16 : 10, 1046.5, 0.045);
  // Tepuk tangan penonton (burst desis acak) — hanya terasa sebagai "keramaian".
  const claps = grand ? 40 : 24;
  for (let i = 0; i < claps; i++) {
    const at = 0.6 + i * 0.07 + Math.sin(i * 7.1) * 0.03;
    noise(at, 0.05, 0.05 * (1 - i / claps), 2200 + (i % 5) * 300, 1400, { pan: Math.sin(i * 1.7) * 0.8, wet: 0.5 });
  }
  if (grand) {
    boom(1.4, 0.7);
    sparkle(1.5, 12, 1318.5, 0.04);
  }
};
