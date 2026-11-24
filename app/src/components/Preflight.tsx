"use client";

import type { Check } from "@/engine/preflight";

const ICON = { error: "✕", warn: "!", info: "i" } as const;
const CLS = { error: "c-dng", warn: "c-warn", info: "c-info" } as const;

/** Daftar cek sebelum show. Klik satu baris untuk langsung ke langkah setup yang perlu diperbaiki. */
export function PreflightList({ checks, onGo, compact = false }: { checks: Check[]; onGo?: (step: NonNullable<Check["step"]>) => void; compact?: boolean }) {
  const shown = compact ? checks.filter((c) => c.level !== "info") : checks;
  if (shown.length === 0) return <span className="chip c-go">✓ Semua siap untuk show</span>;
  return (
    <div className="col" style={{ gap: 6 }}>
      {shown.map((c, i) => (
        <button key={i} className="pf-row" onClick={() => c.step && onGo?.(c.step)} disabled={!onGo || !c.step}>
          <span className={`chip ${CLS[c.level]}`} style={{ padding: "4px 9px" }}>{ICON[c.level]}</span>
          <span className="grow" style={{ textAlign: "left" }}>{c.text}</span>
          {onGo && c.step && <span className="muted small">{compact ? "→" : "Perbaiki →"}</span>}
        </button>
      ))}
    </div>
  );
}
