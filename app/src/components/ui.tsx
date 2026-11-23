"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Logo aplikasi (warna identitas: champagne + rose). */
export function Logo() {
  return (
    <div className="logo">
      <div className="mark">
        ★<i />
      </div>
      Doorprize
    </div>
  );
}

export function Dialog({ tone = "dng", icon = "✕", title, children, confirm, onConfirm, onCancel }: { tone?: "dng" | "go"; icon?: string; title: string; children: ReactNode; confirm: string; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCancel]);
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-ico" style={{ background: `var(--${tone}-bg)`, color: `var(--${tone}-t)` }}>{icon}</div>
        <div className="h2" style={{ fontSize: 24, marginTop: 18 }}>{title}</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.6, fontSize: 15 }}>{children}</div>
        <div className="row" style={{ marginTop: 24, gap: 12 }}>
          <button className="btn b-sec grow" onClick={onCancel}>Batal</button>
          <button className={`btn grow ${tone === "dng" ? "b-dng-solid" : "b-pri"}`} onClick={onConfirm} autoFocus>{confirm}</button>
        </div>
      </div>
    </div>
  );
}

/** Notifikasi singkat di pojok kanan bawah. */
export function useToast(): [ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2400);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    <div className="toast" key={msg.id}>
      <span className="go-ico" style={{ width: 26, height: 26, fontSize: 13 }}>✓</span>
      {msg.text}
    </div>
  ) : null;
  return [node, (text: string) => setMsg({ text, id: Date.now() })];
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className="row" onClick={() => onChange(!on)} aria-pressed={on} style={{ gap: 12 }}>
      <span className={`toggle ${on ? "on" : ""}`} />
      <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
    </button>
  );
}
