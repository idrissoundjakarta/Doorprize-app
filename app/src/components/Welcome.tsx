"use client";

import { Logo } from "./ui";

/** Halaman awal saat belum ada acara tersimpan di perangkat ini. */
export function Welcome({ onStart }: { onStart: (kind: "baru" | "contoh") => void }) {
  return (
    <main className="welcome">
      <Logo />
      <div style={{ textAlign: "center", maxWidth: 560 }}>
        <div className="h1" style={{ fontSize: 34 }}>Mau bikin doorprize?</div>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>Siapkan peserta, sesi, dan hadiah, lalu jalankan undian seperti show di layar LED. Cukup tekan lanjut.</div>
      </div>
      <div className="welcome-cards">
        <button className="welcome-card primary" onClick={() => onStart("baru")}>
          <span className="welcome-ico" style={{ background: "var(--champ)" }}>＋</span>
          <b>Buat acara baru</b>
          <span>Mulai dari kosong. Dipandu langkah demi langkah.</span>
          <span className="go-ico" style={{ marginTop: "auto" }}>→</span>
        </button>
        <button className="welcome-card" onClick={() => onStart("contoh")}>
          <span className="welcome-ico" style={{ background: "var(--rose)" }}>▶</span>
          <b>Coba dengan data contoh</b>
          <span>500 kupon, 3 sesi, 10 hadiah. Langsung lihat show-nya.</span>
          <span className="go-ico" style={{ marginTop: "auto", background: "var(--g)" }}>→</span>
        </button>
      </div>
      <div className="muted small" style={{ textAlign: "center" }}>Data tersimpan di perangkat & browser ini saja. Tidak perlu akun.</div>
    </main>
  );
}
