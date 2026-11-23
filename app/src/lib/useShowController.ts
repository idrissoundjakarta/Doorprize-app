"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { autoDuration, reduce, resumeAfterReload } from "@/engine/engine";
import { sampleShow } from "@/engine/sample";
import type { Action, ShowState } from "@/engine/types";
import { openChannel, type Command, type Message } from "./channel";
import { loadShow, requestPersistence, saveShow } from "./storage";

export const HANGUS_WINDOW_MS = 3000;

/**
 * Dipakai di jendela operator. Memegang engine & data, menyimpan otomatis,
 * menjalankan timer adegan auto, dan menyiarkan state ke jendela show.
 */
export function useShowController() {
  const [state, setState] = useState<ShowState | null>(null);
  const [hangusArmed, setHangusArmed] = useState(false);
  const [showAliveAt, setShowAliveAt] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const stateRef = useRef<ShowState | null>(null);
  const armedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channel = useRef<ReturnType<typeof openChannel> | null>(null);
  const commandRef = useRef<(c: Command) => void>(() => {});

  // Muat data tersimpan (atau data contoh) saat dibuka.
  useEffect(() => {
    void loadShow().then((saved) => setState(saved ? resumeAfterReload(saved, Date.now()) : sampleShow()));
    void requestPersistence();
  }, []);

  // Simpan otomatis setiap ada perubahan.
  useEffect(() => {
    stateRef.current = state;
    if (state) void saveShow(state).then((ok) => setSaveFailed(!ok));
  }, [state]);

  const dispatch = useCallback((a: Action) => setState((s) => (s ? reduce(s, a) : s)), []);

  const disarm = useCallback(() => {
    if (armedTimer.current) clearTimeout(armedTimer.current);
    armedTimer.current = null;
    setHangusArmed(false);
  }, []);

  const command = useCallback(
    (cmd: Command) => {
      const now = Date.now();
      switch (cmd) {
        case "next":
          disarm();
          dispatch({ type: "NEXT", now });
          break;
        case "back":
          disarm();
          dispatch({ type: "BACK", now });
          break;
        case "blank":
          dispatch({ type: "TOGGLE_BLANK" });
          break;
        case "hangus":
          if (stateRef.current?.scene.kind !== "reveal") return;
          if (armedTimer.current) {
            disarm();
            dispatch({ type: "HANGUS", now });
          } else {
            setHangusArmed(true);
            armedTimer.current = setTimeout(disarm, HANGUS_WINDOW_MS);
          }
          break;
      }
    },
    [dispatch, disarm],
  );

  useEffect(() => {
    commandRef.current = command;
  }, [command]);

  // Timer adegan auto (opener, undi). Dihitung dari waktu mulai adegan,
  // jadi tetap benar walaupun jendela di-refresh di tengah jalan.
  const seq = state?.sceneSeq;
  const sceneAt = state?.sceneAt;
  const duration = state ? autoDuration(state) : null;
  useEffect(() => {
    if (seq === undefined || sceneAt === undefined || duration === null) return;
    const left = Math.max(0, duration - (Date.now() - sceneAt));
    const id = setTimeout(() => dispatch({ type: "AUTO_DONE", seq, now: Date.now() }), left);
    return () => clearTimeout(id);
  }, [seq, sceneAt, duration, dispatch]);

  // Komunikasi dengan jendela show.
  useEffect(() => {
    const ch = openChannel((m: Message) => {
      if (m.t === "hello" && stateRef.current) ch.send({ t: "state", state: stateRef.current, hangusArmed: false });
      if (m.t === "alive" || m.t === "hello") setShowAliveAt(Date.now());
      if (m.t === "cmd") commandRef.current(m.cmd);
    });
    channel.current = ch;
    return () => ch.close();
  }, []);

  useEffect(() => {
    if (state) channel.current?.send({ t: "state", state, hangusArmed });
  }, [state, hangusArmed]);

  // "Terhubung" kalau ada detak dari jendela show dalam 3 detik terakhir.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const showConnected = now - showAliveAt < 3000;

  /** Hangus langsung (setelah konfirmasi dialog di jendela operator). */
  const hangusNow = useCallback(() => {
    disarm();
    dispatch({ type: "HANGUS", now: Date.now() });
  }, [disarm, dispatch]);

  return { state, setState, dispatch, command, hangusNow, hangusArmed, showConnected, saveFailed };
}
