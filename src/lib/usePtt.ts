import { useCallback, useEffect, useRef, useState } from "react";
import type { EventType } from "./data";
import { useInterval } from "./hooks";

/* короткий радиосигнал */
export function beep(freq: number) {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.045, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.1);
    window.setTimeout(() => ctx.close().catch(() => undefined), 250);
  } catch {
    /* аудио недоступно — тихо игнорируем */
  }
}

export interface PttApi {
  tx: boolean;
  txSec: number;
  muted: boolean;
  deafened: boolean;
  startTx: () => void;
  stopTx: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
}

/* единая тангента: используется панелью Mumble и полноэкранным видеоокном */
export function usePtt(
  online: boolean,
  onEvent: (t: EventType, s: string) => void,
): PttApi {
  const [tx, setTx] = useState(false);
  const [txSec, setTxSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const txRef = useRef(false);
  const txSecRef = useRef(0);
  const onlineRef = useRef(online);
  const mutedRef = useRef(muted);
  const deafenedRef = useRef(deafened);
  onlineRef.current = online;
  mutedRef.current = muted;
  deafenedRef.current = deafened;

  const stopTx = useCallback(() => {
    if (!txRef.current) return;
    txRef.current = false;
    setTx(false);
    beep(622);
    onEvent("audio", `Тангента: передача завершена (${txSecRef.current} с)`);
  }, [onEvent]);

  const startTx = useCallback(() => {
    if (txRef.current || !onlineRef.current) return;
    if (mutedRef.current || deafenedRef.current) {
      onEvent("audio", "Передача отклонена: микрофон выключен");
      return;
    }
    txRef.current = true;
    txSecRef.current = 0;
    setTx(true);
    setTxSec(0);
    beep(988);
    onEvent("audio", "Тангента: начата передача в «Допросную №2»");
  }, [onEvent]);

  /* секундомер передачи */
  useInterval(() => {
    if (txRef.current) {
      txSecRef.current += 1;
      setTxSec(txSecRef.current);
    }
  }, 1000);

  /* SPACE работает глобально — в т.ч. при открытом видеоокне */
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable))
        return;
      e.preventDefault();
      startTx();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") stopTx();
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, [startTx, stopTx]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (!m && txRef.current) stopTx();
      return !m;
    });
  }, [stopTx]);

  const toggleDeafen = useCallback(() => {
    setDeafened((d) => {
      if (!d && txRef.current) stopTx();
      return !d;
    });
  }, [stopTx]);

  return { tx, txSec, muted, deafened, startTx, stopTx, toggleMute, toggleDeafen };
}
