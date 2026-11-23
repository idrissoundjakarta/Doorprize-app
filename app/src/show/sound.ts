/**
 * Suara yang dibuat lewat kode (WebAudio), tanpa file audio.
 * Browser baru mengizinkan suara setelah ada interaksi (klik/tombol) di jendela itu,
 * jadi `unlockAudio()` dipanggil dari handler tombol/klik.
 */
let ctx: AudioContext | null = null;

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

export function unlockAudio(): void {
  void ac()?.resume();
}

function tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const c = ac();
  if (!c || c.state !== "running") return;
  const t = c.currentTime + start;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(start: number, dur: number, vol: number, from: number, to: number) {
  const c = ac();
  if (!c || c.state !== "running") return;
  const t = c.currentTime + start;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = buf;
  f.type = "bandpass";
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

/** Klik halus (digit terkunci, reel lewat). */
export const sfxTick = (strong = false) => tone(strong ? 1320 : 1760, 0, strong ? 0.25 : 0.06, strong ? 0.12 : 0.04, "triangle");

/** Hembusan naik untuk opener. */
export const sfxSwell = () => {
  noise(0, 1.6, 0.08, 300, 3000);
  [392, 523.25, 659.25].forEach((f, i) => tone(f, 1.1 + i * 0.02, 1.8, 0.05));
};

/** Ketegangan saat undian dimulai. */
export const sfxRise = (dur: number) => noise(0, dur, 0.05, 200, 2400);

/** Fanfare pemenang: arpeggio lonceng + kilau. */
export const sfxFanfare = (grand = false) => {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    tone(f, i * 0.09, 1.4, 0.09, "triangle");
    tone(f * 2, i * 0.09, 0.8, 0.03);
  });
  [1046.5, 1318.5, 1568].forEach((f) => tone(f, 0.42, 2.2, 0.06));
  noise(0.35, 1.2, grand ? 0.07 : 0.04, 4000, 9000);
};
