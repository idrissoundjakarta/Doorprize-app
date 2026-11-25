"use client";

import { useEffect, useState } from "react";

export type OfflineStatus = "dev" | "unsupported" | "installing" | "ready" | "error";

/**
 * Mendaftarkan service worker (sw.js) supaya aplikasi bisa dibuka & dijalankan tanpa internet,
 * dan melaporkan statusnya. `update` = ada versi baru yang akan dipakai setelah aplikasi dimuat ulang.
 */
export function useOffline(): { status: OfflineStatus; update: boolean } {
  const [status, setStatus] = useState<OfflineStatus>("installing");
  const [update, setUpdate] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mode pengembangan tidak memakai offline
      setStatus("dev");
      return;
    }
    if (!("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker
      .register(new URL("sw.js", document.baseURI.replace(/show\/?$/, "")).toString())
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          w?.addEventListener("statechange", () => {
            // Versi baru selesai disimpan saat versi lama sedang dipakai → beri tahu, jangan paksa muat ulang.
            if (w.state === "activated" && hadController) setUpdate(true);
          });
        });
        return navigator.serviceWorker.ready;
      })
      .then(() => setStatus("ready"))
      .catch(() => setStatus("error"));
  }, []);
  return { status, update };
}
